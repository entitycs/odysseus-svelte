/**
 * Mobile-specific input handlers
 * Handles mobile keyboard behavior and line break queueing
 */

import {
  countLineBreaks,
  isLineBreakInputEvent,
  isMobileChatInput,
} from './textareaUtils';

/**
 * State for mobile line break queueing
 */
let mobileQueue: {
  prompt: string;
  files: any[];
} | null = null;
let isQueueActive = false;

/**
 * Check if we should queue input from mobile line break
 */
export function shouldQueueFromMobileLineBreak(): boolean {
  if (!isMobileChatInput()) return false;
  const chatForm = document.getElementById('chat-form') as HTMLFormElement;
  if (!chatForm) return false;
  // Check if we're already in a streaming state
  // This is a simplified check - in production you'd use chatModule.hasActiveStream
  const isStreaming = chatForm.dataset?.isStreaming === 'true';
  return !isStreaming && isMobileChatInput();
}

/**
 * Process mobile queued input
 */
export function submitMobileQueuedInput(): void {
  if (!mobileQueue || !isQueueActive) return;

  const ta = document.getElementById('message') as HTMLTextAreaElement;
  if (!ta) return;

  ta.value = mobileQueue.prompt;

  // Trigger form submission
  const form = document.getElementById('chat-form') as HTMLFormElement;
  if (form) {
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
  }

  mobileQueue = null;
  isQueueActive = false;
}

/**
 * Handle mobile line break in input
 */
export function handleMobileLineBreak(
  e: InputEvent,
  previousValue: string,
): boolean {
  if (!isMobileChatInput()) return false;
  if (!shouldQueueFromMobileLineBreak()) return false;

  const currentTarget = e.target as HTMLTextAreaElement;

  const currentValue = currentTarget?.value || '';
  const insertedLineBreak =
    isLineBreakInputEvent(e) ||
    countLineBreaks(currentValue) > countLineBreaks(previousValue);

  if (insertedLineBreak) {
    e.preventDefault();
    e.stopPropagation();

    // Get current files (if file handler is available)
    const files = window.fileHandlerModule?.getPendingRaw?.() || [];

    // Get current prompt
    const prompt = currentValue.replace(/\n+$/g, '');

    mobileQueue = { prompt, files };
    isQueueActive = true;

    // Submit the queued input
    submitMobileQueuedInput();
    return true;
  }

  return false;
}

/**
 * Check if we should queue from mobile Enter key
 */
export function shouldQueueFromMobileEnter(e: KeyboardEvent): boolean {
  if (!isMobileChatInput()) return false;

  // Don't queue if already processing queue
  if (isQueueActive) return false;

  // Allow Enter only on mobile (Shift+Enter or Cmd/Ctrl+Enter on desktop)
  return e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey;
}

/**
 * Sync mobile enter key hint for accessibility
 */
export function syncMobileEnterKeyHint(textarea: HTMLTextAreaElement): void {
  const inputType = textarea.getAttribute('data-mobile-input-hint') || '';
  textarea.setAttribute(
    'aria-label',
    inputType === 'mobile'
      ? 'Message input (newline sends message)'
      : 'Message input',
  );

  if (inputType === 'mobile') {
    // Mobile devices need this hint
    textarea.setAttribute('placeholder', 'Message Odysseus... (newline sends)');
  }
}

/**
 * Restore enter key hint on desktop
 */
export function restoreEnterKeyHint(textarea: HTMLTextAreaElement): void {
  textarea.setAttribute('aria-label', 'Message input');
  textarea.setAttribute('placeholder', 'Message Odysseus...');
}

/**
 * Handle ghost autocomplete integration
 */
export function handleGhostAutocomplete(e: KeyboardEvent): boolean {
  if (window._ghostAutocomplete?.isActive?.()) {
    e.preventDefault();
    e.stopPropagation();
    window._ghostAutocomplete.accept();
    return true;
  }
  return false;
}

/**
 * Check if foreground chat is busy
 * Simplified check - would use chatModule in production
 */
export function isForegroundChatBusy(): boolean {
  const chatForm = document.getElementById('chat-form');
  if (!chatForm) return false;

  // Check for active stream indicators
  const streamingIndicator = document.querySelector(
    '.chat-streaming-indicator.active',
  );
  const hasActiveStream = streamingIndicator !== null;

  return hasActiveStream;
}

/**
 * Clear mobile queue
 */
export function clearMobileQueue(): void {
  mobileQueue = null;
  isQueueActive = false;
}

/**
 * Reset mobile queue state
 */
export function resetMobileQueueState(): void {
  mobileQueue = null;
  isQueueActive = false;
}
