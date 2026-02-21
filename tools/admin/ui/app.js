const REGION_CODES = [
  'ALL','SEOUL','BUSAN','DAEGU','INCHEON','GWANGJU','DAEJEON','ULSAN','SEJONG','GYEONGGI','GANGWON','CHUNGBUK','CHUNGNAM','JEONBUK','JEONNAM','GYEONGBUK','GYEONGNAM','JEJU'
];

const REASON_LABELS = {
  NO_SOURCE: '출처 없음',
  STALE_UPDATE: '오래된 업데이트',
  EXPIRED: '마감 지남',
  MISSING_THUMB: '썸네일 문제',
};

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
  tagSuggestions: document.getElementById('tag-suggestions'),
  regionSuggestions: document.getElementById('region-suggestions'),
  publishedAt: document.getElementById('publishedAt'),
  updatedAt: document.getElementById('updatedAt'),
  thumbnail: document.getElementById('thumbnail'),
  thumbnailUpload: document.getElementById('thumbnail-upload'),
  ogImage: document.getElementById('ogImage'),
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
  seoWarnings: document.getElementById('seo-warnings'),
  seoSearchPreview: document.getElementById('seo-search-preview'),
  seoOgPreview: document.getElementById('seo-og-preview'),
  saveWarnings: document.getElementById('save-warnings'),
  tabButtons: document.querySelectorAll('[data-tab-btn]'),
  tabs: document.querySelectorAll('[data-tab]'),
  duplicatesList: document.getElementById('duplicates-list'),
  btnRefreshDuplicates: document.getElementById('btn-refresh-duplicates'),
  reviewList: document.getElementById('review-list'),
  reviewStaleDays: document.getElementById('review-stale-days'),
  reviewExpiredDays: document.getElementById('review-expired-days'),
  btnRefreshReview: document.getElementById('btn-refresh-review'),
};

let currentSlug = '';
let previewTimer;
let sourceLinksState = [];
let suggestions = { tags: [], regions: [] };

const CONTENT_TEMPLATE = `## 핵심 요약\n## 지원 내용\n## 대상/조건\n## 신청 기간\n## 신청 방법\n## 필요 서류\n## 참고/출처`;

const log = (msg) => {
  el.log.textContent = `[${new Date().toLocaleTimeString()}] ${msg}\n${el.log.textContent}`.slice(0, 12000);
};

const setOpsOutput = (title, payload) => {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  el.opsOutput.textContent = `[${new Date().toLocaleTimeString()}] ${title}\n\n${body}`;
};

const fetchJson = async (url, options) => {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error ? JSON.stringify(data.error) : `request failed: ${res.status}`);
  return data;
};

const today = () => new Date().toISOString().slice(0, 10);
const random6 = () => Math.random().toString(36).slice(2, 8);
const createDraftSlug = (category) => `${category}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${random6()}`;
const splitLineItems = (value) => String(value || '').split('\n').map((s) => s.trim()).filter(Boolean);
const splitCommaItems = (value, fallback = []) => {
  const parsed = String(value || '').split(',').map((s) => s.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
};
const uniq = (arr) => [...new Set(arr)];
const isHttpUrl = (url) => /^https?:\/\//i.test(url || '');

function getTagArray() {
  return splitCommaItems(el.tags.value, []);
}

function setTagArray(tags) {
  el.tags.value = uniq(tags).join(', ');
}

function getRegionArray() {
  const parsed = splitCommaItems(el.regions.value, ['ALL']).map((v) => v.toUpperCase());
  const unique = uniq(parsed);
  return unique.includes('ALL') ? ['ALL'] : unique;
}

function setRegionArray(regions) {
  const normalized = uniq((regions || ['ALL']).map((v) => String(v).toUpperCase()));
  el.regions.value = (normalized.includes('ALL') ? ['ALL'] : normalized).join(', ');
  renderRegionSuggestions();
}

function switchTab(name) {
  el.tabButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tabBtn === name));
  el.tabs.forEach((section) => section.classList.toggle('hidden', section.dataset.tab !== name));
}

