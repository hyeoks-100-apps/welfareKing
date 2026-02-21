import express from 'express';
import multer from 'multer';
import { marked } from 'marked';
import simpleGit from 'simple-git';
import { z } from 'zod';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { normalizeUrl } from '../maintenance/lib.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const dataDir = path.join(repoRoot, 'data', 'posts');
const archiveDir = path.join(repoRoot, 'data', 'archive');
const redirectsPath = path.join(repoRoot, 'data', 'redirects.json');
const publicDir = path.join(repoRoot, 'public');
const postsImageDir = path.join(publicDir, 'images', 'posts');
const uiDir = path.join(__dirname, 'ui');
const git = simpleGit(repoRoot);

const ADMIN_PORT = Number(process.env.ADMIN_PORT || 4173);
const ADMIN_HOST = '127.0.0.1';

let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  sharp = null;
}

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isHttpUrl = (value) => /^https?:\/\//.test(value);

const PostSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  category: z.enum(['youth', 'midlife', 'government', 'smallbiz', 'living-economy']),
  tags: z.array(z.string()),
  thumbnail: z.string().startsWith('/'),
  ogImage: z.string().startsWith('/').optional(),
  publishedAt: z.string().regex(DATE_RE),
  updatedAt: z.string().regex(DATE_RE).optional(),
  status: z.enum(['draft', 'published']),
  contentMd: z.string().min(1),
  regions: z.array(z.string()).default(['ALL']),
  applicationPeriod: z
    .object({
      start: z.string().regex(DATE_RE).optional(),
      end: z.string().regex(DATE_RE).optional(),
      note: z.string().optional(),
    })
    .default({}),
  benefit: z
    .object({
      type: z.enum(['CASH', 'VOUCHER', 'LOAN', 'TAX', 'SERVICE', 'ETC']).optional(),
      amountText: z.string().optional(),
      paymentCycle: z.enum(['ONCE', 'MONTHLY', 'YEARLY', 'ETC']).optional(),
    })
    .default({}),
  eligibility: z.array(z.string()).default([]),
  howToApply: z.array(z.string()).default([]),
  documents: z.array(z.string()).default([]),
  sourceLinks: z
    .array(
      z.object({
        title: z.string().min(1),
        url: z.string().refine(isHttpUrl, 'sourceLinks.url must start with http:// or https://'),
      })
    )
    .default([]),
  contact: z.string().default(''),
  organization: z.string().default(''),
});

function getKstTodayYmd(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function ymdToDayNumber(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
  if (!m) return Number.NaN;
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000);
}

function sanitizeSlug(input) {
  const base = String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (base.length >= 3) return base;
  return `post-${Date.now().toString(36).slice(-6)}`;
}

function sanitizeFileName(input) {
  const ext = path.extname(input || '').toLowerCase();
  const name =
    path
      .basename(input || 'file', ext)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'file';

  const safeExt = ext.replace(/[^.a-z0-9]/g, '') || '.bin';
  return { name, ext: safeExt };
}

async function ensureRedirectsFile() {
  await fsp.mkdir(path.dirname(redirectsPath), { recursive: true });
  if (!fs.existsSync(redirectsPath)) {
    await fsp.writeFile(redirectsPath, '{}\n', 'utf-8');
  }
}

async function readRedirectsMap() {
  await ensureRedirectsFile();
  const raw = await fsp.readFile(redirectsPath, 'utf-8');
  const parsed = JSON.parse(raw || '{}');
  return parsed && typeof parsed === 'object' ? parsed : {};
}

async function writeRedirectsMap(map) {
  await ensureRedirectsFile();
  await fsp.writeFile(redirectsPath, `${JSON.stringify(map, null, 2)}\n`, 'utf-8');
}

async function readPostFile(filePath) {
  const raw = await fsp.readFile(filePath, 'utf-8');
  return PostSchema.parse(JSON.parse(raw));
}

