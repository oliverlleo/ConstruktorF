const STORAGE_KEY = 'construktor-dark-mode';
const THEME_SWITCHER_ID = 'construktor-theme-switcher';

function getStoredPreference() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'true') return true;
    if (value === 'false') return false;
  } catch {
    // localStorage indisponível
  }

  // Mantém um estado inicial previsível e não depende do tema do sistema.
  return false;
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

function styleSwitcher(switcher, isDark) {
  switcher.style.position = 'fixed';
  switcher.style.right = '18px';
  switcher.style.bottom = '18px';
  switcher.style.zIndex = '9999';
  switcher.style.display = 'inline-flex';
  switcher.style.alignItems = 'center';
  switcher.style.gap = '4px';
  switcher.style.padding = '4px';
  switcher.style.border = `1px solid ${isDark ? '#475569' : '#e2e8f0'}`;
  switcher.style.borderRadius = '999px';
  switcher.style.background = isDark ? 'rgba(30, 41, 59, .96)' : 'rgba(255, 255, 255, .96)';
  switcher.style.boxShadow = isDark ? '0 10px 30px rgba(0,0,0,.38)' : '0 10px 30px rgba(15,23,42,.18)';
  switcher.style.backdropFilter = 'blur(12px)';
}

function styleOption(button, selected, isDark) {
  button.style.display = 'inline-flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.gap = '6px';
  button.style.minHeight = '34px';
  button.style.padding = '7px 11px';
  button.style.border = '0';
  button.style.borderRadius = '999px';
  button.style.font = 'inherit';
  button.style.fontSize = '12px';
  button.style.fontWeight = '700';
  button.style.lineHeight = '1';
  button.style.cursor = 'pointer';
  button.style.background = selected ? '#4f46e5' : 'transparent';
  button.style.color = selected ? '#fff' : (isDark ? '#cbd5e1' : '#475569');
}

function updateExplicitSwitcher(isDark) {
  const switcher = document.getElementById(THEME_SWITCHER_ID);
  if (!switcher) return;

  styleSwitcher(switcher, isDark);
  switcher.querySelectorAll('[data-theme-option]').forEach((button) => {
    const selected = button.dataset.themeOption === (isDark ? 'dark' : 'light');
    button.setAttribute('aria-pressed', String(selected));
    styleOption(button, selected, isDark);
  });
}

function createOption(label, icon, value) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.themeOption = value;
  button.setAttribute('aria-label', `Usar modo ${label.toLowerCase()}`);

  const iconSpan = document.createElement('span');
  iconSpan.setAttribute('aria-hidden', 'true');
  iconSpan.textContent = icon;

  const labelSpan = document.createElement('span');
  labelSpan.textContent = label;

  button.append(iconSpan, labelSpan);
  return button;
}

function createExplicitSwitcher(manager) {
  if (!document.body || document.getElementById(THEME_SWITCHER_ID)) return;

  const switcher = document.createElement('div');
  switcher.id = THEME_SWITCHER_ID;
  switcher.setAttribute('role', 'group');
  switcher.setAttribute('aria-label', 'Selecionar tema');

  switcher.append(
    createOption('Claro', '☀', 'light'),
    createOption('Escuro', '☾', 'dark')
  );

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
    document.documentElement.style.colorScheme = this.isDark ? 'dark' : 'light';

    document.querySelectorAll('.theme-toggle, #theme-toggle, #theme-toggle-header').forEach((toggle) => updateToggle(toggle, this.isDark));
    updateExplicitSwitcher(this.isDark);

    if (persist) persistPreference(this.isDark);
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { isDark: this.isDark } }));
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
    // IMPORTANTE: não altera window.tailwind.config, não injeta CSS global e
    // não sobrescreve classes utilitárias. O tema só alterna a classe .dark.
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
