/**
 * Keyboard event handlers for message input
 * Handles Enter key submission and other shortcuts
 */

import { shouldQueueFromMobileEnter, isForegroundChatBusy, handleGhostAutocomplete } from './mobileHandlers';
import {isMobileChatInput } from './textareaUtils';
/**
 * Handle Enter key press for submission
 */
export function handleEnterKey(e: KeyboardEvent, value: string): boolean {
  // If ghost autocomplete is active, accept suggestion instead of submitting
  if (handleGhostAutocomplete(e)) {
    return true;
  }

  // Check if we should queue from mobile
  if (shouldQueueFromMobileEnter(e)) {
    // On mobile, Enter submits directly (not Shift+Enter)
    e.preventDefault();
    e.stopPropagation();

    // Check if already submitting
    if (isForegroundChatBusy() && value && value.trim()) {
      // If already busy, try to queue
      const form = document.getElementById('chat-form') as HTMLFormElement;
      if (form) {
        window.__odysseusQueueStreamingSubmit = Date.now();
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    } else {
      // Normal submission
      const form = document.getElementById('chat-form') as HTMLFormElement;
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }
    return true;
  }

  // Desktop: Enter submits unless Shift+Enter or composing
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    e.stopPropagation();

    const form = document.getElementById('chat-form') as HTMLFormElement;
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
    return true;
  }

  return false;
}

/**
 * Handle Escape key for closing modals
 */
export function handleEscapeKey(e: KeyboardEvent): boolean {
  if (e.key !== 'Escape') return false;

  // Close model picker
  const menu = document.getElementById('model-picker-menu');
  if (menu && !menu.classList.contains('hidden')) {
    e.preventDefault();
    e.stopPropagation();
    menu.classList.add('hidden');
    return true;
  }

  return false;
}

/**
 * Check if we need to use direct form submission
 */
export function shouldUseDirectSubmit(): boolean {
  const form = document.getElementById('chat-form') as HTMLFormElement;
  return form !== null;
}

/**
 * Submit form directly
 */
export function submitFormDirectly(formId: string): void {
  const form = document.getElementById(formId) as HTMLFormElement;
  if (form) {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
}

/**
 * Handle text composition end (IME composition)
 */
export function handleCompositionEnd(e: CompositionEvent, originalValue: string): string {
  // This is called after composition completes
  // Return the original value to ensure proper behavior
  return originalValue;
}

/**
 * Handle paste event for auto-resize
 */
export function handlePaste(e: ClipboardEvent, textarea: HTMLTextAreaElement): void {
  setTimeout(() => {
    // Force auto-resize after paste
    if (window.autoResize) {
      window.autoResize(textarea);
    }
  }, 1);
}

/**
 * Handle text selection change
 */
export function handleSelectionChange(textarea: HTMLTextAreaElement): void {
  // Could be used for ghost text overlay syncing
}

/**
 * Handle focus change for mobile keyboard management
 */
export function handleFocusChange(isFocused: boolean, textarea: HTMLTextAreaElement): void {
  if (isFocused) {
    // Restore enter key hint on desktop
    if (!isMobileChatInput()) {
      // This would be handled by a Svelte action
    }
  } else {
    // Handle blur refocus for mobile
    if (isMobileChatInput()) {
      // Could be used for the refocus logic in onMount
    }
  }
}
