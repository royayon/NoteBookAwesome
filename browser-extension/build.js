const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

async function build() {
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Copy CSS file to dist
  const cssSrc = path.join(__dirname, 'src', 'ui', 'styles.css');
  const cssDst = path.join(distDir, 'styles.css');
  if (fs.existsSync(cssSrc)) {
    fs.copyFileSync(cssSrc, cssDst);
  }

  const buildOptions = {
    entryPoints: [
      path.join(__dirname, 'src', 'contentScript.ts'),
      path.join(__dirname, 'src', 'background.ts'),
      path.join(__dirname, 'src', 'popup.ts')
    ],
    bundle: true,
    outdir: distDir,
    platform: 'browser',
    target: 'es2020',
    sourcemap: !isWatch,
    minify: !isWatch,
    logLevel: 'info'
  };

  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes in browser-extension...');
  } else {
    await esbuild.build(buildOptions);
    console.log('Build completed successfully for browser-extension.');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
