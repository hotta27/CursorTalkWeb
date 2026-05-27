"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader, type GLTFParser } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm";
import type { CharacterState } from "@/lib/types";
import { SwitchBotControls } from "@/components/switchbot/SwitchBotControls";
import {
  loadStoredCameraView,
  saveStoredCameraView,
  storedViewToVectors,
  vectorsToStoredView,
} from "@/lib/cameraViewStorage";

interface AvatarCanvasProps {
  characterState?: CharacterState;
}

type PlayableEntry =
  | { kind: "clip"; name: string; action: THREE.AnimationAction }
  | { kind: "expression"; name: string };

function getExpressionNames(vrm: VRM): string[] {
  const manager = vrm.expressionManager;
  if (!manager) {
    return [];
  }
  const names: string[] = [];
  manager.expressions.forEach((expression) => {
    names.push(expression.expressionName);
  });
  return names;
}

function applyExpression(vrm: VRM, name: string, weight = 1): void {
  const manager = vrm.expressionManager;
  if (!manager) {
    return;
  }
  for (const expression of manager.expressions.values()) {
    const id = expression.expressionName;
    manager.setValue(id, id === name ? weight : 0);
  }
}

function resetExpressions(vrm: VRM): void {
  const manager = vrm.expressionManager;
  if (!manager) {
    return;
  }
  for (const expression of manager.expressions.values()) {
    const id = expression.expressionName;
    manager.setValue(id, id === "neutral" ? 1 : 0);
  }
}

interface SceneApi {
  resetView: () => void;
  saveView: () => void;
  playClip: (name: string, loop?: boolean) => void;
  playClipByHints: (hints: string[]) => void;
  stopAll: () => void;
}

function pickPlayableByHints(playables: PlayableEntry[], hints: string[]): PlayableEntry | null {
  const lowerHints = hints.map((h) => h.toLowerCase());
  for (const hint of lowerHints) {
    const found = playables.find((c) => c.name.toLowerCase().includes(hint));
    if (found) {
      return found;
    }
  }
  return playables[0] ?? null;
}