function renderTagSuggestions() {
  el.tagSuggestions.innerHTML = '';
  for (const item of suggestions.tags.slice(0, 20)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = `${item.tag} (${item.count})`;
    btn.addEventListener('click', () => {
      setTagArray([...getTagArray(), item.tag]);
      renderSeoPreview();
    });
    el.tagSuggestions.append(btn);
  }
}

function renderRegionSuggestions() {
  const selected = getRegionArray();
  el.regionSuggestions.innerHTML = '';
  for (const code of REGION_CODES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `chip ${selected.includes(code) ? 'selected' : ''}`;
    btn.textContent = code;
    btn.addEventListener('click', () => {
      let next = getRegionArray();
      if (code === 'ALL') {
        next = ['ALL'];
      } else {
        next = next.filter((x) => x !== 'ALL');
        if (next.includes(code)) next = next.filter((x) => x !== code);
        else next.push(code);
        if (next.length === 0) next = ['ALL'];
      }
      setRegionArray(next);
    });
    el.regionSuggestions.append(btn);
  }
}

function renderSeoPreview() {
  const title = el.title.value.trim();
  const desc = el.summary.value.trim();
  const slug = el.slug.value.trim() || 'your-slug';
  const img = el.ogImage.value.trim() || el.thumbnail.value.trim() || '/images/placeholders/p1.svg';

  const warnings = [];
  if (title.length > 55) warnings.push(`title 길이 경고: ${title.length}/55`);
  if (desc.length > 155) warnings.push(`description 길이 경고: ${desc.length}/155`);
  el.seoWarnings.innerHTML = warnings.length
    ? warnings.map((w) => `<div class="warn">⚠️ ${w}</div>`).join('')
    : '<div class="ok">✅ 길이 가이드 적정 범위</div>';

  el.seoSearchPreview.innerHTML = `
    <div class="search-url">/p/${slug}/</div>
    <div class="search-title">${title || '(제목 미입력)'}</div>
    <div class="search-desc">${desc || '(설명 미입력)'}</div>
  `;

  el.seoOgPreview.innerHTML = `
    <div class="og-card">
      <img src="${img}" alt="og preview" />
      <div>
        <div class="og-title">${title || '(제목 미입력)'}</div>
        <div class="og-desc">${desc || '(설명 미입력)'}</div>
      </div>
    </div>
  `;
}

function getFormData() {
  return {
    id: el.slug.value.trim(),
    slug: el.slug.value.trim(),
    title: el.title.value.trim(),
    summary: el.summary.value.trim(),
    category: el.category.value,
    tags: getTagArray(),
    regions: getRegionArray(),
    thumbnail: el.thumbnail.value.trim() || '/images/placeholders/p1.svg',
    ogImage: el.ogImage.value.trim() || undefined,
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
  };
}

function renderQuickWarnings() {
  const payload = getFormData();
  const warnings = [];
  if (!payload.thumbnail) warnings.push('thumbnail이 비어 있습니다.');
  if (payload.title.length > 0 && payload.title.length < 6) warnings.push('title이 너무 짧습니다(6자 미만).');
  if (payload.summary.length > 0 && payload.summary.length < 10) warnings.push('summary가 너무 짧습니다(10자 미만).');
  if (payload.contentMd.length > 0 && payload.contentMd.length < 30) warnings.push('contentMd가 너무 짧습니다(30자 미만).');
  for (const link of payload.sourceLinks) if (!isHttpUrl(link.url)) warnings.push(`sourceLinks URL 형식 확인 필요: ${link.url || '(empty)'}`);

  el.quickWarnings.innerHTML = warnings.length
    ? warnings.map((w) => `<li>⚠️ ${w}</li>`).join('')
    : '<li>✅ 현재 즉시 경고 없음</li>';

  renderSeoPreview();
}

