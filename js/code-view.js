const manifestUrl = '../project-files.json';
const state = { manifest: {}, files: [], current: null, cache: new Map() };

const extensionLanguage = {
  '.html': 'html',
  '.css': 'css',
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.json': 'json',
  '.md': 'markdown',
  '.rules': 'plaintext',
  '.yml': 'yaml',
  '.yaml': 'yaml'
};

function ext(path) {
  const index = path.lastIndexOf('.');
  return index < 0 ? '' : path.slice(index);
}

function isImage(path) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(path);
}

function pathUrl(path) {
  return `../${path}`;
}

async function fetchFile(path) {
  if (state.cache.has(path)) return state.cache.get(path);
  const response = await fetch(pathUrl(path));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const content = isImage(path) ? await response.blob() : await response.text();
  state.cache.set(path, content);
  return content;
}

function createFileButton(path) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'file-item w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 flex items-center gap-2';
  button.dataset.file = path;

  const icon = document.createElement('i');
  icon.className = isImage(path) ? 'fa-regular fa-image text-green-500' : 'fa-regular fa-file text-slate-500';
  const label = document.createElement('span');
  label.className = 'truncate';
  label.textContent = path;
  button.append(icon, label);
  button.addEventListener('click', () => loadFile(path));
  return button;
}

function renderTabs() {
  const tabs = document.getElementById('file-tabs');
  tabs.textContent = '';

  Object.entries(state.manifest).forEach(([groupName, paths]) => {
    if (!Array.isArray(paths) || !paths.length) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'relative inline-block';

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'file-group-tab px-4 py-1.5 text-sm font-medium border-b-2 border-transparent hover:border-indigo-500 hover:text-indigo-600 transition-colors';
    tab.textContent = groupName;

    const dropdown = document.createElement('div');
    dropdown.className = 'file-group-dropdown absolute left-0 top-full mt-1 w-72 bg-white shadow-lg rounded-lg border border-gray-200 p-2 hidden z-20';
    const list = document.createElement('div');
    list.className = 'max-h-80 overflow-y-auto';
    [...paths].sort().forEach((path) => list.appendChild(createFileButton(path)));
    dropdown.appendChild(list);

    tab.addEventListener('click', (event) => {
      event.stopPropagation();
      document.querySelectorAll('.file-group-dropdown').forEach((node) => {
        if (node !== dropdown) node.classList.add('hidden');
      });
      dropdown.classList.toggle('hidden');
    });

    wrapper.append(tab, dropdown);
    tabs.appendChild(wrapper);
  });
}

async function loadFile(path) {
  state.current = path;
  document.getElementById('current-file').textContent = path;
  const display = document.getElementById('code-display');
  display.className = `language-${extensionLanguage[ext(path)] || 'plaintext'}`;

  try {
    if (isImage(path)) {
      display.textContent = `[Arquivo de imagem: ${path}]`;
      return;
    }
    display.textContent = await fetchFile(path);
    window.hljs?.highlightElement?.(display);
  } catch (error) {
    display.textContent = `Não foi possível carregar ${path}: ${error.message}`;
  }
}

async function copyCurrent() {
  if (!state.current || isImage(state.current)) return;
  const content = await fetchFile(state.current);
  await navigator.clipboard.writeText(content);
  window.Swal?.fire?.({ icon: 'success', title: 'Copiado', timer: 1200, showConfirmButton: false });
}

async function downloadCurrent() {
  if (!state.current) return;
  const content = await fetchFile(state.current);
  const blob = content instanceof Blob ? content : new Blob([content], { type: 'text/plain;charset=utf-8' });
  if (typeof saveAs === 'function') saveAs(blob, state.current.split('/').pop());
}

async function copyAll() {
  const textFiles = state.files.filter((path) => !isImage(path));
  const parts = [];
  for (const path of textFiles) {
    try {
      parts.push(`===== ${path} =====\n${await fetchFile(path)}`);
    } catch (error) {
      parts.push(`===== ${path} =====\n[Erro: ${error.message}]`);
    }
  }
  await navigator.clipboard.writeText(parts.join('\n\n'));
  window.Swal?.fire?.({ icon: 'success', title: 'Código copiado', timer: 1500, showConfirmButton: false });
}

async function downloadAll() {
  if (typeof JSZip === 'undefined' || typeof saveAs !== 'function') {
    throw new Error('JSZip/FileSaver não disponíveis.');
  }

  const button = document.getElementById('download-all-btn');
  button.disabled = true;
  const zip = new JSZip();
  try {
    for (const path of state.files) {
      try {
        zip.file(path, await fetchFile(path));
      } catch (error) {
        console.warn(`Ignorando ${path}:`, error);
      }
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'construktor.zip');
  } finally {
    button.disabled = false;
  }
}

async function init() {
  try {
    const response = await fetch(manifestUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.manifest = await response.json();
    state.files = [...new Set(Object.values(state.manifest).flat())];
    renderTabs();

    document.addEventListener('click', () => {
      document.querySelectorAll('.file-group-dropdown').forEach((node) => node.classList.add('hidden'));
    });
    document.getElementById('copy-file-btn')?.addEventListener('click', copyCurrent);
    document.getElementById('download-file-btn')?.addEventListener('click', downloadCurrent);
    document.getElementById('copy-all-btn')?.addEventListener('click', copyAll);
    document.getElementById('download-all-btn')?.addEventListener('click', () => downloadAll().catch((error) => {
      window.Swal?.fire?.('Erro', error.message, 'error');
    }));

    const first = state.files.find((path) => path === 'README.md') || state.files[0];
    if (first) await loadFile(first);
  } catch (error) {
    console.error('Erro ao inicializar visualizador de código:', error);
    document.getElementById('code-display').textContent = `Erro: ${error.message}`;
  }
}

document.addEventListener('DOMContentLoaded', init);
