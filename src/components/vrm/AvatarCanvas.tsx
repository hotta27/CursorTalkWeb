"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader, type GLTFParser } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm";

export function AvatarCanvas() {
  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  if (modelReady === false) {
    return (
      <div className="vrm-wrapper vrm-fallback">
        <p>VRMモデルが見つかりません。</p>
        <p>`public/avatar.vrm` を配置してページを再読み込みしてください。</p>
      </div>
    );
  }

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
    const clock = new THREE.Clock();

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
        camera.position.set(0, size.y * 0.55, distance * 1.2);
        camera.far = distance * 8;
        camera.updateProjectionMatrix();
        controls.target.set(0, size.y * 0.5, 0);
        controls.update();
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
      vrm?.update(delta);
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [modelReady]);

  return (
    <div className="vrm-wrapper">
      <div className="vrm-overlay">ドラッグ: 回転 / 右ドラッグ: パン / ホイール: ズーム</div>
      <div ref={containerRef} className="vrm-canvas-host" />
    </div>
  );
}
