import { getAuth, getFirebaseNamespace } from './core/firebase-app.js';
import { showError, showLoading, hideLoading } from './ui.js';

let auth = null;
let currentUser = null;
let authReadyPromise = null;
let unsubscribeAuth = null;

function getLoginPath() {
  return window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
}

function handleAuthStateChanged(user) {
  currentUser = user || null;

  if (currentUser) {
    if (window.location.pathname.includes('login.html')) {
      window.location.replace('../index.html');
    }
    return;
  }

  if (!window.location.pathname.includes('login.html')) {
    window.location.replace(getLoginPath());
  }
}

/**
 * Inicializa a autenticação e só resolve depois do primeiro estado do Firebase.
 * Isso elimina a condição de corrida em que main.js verificava o usuário antes
 * de onAuthStateChanged responder.
 */
export async function initAutenticacao() {
  if (authReadyPromise) return authReadyPromise;

  authReadyPromise = (async () => {
    try {
      auth = await getAuth();

      return await new Promise((resolve, reject) => {
        let firstEmission = true;

        unsubscribeAuth = auth.onAuthStateChanged(
          (user) => {
            handleAuthStateChanged(user);
            if (firstEmission) {
              firstEmission = false;
              resolve(currentUser);
            }
          },
          (error) => {
            console.error('Erro no listener de autenticação:', error);
            if (firstEmission) {
              firstEmission = false;
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      authReadyPromise = null;
      console.error('Erro ao inicializar autenticação:', error);
      showError('Erro de Autenticação', 'Não foi possível inicializar o sistema de autenticação.');
      throw error;
    }
  })();

  return authReadyPromise;
}

async function requireAuth() {
  if (!auth) await initAutenticacao();
  return auth;
}

export async function loginComEmailSenha(email, senha) {
  try {
    showLoading('Entrando...');
    const authInstance = await requireAuth();
    const userCredential = await authInstance.signInWithEmailAndPassword(email, senha);
    return { success: true, user: userCredential.user };
  } catch (error) {
    let mensagemErro = 'Ocorreu um erro ao fazer login. Tente novamente.';
    if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(error.code)) {
      mensagemErro = 'Email ou senha incorretos.';
    } else if (error.code === 'auth/too-many-requests') {
      mensagemErro = 'Muitas tentativas de login. Tente novamente mais tarde.';
    } else if (error.code === 'auth/invalid-email') {
      mensagemErro = 'Email inválido.';
    }
    return { success: false, error: mensagemErro };
  } finally {
    hideLoading();
  }
}

export async function loginComGoogle() {
  try {
    showLoading('Conectando ao Google...');
    const authInstance = await requireAuth();
    const firebase = getFirebaseNamespace();
    const provider = new firebase.auth.GoogleAuthProvider();
    const userCredential = await authInstance.signInWithPopup(provider);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Erro no login com Google:', error);
    const message = error.code === 'auth/popup-closed-by-user'
      ? 'O popup de login foi fechado.'
      : 'Ocorreu um erro ao fazer login com Google.';
    return { success: false, error: message };
  } finally {
    hideLoading();
  }
}

export async function iniciarLoginComTelefone(numeroTelefone, containerRecaptcha) {
  try {
    showLoading('Enviando código...');
    const authInstance = await requireAuth();
    const firebase = getFirebaseNamespace();

    const appVerifier = new firebase.auth.RecaptchaVerifier(containerRecaptcha, {
      size: 'normal',
      'expired-callback': () => {
        showError('Tempo Expirado', 'O tempo para verificação expirou. Tente novamente.');
      }
    });

    const confirmationResult = await authInstance.signInWithPhoneNumber(numeroTelefone, appVerifier);
    return { success: true, confirmationResult, appVerifier };
  } catch (error) {
    console.error('Erro no login com telefone:', error);
    let mensagemErro = 'Ocorreu um erro ao enviar o código de verificação.';
    if (error.code === 'auth/invalid-phone-number') mensagemErro = 'Número de telefone inválido. Use o formato +55DDD00000000';
    if (error.code === 'auth/quota-exceeded') mensagemErro = 'Limite de SMS temporariamente excedido. Tente mais tarde.';
    return { success: false, error: mensagemErro };
  } finally {
    hideLoading();
  }
}

export async function confirmarCodigoTelefone(confirmationResult, codigoVerificacao) {
  try {
    showLoading('Verificando código...');
    const userCredential = await confirmationResult.confirm(codigoVerificacao);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Erro na confirmação do código:', error);
    let mensagemErro = 'Ocorreu um erro ao verificar o código.';
    if (error.code === 'auth/invalid-verification-code') mensagemErro = 'Código de verificação inválido.';
    if (error.code === 'auth/code-expired') mensagemErro = 'Código de verificação expirado. Solicite um novo código.';
    return { success: false, error: mensagemErro };
  } finally {
    hideLoading();
  }
}

export async function registrarUsuario(email, senha) {
  try {
    showLoading('Criando conta...');
    const authInstance = await requireAuth();
    const userCredential = await authInstance.createUserWithEmailAndPassword(email, senha);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Erro no registro:', error);
    let mensagemErro = 'Ocorreu um erro ao criar a conta.';
    if (error.code === 'auth/email-already-in-use') mensagemErro = 'Este email já está sendo usado por outra conta.';
    if (error.code === 'auth/weak-password') mensagemErro = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
    if (error.code === 'auth/invalid-email') mensagemErro = 'Email inválido.';
    return { success: false, error: mensagemErro };
  } finally {
    hideLoading();
  }
}

export async function logout() {
  try {
    const authInstance = await requireAuth();
    await authInstance.signOut();
    return { success: true };
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    return { success: false, error: 'Ocorreu um erro ao sair da conta.' };
  }
}

export async function enviarRedefinicaoSenha(email) {
  try {
    showLoading('Enviando email...');
    const authInstance = await requireAuth();
    await authInstance.sendPasswordResetEmail(email);
    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar email de redefinição:', error);
    let mensagemErro = 'Ocorreu um erro ao enviar o email de redefinição.';
    if (error.code === 'auth/user-not-found') mensagemErro = 'Não existe conta com este email.';
    if (error.code === 'auth/invalid-email') mensagemErro = 'Email inválido.';
    return { success: false, error: mensagemErro };
  } finally {
    hideLoading();
  }
}

export function getUsuarioAtual() {
  return currentUser;
}

export function isUsuarioLogado() {
  return currentUser !== null;
}

export function getUsuarioId() {
  return currentUser?.uid ?? null;
}

export function getUsuarioEmail() {
  return currentUser?.email ?? null;
}

export function getUsuarioTelefone() {
  return currentUser?.phoneNumber ?? null;
}

export function getUsuarioNome() {
  return currentUser?.displayName ?? null;
}

export function getUsuarioFoto() {
  return currentUser?.photoURL ?? null;
}

export function disposeAutenticacao() {
  if (typeof unsubscribeAuth === 'function') unsubscribeAuth();
  unsubscribeAuth = null;
  authReadyPromise = null;
  auth = null;
  currentUser = null;
}
