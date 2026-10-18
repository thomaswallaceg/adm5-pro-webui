export interface Toast {
  id: number;
  message: string;
}

const TOAST_DURATION_MS = 4000;
let nextId = 0;

export const toasts = $state<Toast[]>([]);

export function notify(message: string): void {
  const id = nextId++;
  toasts.push({ id, message });
  setTimeout(() => {
    const index = toasts.findIndex((toast) => toast.id === id);
    if (index !== -1) {
      toasts.splice(index, 1);
    }
  }, TOAST_DURATION_MS);
}
