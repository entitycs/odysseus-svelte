import { writable } from 'svelte/store';

export const toast = writable<{
  type: string;
  message: string;
  duration: number;
} | null>(null);

export function showToast(message: string, duration = 1200, type = 'message') {
  toast.set({ type, message, duration });
}
