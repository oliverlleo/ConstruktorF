import {
  initAutenticacao,
  loginComEmailSenha,
  loginComGoogle,
  iniciarLoginComTelefone,
  confirmarCodigoTelefone,
  registrarUsuario,
  enviarRedefinicaoSenha
} from '../../autenticacao.js';
import { showError, showSuccess } from '../../ui.js';

let confirmationResult = null;
let recaptchaVerifier = null;

function byId(id) {
  return document.getElementById(id);
}

function showPanel(panelId) {
  document.querySelectorAll('.notion-auth-panel').forEach((panel) => {
    const isTarget = panel.id === panelId;
    panel.classList.toggle('active', isTarget);
    panel.style.display = isTarget ? 'block' : 'none';
  });
}

function activateTab(tabName) {
  document.querySelectorAll('.notion-auth-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  showPanel(`content-${tabName}`);
}

function setupTabs() {
  document.querySelectorAll('.notion-auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
  });
}

async function handleEmailLogin() {
  const email = byId('login-email')?.value.trim();
  const password = byId('login-password')?.value ?? '';
  if (!email || !password) return showError('Campos obrigatórios', 'Preencha email e senha.');

  const result = await loginComEmailSenha(email, password);
  if (!result.success) showError('Erro no login', result.error);
}

async function handleGoogleLogin() {
  const result = await loginComGoogle();
  if (!result.success) showError('Erro no login', result.error);
}

async function handleRegister() {
  const email = byId('register-email')?.value.trim();
  const password = byId('register-password')?.value ?? '';
  const confirmPassword = byId('register-confirm-password')?.value ?? '';

  if (!email || !password || !confirmPassword) {
    return showError('Campos obrigatórios', 'Preencha todos os campos.');
  }
  if (password !== confirmPassword) {
    return showError('Senhas diferentes', 'As senhas não coincidem.');
  }

  const result = await registrarUsuario(email, password);
  if (!result.success) showError('Erro no registro', result.error);
}

function resetRecaptcha() {
  try {
    recaptchaVerifier?.clear?.();
  } catch (error) {
    console.warn('Não foi possível limpar o reCAPTCHA:', error);
  }
  recaptchaVerifier = null;
  const container = byId('recaptcha-container');
  if (container) container.textContent = '';
}

async function handleSendPhoneCode() {
  const phoneNumber = byId('phone-number')?.value.trim();
  if (!phoneNumber) return showError('Número inválido', 'Digite o número com código do país.');

  resetRecaptcha();
  const result = await iniciarLoginComTelefone(phoneNumber, 'recaptcha-container');
  if (!result.success) return showError('Erro no telefone', result.error);

  confirmationResult = result.confirmationResult;
  recaptchaVerifier = result.appVerifier;
  byId('phone-step-1')?.classList.add('hidden');
  byId('phone-step-2')?.classList.remove('hidden');
  document.querySelector('.notion-code-input[data-index="1"]')?.focus();
  showSuccess('Código enviado!', 'Digite o código de verificação recebido por SMS.');
}

async function handleVerifyPhoneCode() {
  const code = [...document.querySelectorAll('.notion-code-input')]
    .map((input) => input.value.trim())
    .join('');

  if (code.length !== 6 || !confirmationResult) {
    return showError('Código inválido', 'Digite os 6 dígitos do código.');
  }

  const result = await confirmarCodigoTelefone(confirmationResult, code);
  if (!result.success) showError('Erro na verificação', result.error);
}

async function handlePasswordRecovery() {
  const email = byId('recovery-email')?.value.trim();
  if (!email) return showError('Email obrigatório', 'Digite o seu email.');

  const result = await enviarRedefinicaoSenha(email);
  if (result.success) {
    showSuccess('Email enviado', 'Confira sua caixa de entrada para redefinir a senha.');
    activateTab('login');
  } else {
    showError('Erro na recuperação', result.error);
  }
}

function setupPhoneInputs() {
  const inputs = [...document.querySelectorAll('.notion-code-input')];
  inputs.forEach((input, index) => {
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('autocomplete', index === 0 ? 'one-time-code' : 'off');
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 1);
      if (input.value && inputs[index + 1]) inputs[index + 1].focus();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && !input.value && inputs[index - 1]) inputs[index - 1].focus();
    });
    input.addEventListener('paste', (event) => {
      const digits = event.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, 6) || '';
      if (!digits) return;
      event.preventDefault();
      digits.split('').forEach((digit, digitIndex) => {
        if (inputs[digitIndex]) inputs[digitIndex].value = digit;
      });
      inputs[Math.min(digits.length, inputs.length) - 1]?.focus();
    });
  });
}

function setupEnterHandlers() {
  byId('login-password')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handleEmailLogin();
  });
  byId('register-confirm-password')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handleRegister();
  });
  byId('recovery-email')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handlePasswordRecovery();
  });
}

function setupEvents() {
  setupTabs();
  setupPhoneInputs();
  setupEnterHandlers();

  byId('google-login')?.addEventListener('click', handleGoogleLogin);
  byId('email-login-btn')?.addEventListener('click', (event) => {
    event.preventDefault();
    handleEmailLogin();
  });
  byId('register-btn')?.addEventListener('click', (event) => {
    event.preventDefault();
    handleRegister();
  });

  byId('phone-login')?.addEventListener('click', () => {
    showPanel('phone-verification-panel');
    byId('phone-step-1')?.classList.remove('hidden');
    byId('phone-step-2')?.classList.add('hidden');
  });
  byId('send-code-btn')?.addEventListener('click', handleSendPhoneCode);
  byId('resend-code-btn')?.addEventListener('click', handleSendPhoneCode);
  byId('verify-code-btn')?.addEventListener('click', handleVerifyPhoneCode);

  byId('forgot-password')?.addEventListener('click', (event) => {
    event.preventDefault();
    showPanel('password-recovery-panel');
  });
  byId('send-recovery-btn')?.addEventListener('click', handlePasswordRecovery);

  byId('back-to-login')?.addEventListener('click', () => {
    resetRecaptcha();
    activateTab('login');
  });
  byId('back-to-login-from-recovery')?.addEventListener('click', () => activateTab('login'));
}

async function initLoginPage() {
  try {
    await initAutenticacao();
    setupEvents();
    window.lucide?.createIcons?.();
  } catch (error) {
    console.error('Falha ao inicializar a página de login:', error);
  }
}

document.addEventListener('DOMContentLoaded', initLoginPage);
