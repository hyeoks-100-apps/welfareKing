import fsp from 'node:fs/promises';
import path from 'node:path';
import { loadAllPostsJson, getRepoRoot } from './lib.mjs';

const args = process.argv.slice(2);

const readFlagValue = (flag, fallback) => {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return fallback;
  return args[idx + 1];
};

const hasFlag = (flag) => args.includes(flag);

const olderThanDays = Number(readFlagValue('--older-than-days', '365'));
const apply = hasFlag('--apply');
const dryRun = hasFlag('--dry-run') || !apply;
const deleteImages = hasFlag('--delete-images');

const repoRoot = getRepoRoot();
const archiveDir = path.join(repoRoot, 'data', 'archive');
const postsDir = path.join(repoRoot, 'data', 'posts');
const imagesBase = path.join(repoRoot, 'public', 'images', 'posts');

const getKstTodayYmd = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

const today = getKstTodayYmd();
const toDayNum = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || '');
  if (!m) return Number.NaN;
  const [, y, mo, d] = m;
  return Math.floor(Date.UTC(Number(y), Number(mo) - 1, Number(d)) / 86400000);
};

const rows = await loadAllPostsJson();
const todayNum = toDayNum(today);

const targets = rows.filter(({ post }) => {
  const end = post?.applicationPeriod?.end;
  if (!end) return false;
  const endNum = toDayNum(end);
  if (Number.isNaN(endNum)) return false;
  return todayNum - endNum >= olderThanDays;
});

console.log(`[archive] today=${today} olderThanDays=${olderThanDays} targets=${targets.length} dryRun=${dryRun}`);
for (const { post } of targets) {
  console.log(`- ${post.slug} (end=${post.applicationPeriod?.end})`);
}

if (dryRun) {
  console.log('[archive] Dry-run mode. No files moved. Use --apply to perform changes.');
  process.exit(0);
}

try {
  await fsp.mkdir(archiveDir, { recursive: true });

  for (const { post } of targets) {
    const slug = post.slug;
    const from = path.join(postsDir, `${slug}.json`);
    const to = path.join(archiveDir, `${slug}.json`);
    await fsp.rename(from, to);

    if (deleteImages) {
      const imgDir = path.join(imagesBase, slug);
      await fsp.rm(imgDir, { recursive: true, force: true });
    }
  }

  console.log('[archive] Done. Archived posts moved successfully.');
} catch (error) {
  console.error('[archive] Failed:', error);
  process.exit(1);
}