function renderSourceLinks() {
  el.sourceList.innerHTML = '';
  sourceLinksState.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'inline';
    li.innerHTML = `<code>${item.title} - ${item.url}</code>`;
    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.textContent = '삭제';
    btnDelete.addEventListener('click', () => {
      sourceLinksState = sourceLinksState.filter((_, i) => i !== index);
      renderSourceLinks();
      renderQuickWarnings();
    });
    li.append(btnDelete);
    el.sourceList.append(li);
  });
}

async function loadPosts() {
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
      switchTab('edit');
    });
    el.postList.append(li);
  }
}

function setFormData(post) {
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
  setTagArray(p.tags || []);
  setRegionArray(p.regions || ['ALL']);
  el.publishedAt.value = p.publishedAt || today();
  el.updatedAt.value = p.updatedAt || '';
  el.thumbnail.value = p.thumbnail || '/images/placeholders/p1.svg';
  el.ogImage.value = p.ogImage || '';
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
}

function renderUploaded(paths) {
  for (const filePath of paths) {
    const li = document.createElement('li');
    const code = `![](${filePath})`;
    li.innerHTML = `<code>${filePath}</code>`;

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

    li.append(btnUrl, btnMd);
    el.uploadedList.prepend(li);
  }
}

async function uploadFilesForSlug(slug, fileList, kind = 'content') {
  if (!slug) throw new Error('slug가 필요합니다. 먼저 저장하거나 slug를 입력하세요.');
  if (!fileList || fileList.length === 0) return [];

  const fd = new FormData();
  fd.append('slug', slug);
  fd.append('kind', kind);
  for (const file of fileList) fd.append('files', file);

  const { files } = await fetchJson('/api/upload', { method: 'POST', body: fd });
  return files;
}

async function renderPreview() {
  try {
    const { html } = await fetchJson('/api/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ markdown: el.contentMd.value }),
    });
    el.preview.innerHTML = html;
  } catch (error) {
    log(`preview error: ${error.message}`);
  }
}

function debouncePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, 300);
}

async function runQa(checks) {
  const payload = { checks };
  if (checks.includes('links')) payload.options = { treat403AsWarning: true };
  const res = await fetchJson('/api/qa/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  setOpsOutput('QA 결과', res.results);
}

async function runArchive(apply) {
  const res = await fetchJson('/api/archive/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      olderThanDays: Number(el.archiveDays.value || 365),
      apply,
      deleteImages: el.archiveDeleteImages.checked,
    }),
  });
  setOpsOutput(`Archive ${apply ? 'Apply' : 'Dry Run'} 결과`, res.result);
}

function defaultCanonical(items) {
  return [...items].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'published' ? -1 : 1;
    const aKey = a.updatedAt || a.publishedAt || '0000-00-00';
    const bKey = b.updatedAt || b.publishedAt || '0000-00-00';
    return bKey.localeCompare(aKey);
  })[0]?.slug;
}

