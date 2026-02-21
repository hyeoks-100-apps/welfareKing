const el = {
  postList: document.getElementById('post-list'),
  btnNew: document.getElementById('btn-new-post'),
  form: document.getElementById('post-form'),
  slug: document.getElementById('slug'),
  title: document.getElementById('title'),
  summary: document.getElementById('summary'),
  category: document.getElementById('category'),
  status: document.getElementById('status'),
  tags: document.getElementById('tags'),
  regions: document.getElementById('regions'),
  publishedAt: document.getElementById('publishedAt'),
  updatedAt: document.getElementById('updatedAt'),
  thumbnail: document.getElementById('thumbnail'),
  thumbnailUpload: document.getElementById('thumbnail-upload'),
  periodStart: document.getElementById('periodStart'),
  periodEnd: document.getElementById('periodEnd'),
  periodNote: document.getElementById('periodNote'),
  benefitType: document.getElementById('benefitType'),
  benefitAmountText: document.getElementById('benefitAmountText'),
  benefitPaymentCycle: document.getElementById('benefitPaymentCycle'),
  eligibility: document.getElementById('eligibility'),
  howToApply: document.getElementById('howToApply'),
  documents: document.getElementById('documents'),
  organization: document.getElementById('organization'),
  contact: document.getElementById('contact'),
  sourceTitle: document.getElementById('sourceTitle'),
  sourceUrl: document.getElementById('sourceUrl'),
  btnAddSource: document.getElementById('btn-add-source'),
  sourceList: document.getElementById('source-list'),
  btnInsertTemplate: document.getElementById('btn-insert-template'),
  contentMd: document.getElementById('contentMd'),
  contentUpload: document.getElementById('content-upload'),
  btnUploadContent: document.getElementById('btn-upload-content'),
  uploadedList: document.getElementById('uploaded-list'),
  preview: document.getElementById('preview'),
  log: document.getElementById('log'),
  btnRefreshStatus: document.getElementById('btn-refresh-status'),
  btnCommitPush: document.getElementById('btn-commit-push'),
  runChecksBeforePush: document.getElementById('run-checks-before-push'),
  btnQaContent: document.getElementById('btn-qa-content'),
  btnQaAssets: document.getElementById('btn-qa-assets'),
  btnQaLinks: document.getElementById('btn-qa-links'),
  archiveDays: document.getElementById('archive-days'),
  archiveDeleteImages: document.getElementById('archive-delete-images'),
  btnArchiveDry: document.getElementById('btn-archive-dry'),
  btnArchiveApply: document.getElementById('btn-archive-apply'),
  opsOutput: document.getElementById('ops-output'),
  quickWarnings: document.getElementById('quick-warnings'),
};

let currentSlug = '';
let previewTimer;
let sourceLinksState = [];

const CONTENT_TEMPLATE = `## 핵심 요약
## 지원 내용
## 대상/조건
## 신청 기간
## 신청 방법
## 필요 서류
## 참고/출처`;

const log = (msg) => {
  el.log.textContent = `[${new Date().toLocaleTimeString()}] ${msg}\n${el.log.textContent}`.slice(0, 7000);
};

const setOpsOutput = (title, payload) => {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  el.opsOutput.textContent = `[${new Date().toLocaleTimeString()}] ${title}\n\n${body}`;
};

const today = () => new Date().toISOString().slice(0, 10);
const random6 = () => Math.random().toString(36).slice(2, 8);
const createDraftSlug = (category) => `${category}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${random6()}`;

const splitLineItems = (value) =>
  String(value || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

const splitCommaItems = (value, fallback = []) => {
  const parsed = String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
};

const isHttpUrl = (url) => /^https?:\/\//i.test(url || '');

const fetchJson = async (url, options) => {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok || data.ok === false) {
    throw new Error(data.error ? JSON.stringify(data.error) : `request failed: ${res.status}`);
  }
  return data;
};

