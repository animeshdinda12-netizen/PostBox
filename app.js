const GITHUB_USERNAME = 'animeshdinda12-netizen';
const TARGET_REPO = 'StreamLog';
let GITHUB_TOKEN = localStorage.getItem('github_token') || '';

const tokenCard = document.getElementById('tokenCard');
const postCard = document.getElementById('postCard');
const tokenForm = document.getElementById('tokenForm');
const tokenInput = document.getElementById('tokenInput');
const postForm = document.getElementById('postForm');
const postContent = document.getElementById('postContent');
const imageInput = document.getElementById('imageInput');
const uploadArea = document.getElementById('uploadArea');
const previewImage = document.getElementById('previewImage');
const uploadContent = document.getElementById('uploadContent');
const submitBtn = document.getElementById('submitBtn');
const status = document.getElementById('status');
const recentPostsEl = document.getElementById('recentPosts');

let selectedImage = null;
let selectedImageName = '';

function init() {
  if (GITHUB_TOKEN) {
    tokenCard.style.display = 'none';
    postCard.style.display = 'block';
    loadRecentPosts();
  } else {
    tokenCard.style.display = 'block';
    postCard.style.display = 'none';
  }
}

tokenForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const token = tokenInput.value.trim();
  if (token.startsWith('ghp_')) {
    localStorage.setItem('github_token', token);
    GITHUB_TOKEN = token;
    tokenCard.style.display = 'none';
    postCard.style.display = 'block';
    loadRecentPosts();
  }
});

postForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = postContent.value.trim();
  if (!content && !selectedImage) {
    showStatus('Please add text or image', 'error');
    return;
  }
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
  try {
    await publishPost(content, selectedImage, selectedImageName);
    showStatus('Post published!', 'success');
    postContent.value = '';
    selectedImage = null;
    selectedImageName = '';
    previewImage.classList.remove('show');
    imageInput.value = '';
    setTimeout(() => loadRecentPosts(), 1500);
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
  } finally {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
});

imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleImageSelect(file);
});

uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => { uploadArea.classList.remove('drag-over'); });
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleImageSelect(file);
});

function handleImageSelect(file) {
  selectedImageName = file.name.replace(/\s+/g, '-').toLowerCase();
  const reader = new FileReader();
  reader.onload = (e) => {
    selectedImage = e.target.result;
    previewImage.src = selectedImage;
    previewImage.classList.add('show');
    uploadContent.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function publishPost(content, imageBase64, imageName) {
  const post = {
    id: Date.now().toString(),
    content,
    image: imageBase64 ? `images/${imageName}` : null,
    timestamp: new Date().toISOString(),
  };
  const posts = await getExistingPosts();
  posts.unshift(post);
  const files = [{ path: 'posts.json', content: JSON.stringify(posts, null, 2) }];
  if (imageBase64 && imageName) {
    files.push({ path: `images/${imageName}`, content: imageBase64.split(',')[1] });
  }
  for (const file of files) {
    await commitFile(file.path, file.content);
  }
}

async function getExistingPosts() {
  try {
    const r = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${TARGET_REPO}/contents/posts.json`, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!r.ok) return [];
    const d = await r.json();
    return JSON.parse(atob(d.content));
  } catch { return []; }
}

async function commitFile(path, content) {
  let sha = null;
  try {
    const r = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${TARGET_REPO}/contents/${path}`, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (r.ok) { const d = await r.json(); sha = d.sha; }
  } catch {}
  const body = { message: `Add ${path}`, content: btoa(content), branch: 'main' };
  if (sha) body.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${TARGET_REPO}/contents/${path}`, {
    method: 'PUT', headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error((await r.json()).message);
}

function showStatus(msg, type) {
  status.textContent = msg;
  status.className = `status show ${type}`;
  setTimeout(() => status.classList.remove('show'), 5000);
}

async function loadRecentPosts() {
  try {
    const posts = await getExistingPosts();
    if (!posts.length) { recentPostsEl.innerHTML = '<p class="no-posts">No posts yet</p>'; return; }
    recentPostsEl.innerHTML = posts.slice(0, 5).map(p => `<div class="recent-post"><div class="recent-post-content"><h4>${p.content.substring(0, 50)}</h4><span>${new Date(p.timestamp).toLocaleDateString()}</span></div></div>`).join('');
  } catch { recentPostsEl.innerHTML = '<p class="no-posts">Could not load</p>'; }
}

init();