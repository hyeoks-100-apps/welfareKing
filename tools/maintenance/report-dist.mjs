import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const strict = process.argv.includes('--strict');

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif']);

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
};

const walk = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(absPath));
      continue;
    }

    const stat = fs.statSync(absPath);
    files.push({
      path: absPath,
      relativePath: path.relative(DIST_DIR, absPath),
      ext: path.extname(entry.name).toLowerCase(),
      size: stat.size,
    });
  }

  return files;
};

if (!fs.existsSync(DIST_DIR)) {
  console.log('[dist-report] dist 폴더가 없습니다. 먼저 빌드(예: npm run build)를 실행하세요.');
  process.exit(0);
}

const files = walk(DIST_DIR);
const totalSize = files.reduce((sum, file) => sum + file.size, 0);
const htmlSize = files.filter((f) => f.ext === '.html').reduce((sum, file) => sum + file.size, 0);
const cssSize = files.filter((f) => f.ext === '.css').reduce((sum, file) => sum + file.size, 0);
const jsSize = files.filter((f) => f.ext === '.js').reduce((sum, file) => sum + file.size, 0);
const imageCount = files.filter((f) => IMAGE_EXT.has(f.ext)).length;

const sortedBySize = [...files].sort((a, b) => b.size - a.size);

console.log('=== dist report ===');
console.log(`파일 수: ${files.length}`);
console.log(`전체 용량: ${formatBytes(totalSize)} (${totalSize.toLocaleString()} bytes)`);
console.log(`HTML 총합: ${formatBytes(htmlSize)}`);
console.log(`CSS 총합: ${formatBytes(cssSize)}`);
console.log(`JS 총합: ${formatBytes(jsSize)}`);
console.log(`이미지 파일 수: ${imageCount}`);

console.log('\n상위 20개 큰 파일:');
for (const file of sortedBySize.slice(0, 20)) {
  console.log(`- ${file.relativePath} (${formatBytes(file.size)})`);
}

const warnings = [];
if (totalSize > 25 * 1024 * 1024) {
  warnings.push(`dist 총합이 25MB를 초과했습니다: ${formatBytes(totalSize)}`);
}

const largestFile = sortedBySize[0];
if (largestFile && largestFile.size > 3 * 1024 * 1024) {
  warnings.push(`단일 파일이 3MB를 초과했습니다: ${largestFile.relativePath} (${formatBytes(largestFile.size)})`);
}

if (warnings.length) {
  console.log('\nWARNINGS:');
  for (const warning of warnings) {
    console.log(`- WARN: ${warning}`);
  }

  if (strict) {
    process.exit(1);
  }
}
