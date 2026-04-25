import * as THREE from "three";
import { GLTFLoader, type GLTFParser } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm";
import type { CharacterState } from "../shared/types";

export class VrmScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();
  private vrm: VRM | null = null;
  private currentState: CharacterState = "idle";
  private stateUntil = 0;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      35,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    this.camera.position.set(0, 1.35, 2.2);

    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(1, 2, 3);
    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    window.addEventListener("resize", () => this.onResize());
    this.animate();
  }

  async load(modelPath: string): Promise<void> {
    const loader = new GLTFLoader();
    loader.register((parser: GLTFParser) => new VRMLoaderPlugin(parser));
    const gltf = await loader.loadAsync(modelPath);
    this.vrm = gltf.userData.vrm as VRM;
    this.vrm.scene.rotation.y = Math.PI;
    this.scene.add(this.vrm.scene);
  }

  setState(state: CharacterState): void {
    this.currentState = state;
    this.stateUntil = Date.now() + 4_000;
  }

  private onResize(): void {
    const { clientWidth, clientHeight } = this.container;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    if (this.vrm) {
      this.vrm.update(delta);
      const body = this.vrm.humanoid?.getNormalizedBoneNode("spine");
      if (body) {
        body.rotation.y = Math.sin(elapsed * 0.8) * 0.05;
      }

      if (Date.now() > this.stateUntil) {
        this.currentState = "idle";
      }

      const expression = this.vrm.expressionManager;
      if (expression) {
        expression.setValue("blink", Math.abs(Math.sin(elapsed * 4)) > 0.95 ? 1 : 0);
        expression.setValue("aa", this.currentState === "talk" ? 0.6 : 0.0);
        expression.setValue("happy", this.currentState === "notify" ? 0.8 : 0.1);
      }
    }

    this.renderer.render(this.scene, this.camera);
  };
}
