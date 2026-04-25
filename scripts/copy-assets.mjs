import { mkdir, copyFile, cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const sourceHtml = path.join(root, "src", "renderer", "index.html");
const destDir = path.join(root, "dist", "renderer");
const destHtml = path.join(destDir, "index.html");
const sourceAssets = path.join(root, "assets");
const destAssets = path.join(root, "dist", "renderer", "assets");

await mkdir(destDir, { recursive: true });
await copyFile(sourceHtml, destHtml);
await cp(sourceAssets, destAssets, { recursive: true, force: true });
