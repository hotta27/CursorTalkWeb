"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader, type GLTFParser } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm";
import * as THREE from "three";
import type { CharacterState } from "@/lib/types";

interface VrmAvatarProps {
  modelPath: string;
  state: CharacterState;
  onFitted?: () => void;
}

export function VrmAvatar({ modelPath, state, onFitted }: VrmAvatarProps) {
  const [until, setUntil] = useState(0);
  const [currentState, setCurrentState] = useState<CharacterState>("idle");
  const vrmRef = useRef<VRM | null>(null);
  const { camera } = useThree();

  const gltf = useLoader(
    GLTFLoader,
    modelPath,
    useMemo(
      () => (loader: GLTFLoader) => loader.register((parser: GLTFParser) => new VRMLoaderPlugin(parser)),
      [],
    ),
  );

  useEffect(() => {
    const vrm = gltf.userData.vrm as VRM | undefined;
    if (!vrm) {
      return;
    }

    vrm.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(vrm.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // 各VRMで異なる原点ズレを吸収して、表示を中央寄せする
    vrm.scene.position.x -= center.x;
    vrm.scene.position.z -= center.z;
    vrm.scene.position.y -= box.min.y;

    vrm.scene.rotation.y = Math.PI;
    vrm.scene.updateMatrixWorld(true);

    if (camera instanceof THREE.PerspectiveCamera) {
      const maxSize = Math.max(size.x, size.y, size.z, 1);
      const fovRad = (camera.fov * Math.PI) / 180;
      const fitDistance = (maxSize * 0.8) / Math.tan(fovRad / 2);
      camera.position.set(0, size.y * 0.55, fitDistance * 1.2);
      camera.near = 0.01;
      camera.far = fitDistance * 8;
      camera.lookAt(0, size.y * 0.45, 0);
      camera.updateProjectionMatrix();
    }

    vrmRef.current = vrm;
    onFitted?.();
  }, [camera, gltf, onFitted]);

  useEffect(() => {
    setCurrentState(state);
    setUntil(Date.now() + 4_000);
  }, [state]);

  useFrame((_, delta) => {
    const vrm = vrmRef.current;
    if (!vrm) {
      return;
    }

    const elapsed = performance.now() / 1000;
    vrm.update(delta);
    const body = vrm.humanoid?.getNormalizedBoneNode("spine");
    if (body) {
      body.rotation.y = Math.sin(elapsed * 0.8) * 0.05;
    }

    const activeState = Date.now() > until ? "idle" : currentState;
    const expression = vrm.expressionManager;
    if (expression) {
      expression.setValue("blink", Math.abs(Math.sin(elapsed * 4)) > 0.95 ? 1 : 0);
      expression.setValue("aa", activeState === "talk" ? 0.6 : 0.0);
      expression.setValue("happy", activeState === "notify" ? 0.8 : 0.1);
    }
  });

  return <primitive object={gltf.scene} />;
}
