/**
 * Inspect animation data in public/avatar.vrm
 * Run: node scripts/inspect-vrm-animations.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin } from "@pixiv/three-vrm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vrmPath = path.join(__dirname, "..", "public", "avatar.vrm");

if (!fs.existsSync(vrmPath)) {
  console.error("public/avatar.vrm not found");
  process.exit(1);
}

// Parse raw GLB JSON chunk for extensions (without full three load)
const buf = fs.readFileSync(vrmPath);
const jsonChunkLength = buf.readUInt32LE(12);
const jsonChunkType = buf.readUInt32LE(16);
if (jsonChunkType !== 0x4e4f534a) {
  console.log("Not standard GLB JSON chunk, skipping raw parse");
} else {
  const jsonStr = buf.slice(20, 20 + jsonChunkLength).toString("utf8");
  const gltf = JSON.parse(jsonStr);
  console.log("=== Raw GLTF JSON ===");
  console.log("animations[] count:", gltf.animations?.length ?? 0);
  if (gltf.animations?.length) {
    for (const anim of gltf.animations) {
      console.log("  -", anim.name ?? "(unnamed)", "channels:", anim.channels?.length ?? 0);
    }
  }
  const extUsed = gltf.extensionsUsed ?? [];
  const extRequired = gltf.extensionsRequired ?? [];
  console.log("extensionsUsed:", extUsed.join(", ") || "(none)");
  console.log("extensionsRequired:", extRequired.join(", ") || "(none)");
  if (gltf.extensions?.VRM) {
    console.log("VRM0 extension present");
  }
  if (gltf.extensions?.VRMC_vrm) {
    console.log("VRMC_vrm (VRM1) extension present");
  }
  for (const key of Object.keys(gltf.extensions ?? {})) {
    if (key.toLowerCase().includes("anim")) {
      console.log("extension key:", key);
    }
  }
}

console.log("\n=== GLTFLoader + VRMLoaderPlugin ===");
const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));
loader.load(
  `file://${vrmPath.replace(/\\/g, "/")}`,
  (gltf) => {
    console.log("gltf.animations.length:", gltf.animations.length);
    gltf.animations.forEach((clip, i) => {
      console.log(`  [${i}] name="${clip.name}" duration=${clip.duration.toFixed(2)}s tracks=${clip.tracks.length}`);
    });
    const vrm = gltf.userData.vrm;
    console.log("userData.vrm:", vrm ? "present" : "missing");
    if (vrm) {
      console.log("vrm keys:", Object.keys(vrm).filter((k) => !k.startsWith("_")).join(", "));
    }
    console.log("userData keys:", Object.keys(gltf.userData).join(", "));
    for (const [k, v] of Object.entries(gltf.userData)) {
      if (k !== "vrm" && k.toLowerCase().includes("anim")) {
        console.log(`userData.${k}:`, v);
      }
    }
    process.exit(0);
  },
  undefined,
  (err) => {
    console.error("Load failed:", err);
    process.exit(1);
  },
);