async function loadPostBySlug(slug) {
  const safe = sanitizeSlug(slug);
  const filePath = path.join(dataDir, `${safe}.json`);
  const post = await readPostFile(filePath);
  return { filePath, post };
}

async function listPostFilePaths() {
  await fsp.mkdir(dataDir, { recursive: true });
  const files = await fsp.readdir(dataDir);
  return files.filter((f) => f.endsWith('.json')).map((f) => path.join(dataDir, f));
}

async function listAllPosts() {
  const paths = await listPostFilePaths();
  return Promise.all(paths.map(async (fp) => ({ filePath: fp, post: await readPostFile(fp) })));
}

function isRasterMime(mime) {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/tiff'].includes(mime);
}

function runNodeScript(scriptRelPath, args = []) {
  return new Promise((resolve) => {
    const child = spawn('node', [scriptRelPath, ...args], { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';

    child.stdout.on('data', (buf) => {
      out += buf.toString();
    });
    child.stderr.on('data', (buf) => {
      err += buf.toString();
    });

    child.on('close', (code) => {
      resolve({ code: code ?? 1, out, err });
    });
  });
}

function uniqStrings(values) {
  return [...new Set(values.map((v) => String(v || '').trim()).filter(Boolean))];
}

function mergeArrayField(a = [], b = []) {
  return uniqStrings([...a, ...b]);
}

function mergeRegions(a = [], b = []) {
  const merged = uniqStrings([...a, ...b]);
  return merged.includes('ALL') ? ['ALL'] : merged;
}

function mergeSourceLinks(canonical = [], duplicate = []) {
  const out = [];
  const seen = new Set();

  for (const item of canonical) {
    const n = normalizeUrl(item?.url || '');
    const key = n || `raw:${String(item?.url || '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title: String(item?.title || '').trim(), url: String(item?.url || '').trim() });
  }

  for (const item of duplicate) {
    const title = String(item?.title || '').trim();
    const url = String(item?.url || '').trim();
    const n = normalizeUrl(url);
    const key = n || `raw:${url}`;
    if (!title || !url || seen.has(key)) continue;
    seen.add(key);
    out.push({ title, url });
  }

  return out;
}

function pickCanonicalValue(current, incoming) {
  return current ? current : incoming || undefined;
}

const QA_SCRIPT_MAP = {
  content: 'tools/maintenance/check-content.mjs',
  assets: 'tools/maintenance/check-assets.mjs',
  links: 'tools/maintenance/check-links.mjs',
};

app.use(express.json({ limit: '8mb' }));
app.use(express.static(uiDir));
app.use(express.static(publicDir));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/posts', async (_req, res) => {
  try {
    const rows = await listAllPosts();
    const items = rows
      .map(({ post }) => post)
      .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))
      .map((post) => ({
        slug: post.slug,
        title: post.title,
        category: post.category,
        status: post.status,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
      }));

    res.json({ ok: true, items });
  } catch (error) {
    console.error('[admin] /api/posts error', error);
    res.status(500).json({ ok: false, error: String(error) });
  }
});

app.get('/api/posts/:slug', async (req, res) => {
  try {
    const { post } = await loadPostBySlug(req.params.slug);
    res.json({ ok: true, post });
  } catch {
    res.status(404).json({ ok: false, error: 'post not found' });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const body = req.body || {};
    const slug = sanitizeSlug(body.slug);

    const payload = {
      ...body,
      id: slug,
      slug,
      tags: Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim()).filter(Boolean) : [],
      regions:
        Array.isArray(body.regions) && body.regions.length > 0
          ? body.regions.map((r) => String(r).trim()).filter(Boolean)
          : ['ALL'],
      eligibility: Array.isArray(body.eligibility)
        ? body.eligibility.map((v) => String(v).trim()).filter(Boolean)
        : [],
      howToApply: Array.isArray(body.howToApply)
        ? body.howToApply.map((v) => String(v).trim()).filter(Boolean)
        : [],
      documents: Array.isArray(body.documents)
        ? body.documents.map((v) => String(v).trim()).filter(Boolean)
        : [],
      sourceLinks: Array.isArray(body.sourceLinks)
        ? body.sourceLinks
            .map((item) => ({ title: String(item?.title || '').trim(), url: String(item?.url || '').trim() }))
            .filter((item) => item.title && item.url)
        : [],
      applicationPeriod: body.applicationPeriod || {},
      benefit: body.benefit || {},
      contact: String(body.contact || ''),
      organization: String(body.organization || ''),
      ogImage: typeof body.ogImage === 'string' && body.ogImage.startsWith('/') ? body.ogImage : undefined,
      updatedAt: getKstTodayYmd(),
    };

    const parsed = PostSchema.safeParse(payload);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    }

    await fsp.mkdir(dataDir, { recursive: true });
    const filePath = path.join(dataDir, `${slug}.json`);
    await fsp.writeFile(filePath, `${JSON.stringify(parsed.data, null, 2)}\n`, 'utf-8');

    const warnings = [];
    const all = await listAllPosts();
    const sourceUsages = new Map();
    for (const { post } of all) {
      if (post.slug === slug) continue;
      for (const link of post.sourceLinks || []) {
        const normalized = normalizeUrl(link.url);
        if (!normalized) continue;
        if (!sourceUsages.has(normalized)) sourceUsages.set(normalized, new Set());
        sourceUsages.get(normalized).add(post.slug);
      }
    }

    for (const link of parsed.data.sourceLinks || []) {
      const normalized = normalizeUrl(link.url);
      if (!normalized) continue;
      const usedBy = sourceUsages.get(normalized);
      if (usedBy?.size) {
        warnings.push(`DUP_SOURCE: ${normalized} already used by ${[...usedBy].join(', ')}`);
      }
    }

    res.json({ ok: true, slug, warnings });
  } catch (error) {
    console.error('[admin] /api/posts POST error', error);
    res.status(500).json({ ok: false, error: String(error) });
  }
});

app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    const slug = sanitizeSlug(req.body.slug);
    const kind = String(req.body.kind || 'content');
    const dir = path.join(postsImageDir, slug);
    await fsp.mkdir(dir, { recursive: true });

    const files = [];

    for (const file of req.files || []) {
      const { name, ext } = sanitizeFileName(file.originalname);
      const isSvg = ext === '.svg' || file.mimetype === 'image/svg+xml';
      const canOptimize = sharp && !isSvg && isRasterMime(file.mimetype);

      let outputBuffer = file.buffer;
      let outputExt = ext;

      if (canOptimize) {
        outputBuffer = await sharp(file.buffer)
          .resize({ width: 1400, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        outputExt = '.webp';
      }

      const fixedName =
        kind === 'thumbnail'
          ? `cover${outputExt}`
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${name}${outputExt}`;
      const absPath = path.join(dir, fixedName);
      await fsp.writeFile(absPath, outputBuffer);
      files.push(`/images/posts/${slug}/${fixedName}`);
    }

    res.json({ ok: true, files });
  } catch (error) {
    console.error('[admin] /api/upload error', error);
    res.status(500).json({ ok: false, error: String(error) });
  }
});