async function loadDuplicates() {
  const { groups } = await fetchJson('/api/duplicates');
  el.duplicatesList.innerHTML = '';
  if (!groups.length) {
    el.duplicatesList.innerHTML = '<p>중복 그룹이 없습니다.</p>';
    return;
  }

  for (const group of groups) {
    const box = document.createElement('article');
    box.className = 'dup-group';
    const canonical = defaultCanonical(group.items);

    const header = document.createElement('div');
    header.className = 'inline';
    const urlCode = document.createElement('code');
    urlCode.textContent = group.url;
    const btnCopy = document.createElement('button');
    btnCopy.type = 'button';
    btnCopy.textContent = 'URL 복사';
    btnCopy.onclick = async () => navigator.clipboard.writeText(group.url);
    header.append(urlCode, btnCopy);
    box.append(header);

    const canonicalSelect = document.createElement('select');
    group.items.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.slug;
      opt.textContent = `${item.slug} (${item.status}, ${item.updatedAt || item.publishedAt || '-'})`;
      if (item.slug === canonical) opt.selected = true;
      canonicalSelect.append(opt);
    });
    box.append(canonicalSelect);

    group.items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'dup-item';
      row.innerHTML = `<strong>${item.slug}</strong> · ${item.title}`;

      const delChk = document.createElement('input');
      delChk.type = 'checkbox';
      const delLabel = document.createElement('label');
      delLabel.className = 'check-inline';
      delLabel.append(delChk, document.createTextNode('이미지 삭제'));

      const btnMerge = document.createElement('button');
      btnMerge.type = 'button';
      btnMerge.textContent = '통합(merge+archive+redirect)';
      btnMerge.onclick = async () => {
        const canonicalSlug = canonicalSelect.value;
        if (canonicalSlug === item.slug) return;
        if (!confirm(`${item.slug}를 ${canonicalSlug}로 통합할까요?`)) return;
        const res = await fetchJson('/api/duplicates/resolve', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            canonicalSlug,
            duplicateSlug: item.slug,
            mode: 'merge-and-archive',
            createRedirect: true,
            deleteImages: delChk.checked,
          }),
        });
        log(`duplicate resolved: ${JSON.stringify(res)}`);
        await loadPosts();
        await loadDuplicates();
      };

      const btnArchiveOnly = document.createElement('button');
      btnArchiveOnly.type = 'button';
      btnArchiveOnly.textContent = '아카이브만';
      btnArchiveOnly.onclick = async () => {
        const canonicalSlug = canonicalSelect.value;
        if (canonicalSlug === item.slug) return;
        if (!confirm(`${item.slug}를 아카이브할까요?`)) return;
        const res = await fetchJson('/api/duplicates/resolve', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            canonicalSlug,
            duplicateSlug: item.slug,
            mode: 'archive-only',
            createRedirect: true,
            deleteImages: delChk.checked,
          }),
        });
        log(`duplicate archived: ${JSON.stringify(res)}`);
        await loadPosts();
        await loadDuplicates();
      };

      row.append(delLabel, btnMerge, btnArchiveOnly);
      box.append(row);
    });

    el.duplicatesList.append(box);
  }
}

async function loadReviewQueue() {
  const staleDays = Number(el.reviewStaleDays.value || 120);
  const expiredDays = Number(el.reviewExpiredDays.value || 0);
  const { items } = await fetchJson(`/api/review-queue?staleDays=${staleDays}&expiredDays=${expiredDays}`);
  el.reviewList.innerHTML = '';
  if (!items.length) {
    el.reviewList.innerHTML = '<p>리뷰 대상이 없습니다.</p>';
    return;
  }

  for (const item of items) {
    const box = document.createElement('article');
    box.className = 'review-item';
    const badges = item.reasons
      .map((reason) => `<span class="reason-badge">${REASON_LABELS[reason] || reason}</span>`)
      .join(' ');

    box.innerHTML = `
      <div><strong>${item.slug}</strong> · ${item.title}</div>
      <div class="meta">updated: ${item.updatedAt || '-'} · end: ${item.end || '-'}</div>
      <div>${badges}</div>
    `;

    const btnOpen = document.createElement('button');
    btnOpen.type = 'button';
    btnOpen.textContent = '열기';
    btnOpen.onclick = async () => {
      const { post } = await fetchJson(`/api/posts/${item.slug}`);
      setFormData(post);
      await loadPosts();
      switchTab('edit');
    };

    const btnArchive = document.createElement('button');
    btnArchive.type = 'button';
    btnArchive.textContent = '아카이브';
    btnArchive.onclick = async () => {
      if (!confirm(`${item.slug}를 archive로 이동할까요?`)) return;
      await fetchJson('/api/posts/archive-one', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: item.slug }),
      });
      await loadPosts();
      await loadReviewQueue();
    };

    box.append(btnOpen, btnArchive);
    el.reviewList.append(box);
  }
}

async function loadSuggestions() {
  try {
    const res = await fetchJson('/api/suggestions');
    suggestions = { tags: res.tags || [], regions: res.regions || [] };
    renderTagSuggestions();
    renderRegionSuggestions();
  } catch (error) {
    log(`suggestions load failed: ${error.message}`);
  }
}

