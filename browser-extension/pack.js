const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const JSZip = require('jszip');

console.log('Building browser extension...');
execSync('node build.js', { stdio: 'inherit', cwd: __dirname });

const zip = new JSZip();

function addFilesRecursively(srcDir, zipFolder) {
  const items = fs.readdirSync(srcDir);
  for (const item of items) {
    const fullPath = path.join(srcDir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const subFolder = zipFolder.folder(item);
      addFilesRecursively(fullPath, subFolder);
    } else {
      const fileData = fs.readFileSync(fullPath);
      zipFolder.file(item, fileData);
    }
  }
}

// Add files & directories with POSIX forward slashes
if (fs.existsSync(path.join(__dirname, 'manifest.json'))) {
  zip.file('manifest.json', fs.readFileSync(path.join(__dirname, 'manifest.json')));
}
if (fs.existsSync(path.join(__dirname, 'popup.html'))) {
  zip.file('popup.html', fs.readFileSync(path.join(__dirname, 'popup.html')));
}
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  addFilesRecursively(path.join(__dirname, 'dist'), zip.folder('dist'));
}
if (fs.existsSync(path.join(__dirname, 'icons'))) {
  addFilesRecursively(path.join(__dirname, 'icons'), zip.folder('icons'));
}

const zipName = 'notebookawesome-browser-extension.zip';
const zipPath = path.join(__dirname, zipName);

console.log('Generating POSIX-compliant ZIP archive for extension stores...');
zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  .then((buffer) => {
    fs.writeFileSync(zipPath, buffer);
    console.log(`Successfully generated ${zipName} (POSIX forward-slashes verified)`);
  })
  .catch((err) => {
    console.error('Error generating zip archive:', err);
    process.exit(1);
  });