export function AvatarCanvas({ characterState = "idle" }: AvatarCanvasProps) {
  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const [showModelControls, setShowModelControls] = useState(false);
  const [showSwitchBotControls, setShowSwitchBotControls] = useState(false);
  const [clipNames, setClipNames] = useState<string[]>([]);
  const [playableKind, setPlayableKind] = useState<"clip" | "expression" | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsPanelRef = useRef<HTMLDivElement | null>(null);
  const [controlsPanelHovered, setControlsPanelHovered] = useState(false);
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
    const playables: PlayableEntry[] = [];
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
      if (mixer) {
        for (const entry of playables) {
          if (entry.kind === "clip") {
            entry.action.stop();
          }
        }
        mixer.stopAllAction();
      }
      if (vrm) {
        resetExpressions(vrm);
      }
    };

    const playClip = (name: string, loop = false) => {
      const entry = playables.find((c) => c.name === name);
      if (!entry) {
        return;
      }
      if (entry.kind === "expression") {
        if (vrm) {
          applyExpression(vrm, entry.name);
        }
        return;
      }
      if (!mixer) {
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
      const entry = pickPlayableByHints(playables, hints);
      if (!entry) {
        return;
      }
      if (entry.kind === "expression") {
        if (vrm) {
          applyExpression(vrm, entry.name);
        }
        return;
      }
      if (!mixer) {
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

        if (process.env.NODE_ENV === "development") {
          console.info(
            "[AvatarCanvas] gltf.animations:",
            gltf.animations.length,
            gltf.animations.map((a) => a.name),
          );
        }

        if (gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(vrm.scene);
          for (let i = 0; i < gltf.animations.length; i++) {
            const clip = gltf.animations[i];
            const name = clip.name || `animation_${i}`;
            const action = mixer.clipAction(clip);
            playables.push({ kind: "clip", name, action });
          }
          setPlayableKind("clip");

          const idleEntry = pickPlayableByHints(playables, ["idle"]);
          if (idleEntry?.kind === "clip") {
            idleEntry.action.reset().fadeIn(0.2).setLoop(THREE.LoopRepeat, Infinity).play();
          }
        } else {
          const expressionNames = getExpressionNames(vrm);
          if (process.env.NODE_ENV === "development") {
            console.info(
              "[AvatarCanvas] No skeletal clips in .vrm; expressions:",
              expressionNames.length,
              expressionNames,
            );
          }
          for (const name of expressionNames) {
            playables.push({ kind: "expression", name });
          }
          setPlayableKind(expressionNames.length > 0 ? "expression" : null);
          resetExpressions(vrm);
        }

        setClipNames(playables.map((c) => c.name));
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
      setPlayableKind(null);
    };
  }, [modelReady]);

  useEffect(() => {
    const api = sceneApiRef.current;
    if (!api) {
      return;
    }

    if (characterState === "notify") {
      api.playClipByHints(["notify", "start", "fun", "joy"]);
      prevCharacterStateRef.current = characterState;
    } else if (characterState === "talk") {
      api.playClipByHints(["talk", "end", "fun"]);
      prevCharacterStateRef.current = characterState;
    } else if (characterState === "idle" && prevCharacterStateRef.current !== "idle") {
      api.stopAll();
      const idle = clipNames.find((n) => n.toLowerCase().includes("idle"));
      const neutral = clipNames.find((n) => n.toLowerCase() === "neutral");
      if (idle) {
        api.playClip(idle, true);
      } else if (neutral) {
        api.playClip(neutral);
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

  const handleControlsPanelWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!controlsPanelHovered) {
        return;
      }
      const panel = controlsPanelRef.current;
      if (!panel || panel.scrollHeight <= panel.clientHeight) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      panel.scrollTop += event.deltaY;
    },
    [controlsPanelHovered],
  );

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
          onClick={() => setShowModelControls((v) => !v)}
          aria-expanded={showModelControls}
          aria-label="3D model 操作パネルを表示"
        >
          <span>3D model</span>
          <span>{showModelControls ? "▼" : "▶"}</span>
        </button>
        {showModelControls ? (
          <div
            ref={controlsPanelRef}
            className={`avatar-controls-panel${controlsPanelHovered ? " is-hovered" : ""}`}
            onMouseEnter={() => setControlsPanelHovered(true)}
            onMouseLeave={() => setControlsPanelHovered(false)}
            onWheel={handleControlsPanelWheel}
          >
            <button type="button" className="avatar-control-btn" onClick={handleSaveView}>
              位置保存
            </button>
            <button type="button" className="avatar-control-btn" onClick={handleReset}>
              位置リセット
            </button>
            {clipNames.length === 0 ? (
              <span className="avatar-controls-empty">
                骨格アニメなし（.vrma は未対応）
              </span>
            ) : (
              <>
                {playableKind === "expression" ? (
                  <span className="avatar-controls-empty avatar-controls-hint">表情（VRM内蔵）</span>
                ) : null}
                {clipNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="avatar-control-btn"
                  onClick={() => handlePlayClip(name)}
                >
                  {name}
                </button>
              ))}
              </>
            )}
          </div>
        ) : null}
        <button
          type="button"
          className="avatar-controls-toggle"
          onClick={() => setShowSwitchBotControls((v) => !v)}
          aria-expanded={showSwitchBotControls}
          aria-label="swich bot 操作パネルを表示"
        >
          <span>swich bot</span>
          <span>{showSwitchBotControls ? "▼" : "▶"}</span>
        </button>
        {showSwitchBotControls ? (
          <div className="avatar-controls-panel avatar-controls-panel-wide">
            <SwitchBotControls />
          </div>
        ) : null}
      </div>
      <div ref={containerRef} className="vrm-canvas-host" />
    </div>
  );
}
