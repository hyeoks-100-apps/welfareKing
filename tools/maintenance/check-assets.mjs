import fsp from 'node:fs/promises';
import path from 'node:path';
import { extractLinksFromMarkdown, getRepoRoot, loadAllPostsJson, publicPathExists } from './lib.mjs';

const repoRoot = getRepoRoot();
const missing = [];
const unused = [];
const rows = await loadAllPostsJson();

for (const { post } of rows) {
  const slug = String(post.slug || '');
  const referenced = new Set();

  if (typeof post.thumbnail === 'string' && post.thumbnail.startsWith('/images/')) {
    referenced.add(post.thumbnail);
  }

  const { images } = extractLinksFromMarkdown(post.contentMd || '');
  for (const img of images) {
    if (img.startsWith('/images/')) referenced.add(img);
  }

  for (const imgPath of referenced) {
    if (!publicPathExists(imgPath)) {
      missing.push(`MISSING_ASSET: ${slug} -> ${imgPath}`);
    }
  }

  const slugDir = path.join(repoRoot, 'public', 'images', 'posts', slug);
  let files = [];
  try {
    files = await fsp.readdir(slugDir);
  } catch {
    files = [];
  }

  for (const file of files) {
    const webPath = `/images/posts/${slug}/${file}`;
    if (!referenced.has(webPath)) {
      unused.push(`UNUSED_ASSET: ${slug} -> ${webPath}`);
    }
  }
}

console.log(`\n[check-assets] posts=${rows.length} missing=${missing.length} unused=${unused.length}`);
if (missing.length) {
  console.log('\n[ERRORS]');
  missing.forEach((line) => console.log(`- ${line}`));
}
if (unused.length) {
  console.log('\n[WARNINGS]');
  unused.forEach((line) => console.log(`- ${line}`));
}

if (missing.length > 0) process.exit(1);
