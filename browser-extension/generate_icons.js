const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const svgPath = path.join(__dirname, '..', 'icon.svg');
const iconsDir = path.join(__dirname, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const svg = fs.readFileSync(svgPath, 'utf-8');

[16, 48, 128].forEach((size) => {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size }
  });
  const image = resvg.render();
  const pngBuffer = image.asPng();
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), pngBuffer);
  console.log(`Generated icon${size}.png`);
});
