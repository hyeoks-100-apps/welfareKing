import { extractLinksFromMarkdown, loadAllPostsJson, normalizeUrl } from './lib.mjs';

const args = new Set(process.argv.slice(2));
const treat403AsWarning = args.has('--treat-403-as-warning') || !args.has('--treat-403-as-error');

const rows = await loadAllPostsJson();
const collected = [];

for (const { post } of rows) {
  const slug = String(post.slug || '');
  const sourceLinks = Array.isArray(post.sourceLinks) ? post.sourceLinks : [];
  for (const link of sourceLinks) {
    if (/^https?:\/\//i.test(link?.url || '')) {
      collected.push({ slug, url: String(link.url), source: 'sourceLinks' });
    }
  }

  const { urls } = extractLinksFromMarkdown(post.contentMd || '');
  for (const url of urls) {
    collected.push({ slug, url, source: 'contentMd' });
  }
}

const unique = [];
const seen = new Set();
for (const item of collected) {
  const normalized = normalizeUrl(item.url);
  if (!normalized) continue;
  const key = `${item.slug}|${normalized}|${item.source}`;
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push({ ...item, normalized });
}

async function checkOne(item) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  const request = async (method) => {
    const res = await fetch(item.normalized, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'welfareking-link-checker/1.0' },
    });
    return res;
  };

  try {
    let res;
    try {
      res = await request('HEAD');
      if ([403, 405].includes(res.status)) {
        res = await request('GET');
      }
    } catch {
      res = await request('GET');
    }

    const ms = Date.now() - started;
    clearTimeout(timer);
    return { ...item, ok: res.status >= 200 && res.status < 400, status: res.status, ms };
  } catch (error) {
    clearTimeout(timer);
    return { ...item, ok: false, error: String(error), ms: Date.now() - started };
  }
}

async function runPool(items, concurrency = 5) {
  const results = [];
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const idx = cursor;
      cursor += 1;
      results[idx] = await checkOne(items[idx]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

const results = await runPool(unique, 5);

const broken = [];
const warnings = [];
for (const r of results) {
  if (r.ms >= 3000) {
    warnings.push(`SLOW_LINK: ${r.slug} ${r.normalized} (${r.ms}ms)`);
  }

  if (r.ok) continue;

  if (r.status === 403 && treat403AsWarning) {
    warnings.push(`FORBIDDEN_LINK(403): ${r.slug} ${r.normalized}`);
    continue;
  }

  if (r.status) {
    broken.push(`BROKEN_LINK: ${r.slug} ${r.normalized} status=${r.status}`);
  } else {
    broken.push(`BROKEN_LINK: ${r.slug} ${r.normalized} error=${r.error}`);
  }
}

console.log(`\n[check-links] targets=${unique.length} broken=${broken.length} warnings=${warnings.length}`);
if (broken.length) {
  console.log('\n[ERRORS]');
  broken.forEach((line) => console.log(`- ${line}`));
}
if (warnings.length) {
  console.log('\n[WARNINGS]');
  warnings.forEach((line) => console.log(`- ${line}`));
}

if (broken.length > 0) process.exit(1);
