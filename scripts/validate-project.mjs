import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const requiredFiles = [
  'index.html',
  'pages/login.html',
  'pages/user-view.html',
  'pages/flow-designer.html',
  'js/main.js',
  'js/autenticacao.js',
  'js/database.js',
  'js/core/firebase-app.js',
  'js/core/security.js',
  'js/features/auth/login-controller.js',
  'js/features/flow-designer/flow-designer.js',
  'js/features/user-view/user-view.js',
  'firestore.rules',
  'storage.rules',
  'functions/index.js'
];

const forbiddenFiles = [
  'teste-dark-backup.html',
  'pages/code-view2.html',
  'pages/code-vieww.html',
  'read.md',
  'todo.json'
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

const userView = await readFile('pages/user-view.html', 'utf8').catch(() => '');
if (userView.includes('Erro ao carregar pages/user-view.html')) {
  errors.push('pages/user-view.html ainda contém o placeholder quebrado.');
}

const uiEnhancements = await readFile('js/ui-enhancements.js', 'utf8').catch(() => '');
if (!uiEnhancements.includes('__construktorInnerHtmlSanitizerInstalled')) {
  errors.push('Sanitizador global de HTML não está instalado.');
}

if (errors.length) {
  console.error('\nValidação do projeto falhou:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Estrutura e hardening básico validados com sucesso.');
