import express from 'express';
import multer from 'multer';
import { marked } from 'marked';
import simpleGit from 'simple-git';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const dataDir = path.join(repoRoot, 'data', 'posts');
const publicDir = path.join(repoRoot, 'public');
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

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
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
  const name = path
    .basename(input || 'file', ext)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'file';

  const safeExt = ext.replace(/[^.a-z0-9]/g, '') || '.bin';
  return { name, ext: safeExt };
}

async function readPostFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = PostSchema.parse(JSON.parse(raw));
  return parsed;
}

async function listPostFilePaths() {
  await fs.mkdir(dataDir, { recursive: true });
  const files = await fs.readdir(dataDir);
  return files.filter((f) => f.endsWith('.json')).map((f) => path.join(dataDir, f));
}

function isRasterMime(mime) {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/tiff'].includes(mime);
}

app.use(express.json({ limit: '5mb' }));
app.use(express.static(uiDir));
app.use(express.static(publicDir));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/posts', async (_req, res) => {
  try {
    const filePaths = await listPostFilePaths();
    const posts = await Promise.all(filePaths.map((fp) => readPostFile(fp)));
    const items = posts
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
    const slug = sanitizeSlug(req.params.slug);
    const filePath = path.join(dataDir, `${slug}.json`);
    const post = await readPostFile(filePath);
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
      updatedAt: todayISODate(),
    };

    const parsed = PostSchema.safeParse(payload);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    }

    await fs.mkdir(dataDir, { recursive: true });
    const filePath = path.join(dataDir, `${slug}.json`);
    await fs.writeFile(filePath, `${JSON.stringify(parsed.data, null, 2)}\n`, 'utf-8');

    res.json({ ok: true, slug });
  } catch (error) {
    console.error('[admin] /api/posts POST error', error);
    res.status(500).json({ ok: false, error: String(error) });
  }
});

app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    const slug = sanitizeSlug(req.body.slug);
    const kind = String(req.body.kind || 'content');
    const dir = path.join(publicDir, 'images', 'posts', slug);
    await fs.mkdir(dir, { recursive: true });

    const files = [];

    for (const file of req.files || []) {
      const { name, ext } = sanitizeFileName(file.originalname);
      const isSvg = ext === '.svg' || file.mimetype === 'image/svg+xml';
      const canOptimize = sharp && !isSvg && isRasterMime(file.mimetype);

      let outputBuffer = file.buffer;
      let outputExt = ext;

      if (canOptimize) {
        outputBuffer = await sharp(file.buffer).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
        outputExt = '.webp';
      }

      const fixedName = kind === 'thumbnail' ? `cover${outputExt}` : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${name}${outputExt}`;
      const absPath = path.join(dir, fixedName);
      await fs.writeFile(absPath, outputBuffer);
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

app.post('/api/git/commit-push', async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) {
    return res.status(400).json({ ok: false, error: 'commit message is required' });
  }

  try {
    await git.add(['-A']);
    const statusAfterAdd = await git.status();
    if (statusAfterAdd.isClean()) {
      return res.json({ ok: true, pushed: false, message: 'no changes' });
    }

    await git.commit(message);
    await git.push();

    res.json({ ok: true, pushed: true });
  } catch (error) {
    console.error('[admin] /api/git/commit-push error', error);
    res.status(500).json({ ok: false, error: String(error) });
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(uiDir, 'index.html'));
});

app.listen(ADMIN_PORT, ADMIN_HOST, () => {
  console.log(`[admin] running at http://${ADMIN_HOST}:${ADMIN_PORT}`);
  console.log(`[admin] repo root: ${repoRoot}`);
  console.log(`[admin] sharp optimization: ${sharp ? 'enabled' : 'disabled'}`);
});
