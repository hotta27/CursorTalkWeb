export const CAMERA_VIEW_STORAGE_KEY = "notification-ai:camera-view";

export interface StoredCameraView {
  version: 1;
  camera: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

function isFiniteVec3(v: { x: number; y: number; z: number }): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
}

export function loadStoredCameraView(): StoredCameraView | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(CAMERA_VIEW_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredCameraView;
    if (parsed.version !== 1) {
      return null;
    }
    if (!isFiniteVec3(parsed.camera) || !isFiniteVec3(parsed.target)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredCameraView(view: StoredCameraView): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(CAMERA_VIEW_STORAGE_KEY, JSON.stringify(view));
  } catch {
    // quota exceeded etc.
  }
}

export function storedViewToVectors(view: StoredCameraView): {
  camera: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
} {
  return {
    camera: { x: view.camera.x, y: view.camera.y, z: view.camera.z },
    target: { x: view.target.x, y: view.target.y, z: view.target.z },
  };
}

export function vectorsToStoredView(
  camera: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number },
): StoredCameraView {
  return {
    version: 1,
    camera: { x: camera.x, y: camera.y, z: camera.z },
    target: { x: target.x, y: target.y, z: target.z },
  };
}
