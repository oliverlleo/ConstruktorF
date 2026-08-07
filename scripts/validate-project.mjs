import { access, readFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const requiredFiles = [
  'index.html',
  'pages/login.html',
  'pages/user-view.html',
  'pages/flow-designer.html',
  'pages/code-view.html',
  'js/main.js',
  'js/autenticacao.js',
  'js/database.js',
  'js/core/firebase-app.js',
  'js/core/security.js',
  'js/core/firestore-utils.js',
  'js/core/permissions.js',
  'js/features/auth/login-controller.js',
  'js/features/flow-designer/flow-designer.js',
  'js/features/user-view/user-view.js',
  'project-files.json',
  'docs/ARCHITECTURE.md',
  'docs/SECURITY.md',
  'docs/DEPLOYMENT.md',
  'firestore.rules',
  'storage.rules',
  'functions/index.js'
];

const manifestRequired = [
  'index.html',
  'pages/login.html',
  'pages/user-view.html',
  'pages/flow-designer.html',
  'pages/code-view.html',
  'js/core/firebase-app.js',
  'js/core/security.js',
  'js/features/auth/login-controller.js',
  'js/features/flow-designer/flow-designer.js',
  'js/features/user-view/user-view.js',
  'firestore.rules',
  'storage.rules',
  'README.md',
  'docs/ARCHITECTURE.md',
  'docs/SECURITY.md',
  'docs/DEPLOYMENT.md'
];

const forbiddenFiles = [
  'teste-dark-backup.html',
  'pages/code-view2.html',
  'pages/code-vieww.html',
  'read.md',
  'YOUWARE.md',
  'todo.json',
  'jules-scratch/verification/verify_drag_and_drop.py'
];

const errors = [];

for (const file of requiredFiles) {
  try {
    await access(file, constants.R_OK);
  } catch {
    errors.push(`Arquivo obrigatório ausente: ${file}`);
  }
}

for (const file of forbiddenFiles) {
  try {
    await access(file, constants.F_OK);
    errors.push(`Arquivo legado ainda presente: ${file}`);
  } catch {
    // esperado
  }
}

async function collectHtmlFiles(directory = '.') {
  const result = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (['.git', 'node_modules', 'functions'].includes(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await collectHtmlFiles(entryPath));
    else if (entry.name.endsWith('.html')) result.push(entryPath);
  }
  return result;
}

for (const htmlFile of await collectHtmlFiles()) {
  const html = await readFile(htmlFile, 'utf8');
  if (html.includes('lib.youware.com')) errors.push(`Script legado youware encontrado em ${htmlFile}`);
}

const userView = await readFile('pages/user-view.html', 'utf8').catch(() => '');
if (userView.includes('Erro ao carregar pages/user-view.html')) {
  errors.push('pages/user-view.html ainda contém o placeholder quebrado.');
}

const uiEnhancements = await readFile('js/ui-enhancements.js', 'utf8').catch(() => '');
if (!uiEnhancements.includes('__construktorInnerHtmlSanitizerInstalled')) {
  errors.push('Sanitizador global de HTML não está instalado.');
}

const manifest = JSON.parse(await readFile('project-files.json', 'utf8'));
const manifestFiles = new Set(Object.values(manifest).flat());
for (const file of manifestRequired) {
  if (!manifestFiles.has(file)) errors.push(`Arquivo obrigatório ausente do project-files.json: ${file}`);
}

if (errors.length) {
  console.error('\nValidação do projeto falhou:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Estrutura e hardening básico validados com sucesso.');
