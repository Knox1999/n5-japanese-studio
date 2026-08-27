declare global { interface Window { gtag?: (...args: any[]) => void; } }

export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  try { window.gtag?.('event', event, params); } catch {}
}

export function trackError(errorType: string, message: unknown) {
  const clean = String(message ?? 'unknown').replace(/[\r\n]+/g, ' ').slice(0, 160);
  track('app_error', { error_type: errorType, error_message: clean });
}
