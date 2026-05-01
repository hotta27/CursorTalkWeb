"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader, type GLTFParser } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm";
import type { CharacterState } from "@/lib/types";

interface VrmAvatarProps {
  modelPath: string;
  state: CharacterState;
}

export function VrmAvatar({ modelPath, state }: VrmAvatarProps) {
  const [until, setUntil] = useState(0);
  const [currentState, setCurrentState] = useState<CharacterState>("idle");
  const vrmRef = useRef<VRM | null>(null);

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
    vrm.scene.rotation.y = Math.PI;
    vrmRef.current = vrm;
  }, [gltf]);

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
