import fsp from 'node:fs/promises';
import path from 'node:path';
import { getRepoRoot, loadAllPostsJson } from './lib.mjs';

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const readFlagValue = (flag) => {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return '';
  return args[idx + 1];
};

let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  sharp = null;
}

if (!sharp) {
  console.log('[og] sharp 없음: OG 생성 스킵');
  process.exit(0);
}

const all = hasFlag('--all') || !readFlagValue('--slug');
const slug = readFlagValue('--slug');
const force = hasFlag('--force');
const writeJson = hasFlag('--write-json');

const repoRoot = getRepoRoot();
const outDir = path.join(repoRoot, 'public', 'og', 'posts');
await fsp.mkdir(outDir, { recursive: true });

const rows = await loadAllPostsJson();
const targets = all ? rows : rows.filter(({ post }) => post.slug === slug);

const lineWrap = (text, max = 20, maxLines = 3) => {
  const chars = [...String(text || '')];
  const lines = [];
  for (let i = 0; i < chars.length; i += max) {
    lines.push(chars.slice(i, i + max).join(''));
    if (lines.length >= maxLines) break;
  }
  return lines;
};

const esc = (s) =>
  String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

for (const { filePath, post } of targets) {
  try {
    const outFile = path.join(outDir, `${post.slug}.png`);
    if (!force) {
      try {
        await fsp.access(outFile);
        console.log(`[og] skip exists: ${post.slug}`);
        continue;
      } catch {
        // create
      }
    }

    const titleLines = lineWrap(post.title, 18, 3);
    const benefitText = post.benefit?.amountText ? `지원: ${post.benefit.amountText}` : '';
    const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="52" y="52" width="1096" height="526" rx="24" fill="rgba(255,255,255,0.08)"/>
  <text x="90" y="130" fill="#bae6fd" font-size="34" font-weight="700">복지정보.com</text>
  <text x="90" y="180" fill="#e2e8f0" font-size="24">${esc(post.category)} · ${esc(post.publishedAt)}</text>
  ${titleLines
    .map((line, idx) => `<text x="90" y="${260 + idx * 68}" fill="#ffffff" font-size="56" font-weight="800">${esc(line)}</text>`)
    .join('')}
  ${benefitText ? `<text x="90" y="530" fill="#bbf7d0" font-size="30" font-weight="600">${esc(benefitText)}</text>` : ''}
</svg>`;

    await sharp(Buffer.from(svg)).png().toFile(outFile);
    console.log(`[og] generated: ${post.slug}`);

    if (writeJson) {
      post.ogImage = `/og/posts/${post.slug}.png`;
      await fsp.writeFile(filePath, `${JSON.stringify(post, null, 2)}\n`, 'utf-8');
      console.log(`[og] updated json: ${post.slug}`);
    }
  } catch (error) {
    console.error(`[og] failed ${post.slug}:`, error);
  }
}

process.exit(0);