el.tabButtons.forEach((btn) => btn.addEventListener('click', () => switchTab(btn.dataset.tabBtn)));

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
  el.contentMd.value = el.contentMd.value.trim() ? `${el.contentMd.value}\n\n${CONTENT_TEMPLATE}` : CONTENT_TEMPLATE;
  debouncePreview();
  renderQuickWarnings();
});

el.btnNew.addEventListener('click', () => {
  const slug = createDraftSlug(el.category.value || 'youth');
  setFormData({
    slug,
    title: '',
    summary: '',
    category: el.category.value || 'youth',
    tags: [],
    regions: ['ALL'],
    thumbnail: '/images/placeholders/p1.svg',
    ogImage: '',
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
    const result = await fetchJson('/api/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(getFormData()),
    });

    currentSlug = result.slug;
    el.slug.value = result.slug;
    el.saveWarnings.innerHTML = Array.isArray(result.warnings) && result.warnings.length
      ? `<div class="warn-box">${result.warnings.map((w) => `<div>⚠️ ${w}</div>`).join('')}</div>`
      : '';

    await loadPosts();
    alert(`저장 완료: ${result.slug}`);
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
  } catch (error) {
    alert(`본문 업로드 실패: ${error.message}`);
  }
});

['input','change'].forEach((ev) => {
  [el.title, el.summary, el.slug, el.thumbnail, el.ogImage, el.tags, el.regions, el.contentMd].forEach((node) => {
    node.addEventListener(ev, () => {
      renderQuickWarnings();
      if (node === el.contentMd) debouncePreview();
    });
  });
});

el.btnRefreshStatus.addEventListener('click', async () => {
  const res = await fetchJson('/api/git/status');
  alert(`isClean: ${res.isClean}\n${res.changedFiles.join('\n') || '변경 파일 없음'}`);
});

el.btnCommitPush.addEventListener('click', async () => {
  const message = prompt('커밋 메시지를 입력하세요', 'admin: update posts');
  if (!message) return;
  try {
    const res = await fetchJson('/api/git/commit-push', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message,
        runChecks: el.runChecksBeforePush.checked,
        checks: ['content', 'assets'],
      }),
    });
    if (res.qaResults?.length) setOpsOutput('Pre-push QA 결과', res.qaResults);
    alert(res.pushed ? '커밋 & 푸시 완료' : res.message || '변경 없음');
    await loadPosts();
  } catch (error) {
    alert(`커밋/푸시 실패: ${error.message}`);
  }
});

el.btnQaContent.addEventListener('click', () => runQa(['content']).catch((e) => setOpsOutput('QA 오류', e.message)));
el.btnQaAssets.addEventListener('click', () => runQa(['assets']).catch((e) => setOpsOutput('QA 오류', e.message)));
el.btnQaLinks.addEventListener('click', () => runQa(['links']).catch((e) => setOpsOutput('QA 오류', e.message)));
el.btnArchiveDry.addEventListener('click', () => runArchive(false).catch((e) => setOpsOutput('Archive 오류', e.message)));
el.btnArchiveApply.addEventListener('click', async () => {
  if (!confirm('정말 archive를 적용할까요?')) return;
  await runArchive(true);
  await loadPosts();
});

el.btnRefreshDuplicates.addEventListener('click', () => loadDuplicates().catch((e) => log(e.message)));
el.btnRefreshReview.addEventListener('click', () => loadReviewQueue().catch((e) => log(e.message)));

(async () => {
  try {
    await fetchJson('/api/health');
    await Promise.all([loadPosts(), loadSuggestions(), loadDuplicates(), loadReviewQueue()]);
    el.btnNew.click();
    renderQuickWarnings();
    switchTab('edit');
    log('admin ready');
  } catch (error) {
    log(`init failed: ${error.message}`);
    alert(`어드민 초기화 실패: ${error.message}`);
  }
})();