const getFormData = () => ({
  id: el.slug.value.trim(),
  slug: el.slug.value.trim(),
  title: el.title.value.trim(),
  summary: el.summary.value.trim(),
  category: el.category.value,
  tags: splitCommaItems(el.tags.value),
  regions: splitCommaItems(el.regions.value, ['ALL']),
  thumbnail: el.thumbnail.value.trim() || '/images/placeholders/p1.svg',
  publishedAt: el.publishedAt.value || today(),
  updatedAt: el.updatedAt.value || undefined,
  status: el.status.value,
  applicationPeriod: {
    start: el.periodStart.value || undefined,
    end: el.periodEnd.value || undefined,
    note: el.periodNote.value.trim() || undefined,
  },
  benefit: {
    type: el.benefitType.value || undefined,
    amountText: el.benefitAmountText.value.trim() || undefined,
    paymentCycle: el.benefitPaymentCycle.value || undefined,
  },
  eligibility: splitLineItems(el.eligibility.value),
  howToApply: splitLineItems(el.howToApply.value),
  documents: splitLineItems(el.documents.value),
  sourceLinks: sourceLinksState,
  organization: el.organization.value.trim(),
  contact: el.contact.value.trim(),
  contentMd: el.contentMd.value,
});

const renderQuickWarnings = () => {
  const payload = getFormData();
  const warnings = [];

  if (!payload.thumbnail) warnings.push('thumbnail이 비어 있습니다.');
  if (payload.title.length > 0 && payload.title.length < 6) warnings.push('title이 너무 짧습니다(6자 미만).');
  if (payload.summary.length > 0 && payload.summary.length < 10) warnings.push('summary가 너무 짧습니다(10자 미만).');
  if (payload.contentMd.length > 0 && payload.contentMd.length < 30) warnings.push('contentMd가 너무 짧습니다(30자 미만).');

  for (const link of payload.sourceLinks) {
    if (!isHttpUrl(link.url)) {
      warnings.push(`sourceLinks URL 형식 확인 필요: ${link.url || '(empty)'}`);
    }
  }

  el.quickWarnings.innerHTML = '';
  if (warnings.length === 0) {
    const li = document.createElement('li');
    li.textContent = '✅ 현재 즉시 경고 없음';
    el.quickWarnings.append(li);
    return;
  }

  for (const w of warnings) {
    const li = document.createElement('li');
    li.textContent = `⚠️ ${w}`;
    el.quickWarnings.append(li);
  }
};

const renderSourceLinks = () => {
  el.sourceList.innerHTML = '';
  sourceLinksState.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'inline';

    const text = document.createElement('code');
    text.textContent = `${item.title} - ${item.url}`;

    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.textContent = '삭제';
    btnDelete.addEventListener('click', () => {
      sourceLinksState = sourceLinksState.filter((_, i) => i !== index);
      renderSourceLinks();
      renderQuickWarnings();
    });

    li.append(text, btnDelete);
    el.sourceList.append(li);
  });
};

const setFormData = (post) => {
  const p = {
    ...post,
    regions: post.regions?.length ? post.regions : ['ALL'],
    applicationPeriod: post.applicationPeriod || {},
    benefit: post.benefit || {},
    eligibility: post.eligibility || [],
    howToApply: post.howToApply || [],
    documents: post.documents || [],
    sourceLinks: post.sourceLinks || [],
    organization: post.organization || '',
    contact: post.contact || '',
  };

  el.slug.value = p.slug || '';
  el.title.value = p.title || '';
  el.summary.value = p.summary || '';
  el.category.value = p.category || 'youth';
  el.status.value = p.status || 'draft';
  el.tags.value = (p.tags || []).join(', ');
  el.regions.value = (p.regions || ['ALL']).join(', ');
  el.publishedAt.value = p.publishedAt || today();
  el.updatedAt.value = p.updatedAt || '';
  el.thumbnail.value = p.thumbnail || '/images/placeholders/p1.svg';
  el.periodStart.value = p.applicationPeriod.start || '';
  el.periodEnd.value = p.applicationPeriod.end || '';
  el.periodNote.value = p.applicationPeriod.note || '';
  el.benefitType.value = p.benefit.type || '';
  el.benefitAmountText.value = p.benefit.amountText || '';
  el.benefitPaymentCycle.value = p.benefit.paymentCycle || '';
  el.eligibility.value = p.eligibility.join('\n');
  el.howToApply.value = p.howToApply.join('\n');
  el.documents.value = p.documents.join('\n');
  sourceLinksState = p.sourceLinks;
  renderSourceLinks();
  el.organization.value = p.organization;
  el.contact.value = p.contact;
  el.contentMd.value = p.contentMd || '';
  currentSlug = p.slug || '';
  renderPreview();
  renderQuickWarnings();
};

