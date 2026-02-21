import { loadAllPostsJson, normalizeUrl } from './lib.mjs';

const errors = [];
const warnings = [];
const sourceUrlMap = new Map();

const minLen = {
  title: 6,
  summary: 10,
  contentMd: 30,
};

const rows = await loadAllPostsJson();

for (const { filePath, post } of rows) {
  const slug = post.slug || '(unknown)';

  for (const key of ['title', 'summary', 'thumbnail', 'publishedAt', 'category', 'contentMd']) {
    const value = String(post[key] ?? '').trim();
    if (!value) {
      errors.push(`MISSING_REQUIRED: ${slug} -> ${key} is empty (${filePath})`);
    }
  }

  if (typeof post.thumbnail === 'string' && post.thumbnail && !post.thumbnail.startsWith('/images/')) {
    warnings.push(`THUMBNAIL_RULE: ${slug} -> thumbnail should start with /images/: ${post.thumbnail}`);
  }

  for (const key of ['title', 'summary', 'contentMd']) {
    const text = String(post[key] ?? '');
    if (text && text.length < minLen[key]) {
      warnings.push(`TOO_SHORT: ${slug} -> ${key} length ${text.length} < ${minLen[key]}`);
    }
  }

  const sourceLinks = Array.isArray(post.sourceLinks) ? post.sourceLinks : [];
  for (const link of sourceLinks) {
    const rawUrl = String(link?.url || '').trim();
    if (!/^https?:\/\//i.test(rawUrl)) {
      errors.push(`INVALID_SOURCE_URL_SCHEME: ${slug} -> ${rawUrl || '(empty)'}`);
      continue;
    }

    const normalized = normalizeUrl(rawUrl);
    if (!normalized) {
      errors.push(`INVALID_SOURCE_URL: ${slug} -> ${rawUrl}`);
      continue;
    }

    const list = sourceUrlMap.get(normalized) ?? [];
    list.push(slug);
    sourceUrlMap.set(normalized, list);
  }
}

const dupWarnings = [];
for (const [url, slugs] of sourceUrlMap.entries()) {
  const unique = [...new Set(slugs)];
  if (unique.length > 1) {
    dupWarnings.push(`DUP_SOURCE: ${url} -> [${unique.join(', ')}]`);
  }
}
warnings.push(...dupWarnings);

console.log(`\n[check-content] posts=${rows.length} errors=${errors.length} warnings=${warnings.length}`);

if (errors.length) {
  console.log('\n[ERRORS]');
  for (const line of errors) console.log(`- ${line}`);
}

if (warnings.length) {
  console.log('\n[WARNINGS]');
  for (const line of warnings) console.log(`- ${line}`);
}

if (errors.length > 0) process.exit(1);
