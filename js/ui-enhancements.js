// Bootstrap de segurança e melhorias globais de UI.
// Mantido como script clássico porque index.html o carrega diretamente.
(function bootstrapConstruktorUi() {
  'use strict';

  const BLOCKED_TAGS = new Set(['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'META', 'BASE']);
  const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'xlink:href']);

  function isUnsafeUrl(value) {
    const normalized = String(value || '')
      .trim()
      .replace(/[\u0000-\u001F\u007F-\u009F\s]+/g, '')
      .toLowerCase();
    return normalized.startsWith('javascript:') ||
      normalized.startsWith('vbscript:') ||
      (normalized.startsWith('data:') && !normalized.startsWith('data:image/'));
  }

  function installInnerHtmlSanitizer() {
    if (window.__construktorInnerHtmlSanitizerInstalled) return;

    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (!descriptor?.get || !descriptor?.set) return;

    const nativeGet = descriptor.get;
    const nativeSet = descriptor.set;

    function sanitize(value) {
      const template = document.createElement('template');
      nativeSet.call(template, String(value ?? ''));

      const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
      const elements = [];
      while (walker.nextNode()) elements.push(walker.currentNode);

      for (const element of elements) {
        if (BLOCKED_TAGS.has(element.tagName)) {
          element.remove();
          continue;
        }

        for (const attribute of [...element.attributes]) {
          const name = attribute.name.toLowerCase();
          if (name.startsWith('on') || name === 'srcdoc') {
            element.removeAttribute(attribute.name);
            continue;
          }
          if (URL_ATTRIBUTES.has(name) && isUnsafeUrl(attribute.value)) {
            element.removeAttribute(attribute.name);
          }
        }
      }

      return nativeGet.call(template);
    }

    Object.defineProperty(Element.prototype, 'innerHTML', {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
      get: nativeGet,
      set(value) {
        nativeSet.call(this, sanitize(value));
      }
    });

    window.__construktorInnerHtmlSanitizerInstalled = true;
  }

  function removeLegacyInjectedScripts(root = document) {
    root.querySelectorAll?.('script[src*="lib.youware.com"]').forEach((script) => script.remove());
  }

  function watchLegacyScripts() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches?.('script[src*="lib.youware.com"]')) node.remove();
          removeLegacyInjectedScripts(node);
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function improveExternalLinks() {
    document.querySelectorAll('a[target="_blank"]').forEach((link) => {
      const rel = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
      rel.add('noopener');
      rel.add('noreferrer');
      link.setAttribute('rel', [...rel].join(' '));
    });
  }

  function preventDuplicateSubmissions() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-prevent-double-click]');
      if (!button || button.disabled) return;
      button.disabled = true;
      window.setTimeout(() => { button.disabled = false; }, 1200);
    });
  }

  installInnerHtmlSanitizer();
  removeLegacyInjectedScripts();
  watchLegacyScripts();

  document.addEventListener('DOMContentLoaded', () => {
    removeLegacyInjectedScripts();
    improveExternalLinks();
    preventDuplicateSubmissions();
  });
})();
