const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const distDir = path.resolve(__dirname, '..', 'dist', 'frontend');
const compressibleExt = new Set(['.js', '.css', '.html', '.svg', '.json', '.txt', '.xml']);

if (!fs.existsSync(distDir)) {
  console.error(`Build output not found: ${distDir}`);
  process.exit(1);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    compressFile(fullPath);
  }
}

function compressFile(filePath) {
  if (filePath.endsWith('.gz') || filePath.endsWith('.br')) return;

  const ext = path.extname(filePath).toLowerCase();
  if (!compressibleExt.has(ext)) return;

  const input = fs.readFileSync(filePath);
  if (!input.length) return;

  const gzip = zlib.gzipSync(input, { level: 9 });
  fs.writeFileSync(`${filePath}.gz`, gzip);

  const brotli = zlib.brotliCompressSync(input, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11
    }
  });
  fs.writeFileSync(`${filePath}.br`, brotli);
}

walk(distDir);
console.log(`Compressed assets generated in ${distDir}`);
