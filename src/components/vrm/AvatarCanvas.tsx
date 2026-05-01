"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import type { CharacterState } from "@/lib/types";
import { VrmAvatar } from "@/components/vrm/VrmAvatar";

interface AvatarCanvasProps {
  state: CharacterState;
}

export function AvatarCanvas({ state }: AvatarCanvasProps) {
  const [modelReady, setModelReady] = useState<boolean | null>(null);

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

  return (
    <div className="vrm-wrapper">
      <Canvas camera={{ fov: 35, near: 0.1, far: 100, position: [0, 1.35, 2.2] }}>
        <directionalLight intensity={1.2} position={[1, 2, 3]} />
        <ambientLight intensity={0.5} />
        {modelReady ? <VrmAvatar modelPath="/avatar.vrm" state={state} /> : null}
      </Canvas>
    </div>
  );
}