const loadPosts = async () => {
  const { items } = await fetchJson('/api/posts');
  el.postList.innerHTML = '';

  for (const item of items) {
    const li = document.createElement('li');
    li.dataset.slug = item.slug;
    if (item.slug === currentSlug) li.classList.add('active');
    li.innerHTML = `<strong>${item.title || item.slug}</strong><br><small>${item.category} · ${item.status} · ${item.publishedAt || ''}</small>`;
    li.addEventListener('click', async () => {
      const { post } = await fetchJson(`/api/posts/${item.slug}`);
      setFormData(post);
      await loadPosts();
    });
    el.postList.append(li);
  }
};

const renderUploaded = (paths) => {
  for (const filePath of paths) {
    const li = document.createElement('li');
    const code = `![](${filePath})`;

    const text = document.createElement('code');
    text.textContent = filePath;

    const btnUrl = document.createElement('button');
    btnUrl.type = 'button';
    btnUrl.textContent = 'URL 복사';
    btnUrl.addEventListener('click', async () => {
      await navigator.clipboard.writeText(filePath);
      log(`copied URL: ${filePath}`);
    });

    const btnMd = document.createElement('button');
    btnMd.type = 'button';
    btnMd.textContent = '마크다운 복사';
    btnMd.addEventListener('click', async () => {
      await navigator.clipboard.writeText(code);
      log(`copied markdown: ${code}`);
    });

    li.append(text, btnUrl, btnMd);
    el.uploadedList.prepend(li);
  }
};

const uploadFilesForSlug = async (slug, fileList, kind = 'content') => {
  if (!slug) throw new Error('slug가 필요합니다. 먼저 저장하거나 slug를 입력하세요.');
  if (!fileList || fileList.length === 0) return [];

  const fd = new FormData();
  fd.append('slug', slug);
  fd.append('kind', kind);
  for (const file of fileList) {
    fd.append('files', file);
  }

  const { files } = await fetchJson('/api/upload', { method: 'POST', body: fd });
  return files;
};

const renderPreview = async () => {
  const markdown = el.contentMd.value;
  try {
    const { html } = await fetchJson('/api/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ markdown }),
    });
    el.preview.innerHTML = html;
  } catch (error) {
    log(`preview error: ${error.message}`);
  }
};

const debouncePreview = () => {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, 300);
};

const runQa = async (checks) => {
  const payload = { checks };
  if (checks.includes('links')) payload.options = { treat403AsWarning: true };

  const res = await fetchJson('/api/qa/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  setOpsOutput('QA 결과', res.results);
  const failed = res.results.filter((r) => r.code !== 0);
  log(`qa run: ${checks.join(', ')} | failed=${failed.length}`);
  if (failed.length) alert(`QA 실패: ${failed.map((f) => f.name).join(', ')}`);
};

const runArchive = async (apply) => {
  const olderThanDays = Number(el.archiveDays.value || 365);
  const deleteImages = el.archiveDeleteImages.checked;

  const res = await fetchJson('/api/archive/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ olderThanDays, apply, deleteImages }),
  });

  setOpsOutput(`Archive ${apply ? 'Apply' : 'Dry Run'} 결과`, res.result);
  log(`archive run apply=${apply} code=${res.result?.code}`);
};

el.btnAddSource.addEventListener('click', () => {
  const title = el.sourceTitle.value.trim();
  const url = el.sourceUrl.value.trim();
  if (!title || !url) return;
  sourceLinksState.push({ title, url });
  el.sourceTitle.value = '';
  el.sourceUrl.value = '';
  renderSourceLinks();
  renderQuickWarnings();
});

el.btnInsertTemplate.addEventListener('click', () => {
  if (!el.contentMd.value.trim()) {
    el.contentMd.value = CONTENT_TEMPLATE;
  } else {
    el.contentMd.value += `\n\n${CONTENT_TEMPLATE}`;
  }
  debouncePreview();
  renderQuickWarnings();
});

el.btnNew.addEventListener('click', () => {
  const category = el.category.value || 'youth';
  const slug = createDraftSlug(category);
  setFormData({
    slug,
    title: '',
    summary: '',
    category,
    tags: [],
    regions: ['ALL'],
    thumbnail: '/images/placeholders/p1.svg',
    publishedAt: today(),
    status: 'draft',
    applicationPeriod: {},
    benefit: {},
    eligibility: [],
    howToApply: [],
    documents: [],
    sourceLinks: [],
    organization: '',
    contact: '',
    contentMd: '## 새 글\n\n내용을 입력하세요.',
  });
  log(`새 글 생성: ${slug}`);
});

