const STORAGE_KEY = 'construktor-dark-mode';

function getStoredPreference() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'true') return true;
    if (value === 'false') return false;
  } catch {
    // localStorage indisponível
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function persistPreference(isDark) {
  try {
    localStorage.setItem(STORAGE_KEY, String(isDark));
  } catch {
    // preferência apenas em memória
  }
}

function updateToggle(toggle, isDark) {
  toggle.setAttribute('aria-pressed', String(isDark));
  toggle.setAttribute('title', isDark ? 'Usar modo claro' : 'Usar modo escuro');
  toggle.querySelectorAll('.fa-sun, [data-theme-icon="sun"]').forEach((icon) => icon.classList.toggle('hidden', isDark));
  toggle.querySelectorAll('.fa-moon, [data-theme-icon="moon"]').forEach((icon) => icon.classList.toggle('hidden', !isDark));
}

export class ThemeManager {
  constructor() {
    this.isDark = getStoredPreference();
  }

  apply(isDark = this.isDark, persist = false) {
    this.isDark = Boolean(isDark);
    document.documentElement.classList.toggle('dark', this.isDark);
    document.documentElement.style.colorScheme = this.isDark ? 'dark' : 'light';
    document.querySelectorAll('.theme-toggle, #theme-toggle, #theme-toggle-header').forEach((toggle) => updateToggle(toggle, this.isDark));
    if (persist) persistPreference(this.isDark);
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { isDark: this.isDark } }));
  }

  toggle() {
    this.apply(!this.isDark, true);
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
    this.apply(this.isDark, false);
    this.bind();
    new MutationObserver(() => this.bind()).observe(document.documentElement, { childList: true, subtree: true });
  }
}

const manager = new ThemeManager();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => manager.init());
else manager.init();

window.construktorTheme = manager;
