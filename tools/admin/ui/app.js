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
  publishedAt: document.getElementById('publishedAt'),
  thumbnail: document.getElementById('thumbnail'),
  thumbnailUpload: document.getElementById('thumbnail-upload'),
  contentMd: document.getElementById('contentMd'),
  contentUpload: document.getElementById('content-upload'),
  btnUploadContent: document.getElementById('btn-upload-content'),
  uploadedList: document.getElementById('uploaded-list'),
  preview: document.getElementById('preview'),
  log: document.getElementById('log'),
  btnRefreshStatus: document.getElementById('btn-refresh-status'),
  btnCommitPush: document.getElementById('btn-commit-push'),
};

let currentSlug = '';
let previewTimer;

const log = (msg) => {
  el.log.textContent = `[${new Date().toLocaleTimeString()}] ${msg}\n${el.log.textContent}`.slice(0, 5000);
};

const today = () => new Date().toISOString().slice(0, 10);

const random6 = () => Math.random().toString(36).slice(2, 8);

const createDraftSlug = (category) => {
  const ymd = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `${category}-${ymd}-${random6()}`;
};

const getFormData = () => ({
  id: el.slug.value.trim(),
  slug: el.slug.value.trim(),
  title: el.title.value.trim(),
  summary: el.summary.value.trim(),
  category: el.category.value,
  tags: el.tags.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  thumbnail: el.thumbnail.value.trim() || '/images/placeholders/p1.svg',
  publishedAt: el.publishedAt.value || today(),
  status: el.status.value,
  contentMd: el.contentMd.value,
});

const setFormData = (post) => {
  el.slug.value = post.slug || '';
  el.title.value = post.title || '';
  el.summary.value = post.summary || '';
  el.category.value = post.category || 'youth';
  el.status.value = post.status || 'draft';
  el.tags.value = (post.tags || []).join(', ');
  el.publishedAt.value = post.publishedAt || today();
  el.thumbnail.value = post.thumbnail || '/images/placeholders/p1.svg';
  el.contentMd.value = post.contentMd || '';
  currentSlug = post.slug || '';
  renderPreview();
};

const fetchJson = async (url, options) => {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok || data.ok === false) {
    throw new Error(data.error ? JSON.stringify(data.error) : `request failed: ${res.status}`);
  }
  return data;
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
    btnUrl.textContent = 'URL 복사';
    btnUrl.addEventListener('click', async () => {
      await navigator.clipboard.writeText(filePath);
      log(`copied URL: ${filePath}`);
    });

    const btnMd = document.createElement('button');
    btnMd.textContent = '마크다운 복사';
    btnMd.addEventListener('click', async () => {
      await navigator.clipboard.writeText(code);
      log(`copied markdown: ${code}`);
    });

    li.append(text, btnUrl, btnMd);
    el.uploadedList.prepend(li);
  }
};

const uploadFilesForSlug = async (slug, fileList) => {
  if (!slug) throw new Error('slug가 필요합니다. 먼저 저장하거나 slug를 입력하세요.');
  if (!fileList || fileList.length === 0) return [];

  const fd = new FormData();
  fd.append('slug', slug);
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

el.btnNew.addEventListener('click', () => {
  const category = el.category.value || 'youth';
  const slug = createDraftSlug(category);
  setFormData({
    slug,
    title: '',
    summary: '',
    category,
    tags: [],
    thumbnail: '/images/placeholders/p1.svg',
    publishedAt: today(),
    status: 'draft',
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
  } catch (error) {
    alert(`저장 실패: ${error.message}`);
    log(`save failed: ${error.message}`);
  }
});

el.thumbnailUpload.addEventListener('change', async () => {
  try {
    const files = await uploadFilesForSlug(el.slug.value.trim(), el.thumbnailUpload.files);
    if (files[0]) {
      el.thumbnail.value = files[0];
      renderUploaded(files);
      log(`thumbnail uploaded: ${files[0]}`);
    }
    el.thumbnailUpload.value = '';
  } catch (error) {
    alert(`썸네일 업로드 실패: ${error.message}`);
  }
});

el.btnUploadContent.addEventListener('click', async () => {
  try {
    const files = await uploadFilesForSlug(el.slug.value.trim(), el.contentUpload.files);
    renderUploaded(files);
    el.contentUpload.value = '';
    log(`content files uploaded: ${files.length}`);
  } catch (error) {
    alert(`본문 업로드 실패: ${error.message}`);
  }
});

el.contentMd.addEventListener('input', debouncePreview);

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

  try {
    const res = await fetchJson('/api/git/commit-push', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    log(`commit/push result: ${JSON.stringify(res)}`);
    alert(res.pushed ? '커밋 & 푸시 완료' : res.message || '변경 없음');
    await loadPosts();
  } catch (error) {
    alert(`커밋/푸시 실패: ${error.message}`);
    log(`commit/push failed: ${error.message}`);
  }
});

(async () => {
  try {
    await fetchJson('/api/health');
    await loadPosts();
    el.btnNew.click();
    log('admin ready');
  } catch (error) {
    log(`init failed: ${error.message}`);
    alert(`어드민 초기화 실패: ${error.message}`);
  }
})();