app.post('/api/preview', (req, res) => {
  try {
    const markdown = String(req.body?.markdown || '');
    const html = marked.parse(markdown);
    res.json({ ok: true, html });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

app.get('/api/suggestions', async (_req, res) => {
  try {
    const rows = await listAllPosts();
    const tags = new Map();
    const regions = new Map();
    const domains = new Map();

    for (const { post } of rows) {
      for (const tag of post.tags || []) tags.set(tag, (tags.get(tag) ?? 0) + 1);
      for (const region of post.regions || []) regions.set(region, (regions.get(region) ?? 0) + 1);
      for (const link of post.sourceLinks || []) {
        const n = normalizeUrl(link.url);
        if (!n) continue;
        const domain = new URL(n).hostname;
        domains.set(domain, (domains.get(domain) ?? 0) + 1);
      }
    }

    const toSorted = (map, limit, keyName) =>
      [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([key, count]) => ({ [keyName]: key, count }));

    res.json({
      ok: true,
      tags: toSorted(tags, 50, 'tag'),
      regions: toSorted(regions, 30, 'code'),
      sourceDomains: toSorted(domains, 30, 'domain'),
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

app.get('/api/duplicates', async (_req, res) => {
  try {
    const rows = await listAllPosts();
    const groups = new Map();

    for (const { post } of rows) {
      for (const link of post.sourceLinks || []) {
        const normalized = normalizeUrl(link.url);
        if (!normalized) continue;
        if (!groups.has(normalized)) groups.set(normalized, new Map());
        groups.get(normalized).set(post.slug, {
          slug: post.slug,
          title: post.title,
          status: post.status,
          publishedAt: post.publishedAt,
          updatedAt: post.updatedAt,
          category: post.category,
        });
      }
    }

    const out = [...groups.entries()]
      .map(([url, bySlug]) => ({ url, items: [...bySlug.values()] }))
      .filter((g) => g.items.length >= 2)
      .sort((a, b) => b.items.length - a.items.length);

    res.json({ ok: true, groups: out });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

app.post('/api/duplicates/resolve', async (req, res) => {
  try {
    const canonicalSlug = sanitizeSlug(req.body?.canonicalSlug);
    const duplicateSlug = sanitizeSlug(req.body?.duplicateSlug);
    const mode = req.body?.mode === 'archive-only' ? 'archive-only' : 'merge-and-archive';
    const createRedirect = req.body?.createRedirect !== false;
    const deleteImages = Boolean(req.body?.deleteImages);

    if (!canonicalSlug || !duplicateSlug || canonicalSlug === duplicateSlug) {
      return res.status(400).json({ ok: false, error: 'canonicalSlug and duplicateSlug must be different' });
    }

    const canonicalRow = await loadPostBySlug(canonicalSlug).catch(() => null);
    const duplicateRow = await loadPostBySlug(duplicateSlug).catch(() => null);
    if (!canonicalRow || !duplicateRow) {
      return res.status(404).json({ ok: false, error: 'canonical or duplicate post not found' });
    }

    if (mode === 'merge-and-archive') {
      const canonical = canonicalRow.post;
      const duplicate = duplicateRow.post;
      const merged = {
        ...canonical,
        id: canonicalSlug,
        slug: canonicalSlug,
        tags: mergeArrayField(canonical.tags, duplicate.tags),
        sourceLinks: mergeSourceLinks(canonical.sourceLinks, duplicate.sourceLinks),
        regions: mergeRegions(canonical.regions, duplicate.regions),
        eligibility: mergeArrayField(canonical.eligibility, duplicate.eligibility),
        howToApply: mergeArrayField(canonical.howToApply, duplicate.howToApply),
        documents: mergeArrayField(canonical.documents, duplicate.documents),
        applicationPeriod: {
          start: pickCanonicalValue(canonical.applicationPeriod?.start, duplicate.applicationPeriod?.start),
          end: pickCanonicalValue(canonical.applicationPeriod?.end, duplicate.applicationPeriod?.end),
          note: pickCanonicalValue(canonical.applicationPeriod?.note, duplicate.applicationPeriod?.note),
        },
        benefit: {
          type: pickCanonicalValue(canonical.benefit?.type, duplicate.benefit?.type),
          amountText: pickCanonicalValue(canonical.benefit?.amountText, duplicate.benefit?.amountText),
          paymentCycle: pickCanonicalValue(canonical.benefit?.paymentCycle, duplicate.benefit?.paymentCycle),
        },
        organization: pickCanonicalValue(canonical.organization, duplicate.organization) || '',
        contact: pickCanonicalValue(canonical.contact, duplicate.contact) || '',
        contentMd:
          String(canonical.contentMd || '').length < 80 && String(duplicate.contentMd || '').length > String(canonical.contentMd || '').length
            ? duplicate.contentMd
            : canonical.contentMd,
        updatedAt: getKstTodayYmd(),
      };

      const parsed = PostSchema.parse(merged);
      await fsp.writeFile(path.join(dataDir, `${canonicalSlug}.json`), `${JSON.stringify(parsed, null, 2)}\n`, 'utf-8');
    }

    await fsp.mkdir(archiveDir, { recursive: true });
    await fsp.rename(path.join(dataDir, `${duplicateSlug}.json`), path.join(archiveDir, `${duplicateSlug}.json`));

    if (deleteImages) {
      await fsp.rm(path.join(postsImageDir, duplicateSlug), { recursive: true, force: true });
    }

    if (createRedirect) {
      const redirects = await readRedirectsMap();
      if (redirects[canonicalSlug] === duplicateSlug) delete redirects[canonicalSlug];
      redirects[duplicateSlug] = canonicalSlug;
      await writeRedirectsMap(redirects);
    }

    res.json({
      ok: true,
      canonicalSlug,
      duplicateSlug,
      redirectedTo: createRedirect ? canonicalSlug : undefined,
    });
  } catch (error) {
    console.error('[admin] /api/duplicates/resolve error', error);
    res.status(500).json({ ok: false, error: String(error) });
  }
});

app.get('/api/review-queue', async (req, res) => {
  try {
    const staleDays = Number(req.query.staleDays ?? 120);
    const expiredDays = Number(req.query.expiredDays ?? 0);
    const todayYmd = getKstTodayYmd();
    const todayNum = ymdToDayNumber(todayYmd);

    const rows = await listAllPosts();
    const items = rows
      .map(({ post }) => {
        const reasons = [];
        if (!post.sourceLinks?.length) reasons.push('NO_SOURCE');

        const basis = post.updatedAt || post.publishedAt;
        const basisNum = ymdToDayNumber(basis);
        if (!Number.isNaN(basisNum) && todayNum - basisNum >= staleDays) reasons.push('STALE_UPDATE');

        const end = post.applicationPeriod?.end;
        const endNum = ymdToDayNumber(end || '');
        if (!Number.isNaN(endNum) && todayNum - endNum >= expiredDays) reasons.push('EXPIRED');

        if (!post.thumbnail || !post.thumbnail.startsWith('/images/')) reasons.push('MISSING_THUMB');

        return {
          slug: post.slug,
          title: post.title,
          status: post.status,
          category: post.category,
          publishedAt: post.publishedAt,
          updatedAt: post.updatedAt,
          end,
          reasons,
        };
      })
      .filter((item) => item.reasons.length > 0)
      .sort((a, b) => {
        if (b.reasons.length !== a.reasons.length) return b.reasons.length - a.reasons.length;
        const aNum = ymdToDayNumber(a.updatedAt || a.publishedAt || '9999-12-31');
        const bNum = ymdToDayNumber(b.updatedAt || b.publishedAt || '9999-12-31');
        return aNum - bNum;
      });

    res.json({ ok: true, items });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

app.post('/api/posts/archive-one', async (req, res) => {
  try {
    const slug = sanitizeSlug(req.body?.slug);
    const createRedirectTo = req.body?.createRedirectTo ? sanitizeSlug(req.body.createRedirectTo) : '';
    const deleteImages = Boolean(req.body?.deleteImages);
    if (!slug) return res.status(400).json({ ok: false, error: 'slug is required' });

    await fsp.mkdir(archiveDir, { recursive: true });
    await fsp.rename(path.join(dataDir, `${slug}.json`), path.join(archiveDir, `${slug}.json`));

    if (deleteImages) {
      await fsp.rm(path.join(postsImageDir, slug), { recursive: true, force: true });
    }

    if (createRedirectTo) {
      const redirects = await readRedirectsMap();
      if (redirects[createRedirectTo] === slug) delete redirects[createRedirectTo];
      redirects[slug] = createRedirectTo;
      await writeRedirectsMap(redirects);
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

app.get('/api/git/status', async (_req, res) => {
  try {
    const status = await git.status();
    const changedFiles = [
      ...status.modified,
      ...status.created,
      ...status.deleted,
      ...status.not_added,
      ...status.renamed.map((item) => `${item.from} -> ${item.to}`),
    ];

    res.json({ ok: true, isClean: status.isClean(), changedFiles });
  } catch (error) {
    console.error('[admin] /api/git/status error', error);
    res.status(500).json({ ok: false, error: String(error) });
  }
});

app.post('/api/qa/run', async (req, res) => {
  const checks = Array.isArray(req.body?.checks) ? req.body.checks : [];
  const options = req.body?.options ?? {};

  const allowed = checks.filter((name) => Object.prototype.hasOwnProperty.call(QA_SCRIPT_MAP, name));
  if (allowed.length === 0) {
    return res.status(400).json({ ok: false, error: 'No valid checks specified' });
  }

  const results = [];
  for (const name of allowed) {
    const args = [];
    if (name === 'links' && options.treat403AsWarning !== false) {
      args.push('--treat-403-as-warning');
    }

    const run = await runNodeScript(QA_SCRIPT_MAP[name], args);
    results.push({ name, ...run });
  }

  res.json({ ok: true, results });
});

app.post('/api/archive/run', async (req, res) => {
  const olderThanDays = Number(req.body?.olderThanDays ?? 365);
  const apply = Boolean(req.body?.apply);
  const deleteImages = Boolean(req.body?.deleteImages);

  const args = ['--older-than-days', String(Number.isFinite(olderThanDays) ? olderThanDays : 365)];
  if (apply) args.push('--apply');
  else args.push('--dry-run');
  if (deleteImages) args.push('--delete-images');

  const run = await runNodeScript('tools/maintenance/archive.mjs', args);
  res.json({ ok: true, result: run });
});

app.post('/api/git/commit-push', async (req, res) => {
  const message = String(req.body?.message || '').trim();
  const runChecks = req.body?.runChecks !== false;
  const checks = Array.isArray(req.body?.checks) ? req.body.checks : ['content', 'assets'];

  if (!message) {
    return res.status(400).json({ ok: false, error: 'commit message is required' });
  }

  const qaResults = [];
  if (runChecks) {
    for (const name of checks) {
      if (!Object.prototype.hasOwnProperty.call(QA_SCRIPT_MAP, name)) continue;
      const run = await runNodeScript(QA_SCRIPT_MAP[name], name === 'links' ? ['--treat-403-as-warning'] : []);
      qaResults.push({ name, ...run });
      if (run.code !== 0) {
        return res.status(400).json({
          ok: false,
          error: `pre-push check failed: ${name}`,
          qaResults,
        });
      }
    }
  }

  try {
    await git.add(['-A']);
    const statusAfterAdd = await git.status();
    if (statusAfterAdd.isClean()) {
      return res.json({ ok: true, pushed: false, message: 'no changes', qaResults });
    }

    await git.commit(message);
    await git.push();

    res.json({ ok: true, pushed: true, qaResults });
  } catch (error) {
    console.error('[admin] /api/git/commit-push error', error);
    res.status(500).json({ ok: false, error: String(error), qaResults });
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(uiDir, 'index.html'));
});

app.listen(ADMIN_PORT, ADMIN_HOST, async () => {
  await ensureRedirectsFile();
  console.log(`[admin] running at http://${ADMIN_HOST}:${ADMIN_PORT}`);
  console.log(`[admin] repo root: ${repoRoot}`);
  console.log(`[admin] sharp optimization: ${sharp ? 'enabled' : 'disabled'}`);
});
