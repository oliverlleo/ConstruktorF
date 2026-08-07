const STORAGE_KEY = 'construktor-dark-mode';
const THEME_STYLESHEET_ID = 'construktor-theme-stylesheet';
const THEME_SWITCHER_ID = 'construktor-theme-switcher';

function getStoredPreference() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'true') return true;
    if (value === 'false') return false;
  } catch {
    // localStorage indisponível
  }

  // O tema inicial é deliberadamente claro. Depois da primeira escolha,
  // a preferência do Construktor passa a ser a única fonte de verdade.
  return false;
}

function persistPreference(isDark) {
  try {
    localStorage.setItem(STORAGE_KEY, String(isDark));
  } catch {
    // preferência apenas em memória
  }
}

function ensureThemeStylesheet() {
  if (document.getElementById(THEME_STYLESHEET_ID)) return;

  const link = document.createElement('link');
  link.id = THEME_STYLESHEET_ID;
  link.rel = 'stylesheet';
  link.href = new URL('../../css/theme.css', import.meta.url).href;
  document.head.appendChild(link);
}

function configureTailwindDarkMode() {
  try {
    if (!window.tailwind) return;
    const currentConfig = window.tailwind.config || {};
    window.tailwind.config = { ...currentConfig, darkMode: 'class' };
  } catch (error) {
    console.warn('Não foi possível ajustar o modo escuro do Tailwind:', error);
  }
}

function updateToggle(toggle, isDark) {
  toggle.setAttribute('aria-pressed', String(isDark));
  toggle.setAttribute('title', isDark ? 'Usar modo claro' : 'Usar modo escuro');
  toggle.querySelectorAll('.fa-sun, [data-theme-icon="sun"]').forEach((icon) => icon.classList.toggle('hidden', isDark));
  toggle.querySelectorAll('.fa-moon, [data-theme-icon="moon"]').forEach((icon) => icon.classList.toggle('hidden', !isDark));
}

function updateExplicitSwitcher(isDark) {
  const switcher = document.getElementById(THEME_SWITCHER_ID);
  if (!switcher) return;

  switcher.querySelectorAll('[data-theme-option]').forEach((button) => {
    const selected = button.dataset.themeOption === (isDark ? 'dark' : 'light');
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function createExplicitSwitcher(manager) {
  if (!document.body || document.getElementById(THEME_SWITCHER_ID)) return;

  const switcher = document.createElement('div');
  switcher.id = THEME_SWITCHER_ID;
  switcher.className = 'construktor-theme-switcher';
  switcher.setAttribute('role', 'group');
  switcher.setAttribute('aria-label', 'Selecionar tema');

  const lightButton = document.createElement('button');
  lightButton.type = 'button';
  lightButton.dataset.themeOption = 'light';
  lightButton.className = 'construktor-theme-option';
  lightButton.setAttribute('aria-label', 'Usar modo claro');
  lightButton.innerHTML = '<span aria-hidden="true">☀</span><span>Claro</span>';

  const darkButton = document.createElement('button');
  darkButton.type = 'button';
  darkButton.dataset.themeOption = 'dark';
  darkButton.className = 'construktor-theme-option';
  darkButton.setAttribute('aria-label', 'Usar modo escuro');
  darkButton.innerHTML = '<span aria-hidden="true">🌙</span><span>Escuro</span>';

  switcher.append(lightButton, darkButton);
  switcher.addEventListener('click', (event) => {
    const button = event.target.closest('[data-theme-option]');
    if (!button) return;
    manager.setTheme(button.dataset.themeOption === 'dark');
  });

  document.body.appendChild(switcher);
  updateExplicitSwitcher(manager.isDark);
}

export class ThemeManager {
  constructor() {
    this.isDark = getStoredPreference();
    this.observer = null;
  }

  apply(isDark = this.isDark, persist = false) {
    this.isDark = Boolean(isDark);
    document.documentElement.classList.toggle('dark', this.isDark);
    document.documentElement.dataset.theme = this.isDark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = this.isDark ? 'dark' : 'light';

    document.querySelectorAll('.theme-toggle, #theme-toggle, #theme-toggle-header').forEach((toggle) => updateToggle(toggle, this.isDark));
    updateExplicitSwitcher(this.isDark);

    if (persist) persistPreference(this.isDark);
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { isDark: this.isDark, theme: this.isDark ? 'dark' : 'light' } }));
  }

  setTheme(isDark) {
    this.apply(Boolean(isDark), true);
  }

  toggle() {
    this.setTheme(!this.isDark);
  }

  bind() {
    document.querySelectorAll('.theme-toggle, #theme-toggle, #theme-toggle-header').forEach((toggle) => {
      if (toggle.dataset.themeBound === 'true') return;
      toggle.dataset.themeBound = 'true';
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.toggle();
      });
    });
  }

  init() {
    ensureThemeStylesheet();
    configureTailwindDarkMode();
    this.apply(this.isDark, false);
    this.bind();
    createExplicitSwitcher(this);

    this.observer = new MutationObserver(() => {
      this.bind();
      updateExplicitSwitcher(this.isDark);
    });
    this.observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}

const manager = new ThemeManager();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => manager.init(), { once: true });
else manager.init();

window.construktorTheme = manager;
