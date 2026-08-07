const BLOCKED_TAGS = new Set(['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'META', 'BASE']);
const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'xlink:href']);
const SAFE_DATA_IMAGE = /^data:image\/(png|gif|jpe?g|webp);base64,/i;

function isUnsafeUrl(value) {
  const normalized = String(value || '').trim().replace(/[\u0000-\u001F\u007F-\u009F\s]+/g, '').toLowerCase();
  if (normalized.startsWith('javascript:') || normalized.startsWith('vbscript:')) return true;
  if (normalized.startsWith('data:') && !SAFE_DATA_IMAGE.test(normalized)) return true;
  return false;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function sanitizeHtml(html, nativeSetter = null, nativeGetter = null) {
  if (typeof document === 'undefined') return escapeHtml(html);

  const template = document.createElement('template');
  if (nativeSetter) nativeSetter.call(template, String(html ?? ''));
  else template.innerHTML = String(html ?? '');

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

  if (nativeGetter) return nativeGetter.call(template);
  return template.innerHTML;
}

export function installInnerHtmlSanitizer() {
  if (typeof Element === 'undefined' || window.__construktorInnerHtmlSanitizerInstalled) return;

  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  if (!descriptor?.get || !descriptor?.set) return;

  Object.defineProperty(Element.prototype, 'innerHTML', {
    configurable: descriptor.configurable,
    enumerable: descriptor.enumerable,
    get: descriptor.get,
    set(value) {
      const sanitized = sanitizeHtml(value, descriptor.set, descriptor.get);
      descriptor.set.call(this, sanitized);
    }
  });

  window.__construktorInnerHtmlSanitizerInstalled = true;
}

export function setText(element, value) {
  if (element) element.textContent = String(value ?? '');
  return element;
}

export function setSafeUrl(element, attributeName, value, fallback = '') {
  if (!element) return element;
  const safeValue = isUnsafeUrl(value) ? fallback : String(value ?? fallback);
  if (safeValue) element.setAttribute(attributeName, safeValue);
  else element.removeAttribute(attributeName);
  return element;
}

export function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = String(options.text ?? '');
  if (options.attributes) {
    for (const [name, value] of Object.entries(options.attributes)) {
      if (value === undefined || value === null) continue;
      if (URL_ATTRIBUTES.has(name.toLowerCase())) setSafeUrl(element, name, value);
      else element.setAttribute(name, String(value));
    }
  }
  return element;
}
