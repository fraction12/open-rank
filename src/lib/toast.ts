export const TOAST_EVENT = 'openrank:toast';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastInput {
  type: ToastType;
  title: string;
  message: string;
  durationMs?: number;
  dismissible?: boolean;
}

export interface ToastDetail extends ToastInput {
  id: string;
  durationMs: number;
  dismissible: boolean;
}

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4500,
  info: 4500,
  warning: 6000,
  error: 0,
};

function createToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function showToast(input: ToastInput): void {
  if (typeof window === 'undefined') return;

  const detail: ToastDetail = {
    ...input,
    id: createToastId(),
    durationMs: input.durationMs ?? DEFAULT_DURATION[input.type],
    dismissible: input.dismissible ?? true,
  };

  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail }));
}

export function toastError(title: string, message: string, durationMs = 0): void {
  showToast({ type: 'error', title, message, durationMs });
}

export function toastWarning(title: string, message: string, durationMs = 6000): void {
  showToast({ type: 'warning', title, message, durationMs });
}

export function toastInfo(title: string, message: string, durationMs = 4500): void {
  showToast({ type: 'info', title, message, durationMs });
}

export function toastSuccess(title: string, message: string, durationMs = 4500): void {
  showToast({ type: 'success', title, message, durationMs });
}
