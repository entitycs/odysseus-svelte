/**
 * Textarea utility functions extracted from ui.js
 * Replaces the need for direct DOM manipulation in vanilla JS
 */

/**
 * Auto-resize textarea based on content
 * Adapted from uiModule.autoResize in web/lib/legacy/ui.js
 */
const clones = new WeakMap<HTMLTextAreaElement, HTMLTextAreaElement>();

export function autoResize(textarea: HTMLTextAreaElement, options?: {
  maxHeight?: number;
  lineHeight?: number;
}) {
  let clone = clones.get(textarea);
  if (!clone) {
    clone = textarea.cloneNode(false) as HTMLTextAreaElement;

    clone.style.cssText = getComputedStyle(textarea).cssText;
    clone.style.position = 'absolute';
    clone.style.visibility = 'hidden';
    clone.style.height = '0';
    clone.style.transition = 'none';
    clone.style.overflow = 'hidden';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '-1';
    textarea.parentNode?.appendChild(clone);
    textarea._resizeClone = clone;// to keep ui.js from creating duplicate w/ message id
    clones.set(textarea, clone);
  }
  clone.id = textarea.id;// temporarily, let two elements w/ same id exist

  const lineHeight =
    options?.lineHeight ||
    parseInt(getComputedStyle(textarea).lineHeight) ||
    24;

  const maxHeight =
    options?.maxHeight ||
    (window.innerWidth <= 768 ? 150 : lineHeight * 8);

  clone.style.width = textarea.offsetWidth + 'px';
  clone.value = textarea.value;
  clone.style.height = '0';

  const newHeight = Math.min(Math.max(clone.scrollHeight, lineHeight), maxHeight);

  textarea.style.height = `${newHeight}px`;
  textarea.style.overflow = newHeight >= maxHeight ? 'auto' : 'hidden';

  clone.id = textarea.id + '-resize-clone';// in case #id is a css selector, remove it after calculations
}

/**
 * Check if input event indicates a line break was added
 * Adapted from _isLineBreakInputEvent in chat.js
 */
export function isLineBreakInputEvent(e: InputEvent): boolean {
  return e.data === '/n' || e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph';
}

/**
 * Count line breaks in a string
 */
export function countLineBreaks(str: string): number {
  return (str.match(/\n/g) || []).length;
}

/**
 * Detect if we're on mobile
 * Adapted from _isMobileChatInput in chat.js
 */
export function isMobileChatInput(): boolean {
  return window.innerWidth <= 768;
}

/**
 * Get element by ID (re-export of uiModule.el)
 * Used for backward compatibility with existing code
 */
export function el(id: string): HTMLElement | null {
  return document.getElementById(id);
}

/**
 * Debounce function
 * Adapted from uiModule.debounce
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, wait: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Show toast notification
 * Adapted from uiModule.showToast
 */
export function showToast(message: string, options?: {
  duration?: number;
  action?: string;
}) {
  const toastEl = document.getElementById('toast');
  if (!toastEl) {
    console.warn('Toast element not found');
    return;
  }

  toastEl.textContent = message;
  toastEl.classList.remove('error');

  const duration = options?.duration || 1200;
  const existingTimer = toastEl._hideTimer as any;
  if (existingTimer) clearTimeout(existingTimer);

  toastEl._hideTimer = setTimeout(() => {
    toastEl.classList.add('exiting');
    toastEl.classList.remove('show');
  }, duration);
}

/**
 * Scroll to bottom of chat history
 * Adapted from uiModule.scrollHistory
 */
export function scrollChatHistory() {
  const box = document.getElementById('chat-history');
  if (!box) return;

  const target = box.scrollHeight - box.clientHeight;
  const current = box.scrollTop;
  const diff = target - current;

  if (diff > 300) return; // User scrolled up, don't force scroll

  if (diff <= 1) {
    box.scrollTop = target;
    return;
  }

  const factor = window.innerWidth <= 768 ? 0.4 : 0.2;
  box.scrollTop = current + diff * factor;
}
