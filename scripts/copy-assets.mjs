import { mkdir, copyFile, cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const sourceHtml = path.join(root, "src", "renderer", "index.html");
const sourceCss = path.join(root, "src", "renderer", "styles.css");
const sourceImportmap = path.join(root, "src", "renderer", "importmap.json");
const destDir = path.join(root, "dist", "renderer");
const destHtml = path.join(destDir, "index.html");
const destCss = path.join(destDir, "styles.css");
const destImportmap = path.join(destDir, "importmap.json");
const sourceAssets = path.join(root, "assets");
const destAssets = path.join(root, "dist", "renderer", "assets");

await mkdir(destDir, { recursive: true });
await copyFile(sourceHtml, destHtml);
await copyFile(sourceCss, destCss);
await copyFile(sourceImportmap, destImportmap);
await cp(sourceAssets, destAssets, { recursive: true, force: true });
