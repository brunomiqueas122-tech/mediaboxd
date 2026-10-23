const sharp = require("sharp");
const path = require("path");

const svgPath = path.join(__dirname, "..", "public", "icons", "icon.svg");
const outDir = path.join(__dirname, "..", "public", "icons");

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

(async () => {
  for (const { name, size } of sizes) {
    await sharp(svgPath).resize(size, size).png().toFile(path.join(outDir, name));
    console.log(`generated ${name}`);
  }

  // Maskable version with extra padding so Android doesn't crop the letter.
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: "#0a0a0a" },
  })
    .composite([
      { input: await sharp(svgPath).resize(360, 360).toBuffer(), gravity: "center" },
    ])
    .png()
    .toFile(path.join(outDir, "icon-maskable-512.png"));
  console.log("generated icon-maskable-512.png");
})();
