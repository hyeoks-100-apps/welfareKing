import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function getRepoRoot() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, '../..');
}

export async function loadAllPostsJson() {
  const repoRoot = getRepoRoot();
  const postsDir = path.join(repoRoot, 'data', 'posts');
  const files = (await fsp.readdir(postsDir)).filter((name) => name.endsWith('.json'));

  const rows = [];
  for (const file of files) {
    const filePath = path.join(postsDir, file);
    try {
      const raw = await fsp.readFile(filePath, 'utf-8');
      const post = JSON.parse(raw);
      rows.push({ filePath, post });
    } catch (error) {
      console.error(`[loadAllPostsJson] Failed to read/parse: ${filePath}`);
      console.error(error);
      throw error;
    }
  }

  return rows;
}

export function normalizeUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    if (!['http:', 'https:'].includes(url.protocol)) return null;

    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    url.hash = '';

    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/, '');
      if (!url.pathname) url.pathname = '/';
    }

    const dropKeys = new Set([
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'gclid',
      'fbclid',
      'igshid',
    ]);

    const nextParams = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      if (!dropKeys.has(key)) nextParams.append(key, value);
    }

    const query = nextParams.toString();
    url.search = query ? `?${query}` : '';

    return url.toString();
  } catch {
    return null;
  }
}

export function extractLinksFromMarkdown(md) {
  const text = String(md || '');
  const urls = [];
  const images = [];

  const imgRe = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const linkRe = /\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

  for (const m of text.matchAll(imgRe)) {
    const target = m[1];
    if (target.startsWith('/')) images.push(target);
    else if (/^https?:\/\//i.test(target)) urls.push(target);
  }

  for (const m of text.matchAll(linkRe)) {
    const target = m[1];
    if (target.startsWith('mailto:') || target.startsWith('tel:')) continue;
    if (/^https?:\/\//i.test(target)) urls.push(target);
    else if (target.startsWith('/')) images.push(target);
  }

  return { urls, images };
}

export function publicPathExists(publicPath) {
  if (!publicPath || !publicPath.startsWith('/')) return false;
  const repoRoot = getRepoRoot();
  const fullPath = path.join(repoRoot, 'public', publicPath.replace(/^\//, ''));
  return fs.existsSync(fullPath);
}
