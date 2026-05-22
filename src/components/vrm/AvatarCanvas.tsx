"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader, type GLTFParser } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm";
import type { CharacterState } from "@/lib/types";
import {
  loadStoredCameraView,
  saveStoredCameraView,
  storedViewToVectors,
  vectorsToStoredView,
} from "@/lib/cameraViewStorage";

interface AvatarCanvasProps {
  characterState?: CharacterState;
}

interface ClipActionEntry {
  name: string;
  action: THREE.AnimationAction;
}

interface SceneApi {
  resetView: () => void;
  saveView: () => void;
  playClip: (name: string, loop?: boolean) => void;
  playClipByHints: (hints: string[]) => void;
  stopAll: () => void;
}

function pickClipByHints(clips: ClipActionEntry[], hints: string[]): ClipActionEntry | null {
  const lowerHints = hints.map((h) => h.toLowerCase());
  for (const hint of lowerHints) {
    const found = clips.find((c) => c.name.toLowerCase().includes(hint));
    if (found) {
      return found;
    }
  }
  return clips[0] ?? null;
}

export function AvatarCanvas({ characterState = "idle" }: AvatarCanvasProps) {
  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [clipNames, setClipNames] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneApiRef = useRef<SceneApi | null>(null);
  const prevCharacterStateRef = useRef<CharacterState>("idle");

  useEffect(() => {
    let active = true;
    void fetch("/avatar.vrm", { method: "HEAD", cache: "no-store" })
      .then((response) => {
        if (active) {
          setModelReady(response.ok);
        }
      })
      .catch(() => {
        if (active) {
          setModelReady(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!modelReady) {
      return;
    }
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0f172a");

    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    camera.position.set(0, 1.25, 2.3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = true;
    controls.target.set(0, 1.0, 0);
    controls.update();

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x0b1120, 0.8);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(1, 2, 3);
    scene.add(hemiLight, dirLight);

    let disposed = false;
    let vrm: VRM | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    const clipActions: ClipActionEntry[] = [];
    const clock = new THREE.Clock();

    let defaultCameraPosition = new THREE.Vector3();
    let defaultTarget = new THREE.Vector3();

    const applyView = (cam: THREE.Vector3, target: THREE.Vector3) => {
      camera.position.copy(cam);
      controls.target.copy(target);
      controls.update();
    };

    const applyStoredOrVectors = (
      stored: ReturnType<typeof loadStoredCameraView>,
      fallbackCam: THREE.Vector3,
      fallbackTarget: THREE.Vector3,
    ) => {
      if (stored) {
        const { camera: c, target: t } = storedViewToVectors(stored);
        applyView(new THREE.Vector3(c.x, c.y, c.z), new THREE.Vector3(t.x, t.y, t.z));
        return;
      }
      applyView(fallbackCam, fallbackTarget);
    };

    const setDefaultView = (cam: THREE.Vector3, target: THREE.Vector3) => {
      defaultCameraPosition = cam.clone();
      defaultTarget = target.clone();
    };

    const getResetView = (): { camera: THREE.Vector3; target: THREE.Vector3 } => {
      const stored = loadStoredCameraView();
      if (stored) {
        const { camera: c, target: t } = storedViewToVectors(stored);
        return {
          camera: new THREE.Vector3(c.x, c.y, c.z),
          target: new THREE.Vector3(t.x, t.y, t.z),
        };
      }
      return {
        camera: defaultCameraPosition.clone(),
        target: defaultTarget.clone(),
      };
    };

    const resetView = () => {
      const view = getResetView();
      applyView(view.camera, view.target);
    };

    const saveView = () => {
      saveStoredCameraView(
        vectorsToStoredView(
          { x: camera.position.x, y: camera.position.y, z: camera.position.z },
          { x: controls.target.x, y: controls.target.y, z: controls.target.z },
        ),
      );
    };

    const stopAll = () => {
      if (!mixer) {
        return;
      }
      for (const { action } of clipActions) {
        action.stop();
      }
      mixer.stopAllAction();
    };

    const playClip = (name: string, loop = false) => {
      const entry = clipActions.find((c) => c.name === name);
      if (!entry || !mixer) {
        return;
      }
      stopAll();
      if (loop) {
        entry.action.setLoop(THREE.LoopRepeat, Infinity);
      } else {
        entry.action.setLoop(THREE.LoopOnce, 1);
        entry.action.clampWhenFinished = true;
      }
      entry.action.reset().fadeIn(0.2).play();
    };

    const playClipByHints = (hints: string[]) => {
      const entry = pickClipByHints(clipActions, hints);
      if (!entry) {
        return;
      }
      stopAll();
      entry.action.reset().fadeIn(0.2).setLoop(THREE.LoopOnce, 1).play();
      entry.action.clampWhenFinished = true;
    };

    sceneApiRef.current = { resetView, saveView, playClip, playClipByHints, stopAll };

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) {
        return;
      }
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();

    const loader = new GLTFLoader();
    loader.register((parser: GLTFParser) => new VRMLoaderPlugin(parser));
    loader.load(
      "/avatar.vrm",
      (gltf) => {
        if (disposed) {
          return;
        }
        const loadedVrm = gltf.userData.vrm as VRM | undefined;
        if (!loadedVrm) {
          setModelReady(false);
          return;
        }
        vrm = loadedVrm;

        vrm.scene.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(vrm.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        vrm.scene.position.x -= center.x;
        vrm.scene.position.z -= center.z;
        vrm.scene.position.y -= box.min.y;
        vrm.scene.rotation.y = Math.PI;
        scene.add(vrm.scene);

        const maxSize = Math.max(size.x, size.y, size.z, 1);
        const fovRad = (camera.fov * Math.PI) / 180;
        const distance = (maxSize * 0.9) / Math.tan(fovRad / 2);
        const autoCam = new THREE.Vector3(0, size.y * 0.55, distance * 1.2);
        const autoTarget = new THREE.Vector3(0, size.y * 0.5, 0);
        camera.far = distance * 8;
        camera.updateProjectionMatrix();
        setDefaultView(autoCam, autoTarget);

        const stored = loadStoredCameraView();
        applyStoredOrVectors(stored, autoCam, autoTarget);

        mixer = new THREE.AnimationMixer(vrm.scene);
        for (let i = 0; i < gltf.animations.length; i++) {
          const clip = gltf.animations[i];
          const name = clip.name || `animation_${i}`;
          const action = mixer.clipAction(clip);
          clipActions.push({ name, action });
        }

        const names = clipActions.map((c) => c.name);
        setClipNames(names);

        const idleEntry = pickClipByHints(clipActions, ["idle"]);
        if (idleEntry) {
          idleEntry.action.reset().fadeIn(0.2).setLoop(THREE.LoopRepeat, Infinity).play();
        }
      },
      undefined,
      () => {
        if (!disposed) {
          setModelReady(false);
        }
      },
    );

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    const animate = () => {
      if (disposed) {
        return;
      }
      const delta = clock.getDelta();
      mixer?.update(delta);
      vrm?.update(delta);
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      disposed = true;
      sceneApiRef.current = null;
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      setClipNames([]);
    };
  }, [modelReady]);

  useEffect(() => {
    const api = sceneApiRef.current;
    if (!api) {
      return;
    }

    if (characterState === "notify") {
      api.playClipByHints(["notify", "start"]);
      prevCharacterStateRef.current = characterState;
    } else if (characterState === "talk") {
      api.playClipByHints(["talk", "end"]);
      prevCharacterStateRef.current = characterState;
    } else if (characterState === "idle" && prevCharacterStateRef.current !== "idle") {
      api.stopAll();
      const idle = clipNames.find((n) => n.toLowerCase().includes("idle"));
      if (idle) {
        api.playClip(idle, true);
      }
      prevCharacterStateRef.current = characterState;
    }
  }, [characterState, clipNames]);

  const handleSaveView = useCallback(() => {
    sceneApiRef.current?.saveView();
  }, []);

  const handleReset = useCallback(() => {
    sceneApiRef.current?.resetView();
  }, []);

  const handlePlayClip = useCallback((name: string) => {
    sceneApiRef.current?.playClip(name);
  }, []);

  if (modelReady === false) {
    return (
      <div className="vrm-wrapper vrm-fallback">
        <p>VRMモデルが見つかりません。</p>
        <p>`public/avatar.vrm` を配置してページを再読み込みしてください。</p>
      </div>
    );
  }

  return (
    <div className="vrm-wrapper">
      <div className="avatar-controls">
        <button
          type="button"
          className="avatar-controls-toggle"
          onClick={() => setShowControls((v) => !v)}
          aria-expanded={showControls}
          aria-label="操作パネルを表示"
        >
          {showControls ? "▼" : "▶"}
        </button>
        {showControls ? (
          <div className="avatar-controls-panel">
            <button type="button" className="avatar-control-btn" onClick={handleSaveView}>
              位置保存
            </button>
            <button type="button" className="avatar-control-btn" onClick={handleReset}>
              位置リセット
            </button>
            {clipNames.length === 0 ? (
              <span className="avatar-controls-empty">アニメーションなし</span>
            ) : (
              clipNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="avatar-control-btn"
                  onClick={() => handlePlayClip(name)}
                >
                  {name}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
      <div ref={containerRef} className="vrm-canvas-host" />
    </div>
  );
}
