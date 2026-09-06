import sharp from "sharp";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = resolve(__dirname, "..");
const src = resolve(root, "public/avimo-icon.png");
const outDir = resolve(root, "public");

const sizes = [
  { name: "pwa-64x64.png", size: 64 },
  { name: "pwa-192x192.png", size: 192 },
  { name: "pwa-512x512.png", size: 512 },
];

async function main() {
  for (const { name, size } of sizes) {
    await sharp(src)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(resolve(outDir, name));
    console.log(`✓ ${name} (${size}x${size})`);
  }

  // Maskable: add padding so the icon safe zone is respected
  const maskableSize = 512;
  const padding = Math.round(maskableSize * 0.1);
  const inner = maskableSize - padding * 2;

  await sharp(src)
    .resize(inner, inner, { fit: "contain", background: "#E8A800" })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: "#E8A800",
    })
    .png()
    .toFile(resolve(outDir, "pwa-maskable-512x512.png"));
  console.log("✓ pwa-maskable-512x512.png (512x512 maskable)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