el.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const payload = getFormData();
    const result = await fetchJson('/api/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    currentSlug = result.slug;
    el.slug.value = result.slug;
    await loadPosts();
    alert(`저장 완료: ${result.slug}`);
    log(`saved post: ${result.slug}`);
    renderQuickWarnings();
  } catch (error) {
    alert(`저장 실패: ${error.message}`);
    log(`save failed: ${error.message}`);
  }
});

el.thumbnailUpload.addEventListener('change', async () => {
  try {
    const files = await uploadFilesForSlug(el.slug.value.trim(), el.thumbnailUpload.files, 'thumbnail');
    if (files[0]) {
      el.thumbnail.value = files[0];
      renderUploaded(files);
      log(`thumbnail uploaded: ${files[0]}`);
    }
    el.thumbnailUpload.value = '';
    renderQuickWarnings();
  } catch (error) {
    alert(`썸네일 업로드 실패: ${error.message}`);
  }
});

el.btnUploadContent.addEventListener('click', async () => {
  try {
    const files = await uploadFilesForSlug(el.slug.value.trim(), el.contentUpload.files, 'content');
    renderUploaded(files);
    el.contentUpload.value = '';
    log(`content files uploaded: ${files.length}`);
  } catch (error) {
    alert(`본문 업로드 실패: ${error.message}`);
  }
});

el.contentMd.addEventListener('input', () => {
  debouncePreview();
  renderQuickWarnings();
});
el.title.addEventListener('input', renderQuickWarnings);
el.summary.addEventListener('input', renderQuickWarnings);
el.thumbnail.addEventListener('input', renderQuickWarnings);
el.sourceUrl.addEventListener('input', renderQuickWarnings);

el.btnRefreshStatus.addEventListener('click', async () => {
  try {
    const res = await fetchJson('/api/git/status');
    log(`git clean: ${res.isClean} | files: ${res.changedFiles.join(', ') || 'none'}`);
    alert(`isClean: ${res.isClean}\n${res.changedFiles.join('\n') || '변경 파일 없음'}`);
  } catch (error) {
    alert(`상태 조회 실패: ${error.message}`);
  }
});

el.btnCommitPush.addEventListener('click', async () => {
  const message = prompt('커밋 메시지를 입력하세요', 'admin: update posts');
  if (!message) return;

  const runChecks = el.runChecksBeforePush.checked;
  try {
    const res = await fetchJson('/api/git/commit-push', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message, runChecks, checks: ['content', 'assets'] }),
    });
    if (Array.isArray(res.qaResults) && res.qaResults.length > 0) {
      setOpsOutput('Pre-push QA 결과', res.qaResults);
    }
    log(`commit/push result: ${JSON.stringify(res)}`);
    alert(res.pushed ? '커밋 & 푸시 완료' : res.message || '변경 없음');
    await loadPosts();
  } catch (error) {
    alert(`커밋/푸시 실패: ${error.message}`);
    log(`commit/push failed: ${error.message}`);
  }
});

el.btnQaContent.addEventListener('click', async () => {
  try {
    await runQa(['content']);
  } catch (error) {
    setOpsOutput('QA 오류', String(error.message || error));
  }
});

el.btnQaAssets.addEventListener('click', async () => {
  try {
    await runQa(['assets']);
  } catch (error) {
    setOpsOutput('QA 오류', String(error.message || error));
  }
});

el.btnQaLinks.addEventListener('click', async () => {
  try {
    await runQa(['links']);
  } catch (error) {
    setOpsOutput('QA 오류', String(error.message || error));
  }
});

el.btnArchiveDry.addEventListener('click', async () => {
  try {
    await runArchive(false);
  } catch (error) {
    setOpsOutput('Archive 오류', String(error.message || error));
  }
});

el.btnArchiveApply.addEventListener('click', async () => {
  const ok = confirm('정말 archive를 적용할까요? data/posts 파일이 이동됩니다.');
  if (!ok) return;
  try {
    await runArchive(true);
    await loadPosts();
  } catch (error) {
    setOpsOutput('Archive 오류', String(error.message || error));
  }
});

(async () => {
  try {
    await fetchJson('/api/health');
    await loadPosts();
    el.btnNew.click();
    renderQuickWarnings();
    log('admin ready');
  } catch (error) {
    log(`init failed: ${error.message}`);
    alert(`어드민 초기화 실패: ${error.message}`);
  }
})();
