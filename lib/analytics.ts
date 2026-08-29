import { captureStudyEvent } from './studyActivity';

declare global { interface Window { gtag?: (...args: unknown[]) => void; } }

export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  // Local study state is product functionality, not third-party analytics.
  // It is recorded on-device even when GA consent is absent.
  try { captureStudyEvent(event, params); } catch {}
  try { window.gtag?.('event', event, params); } catch {}
}

export function trackVirtualPage(view: string, lesson: number) {
  if (typeof window === 'undefined') return;
  const pagePath = `${location.pathname}?lesson=${lesson}&view=${encodeURIComponent(view)}`;
  track('page_view', {
    page_title: `The Nihongo Vibes · ${view} · Lesson ${lesson}`,
    page_location: location.origin + pagePath,
    page_path: pagePath,
    section_name: view,
    lesson_number: lesson,
  });
}

export function trackError(errorType: string, message: unknown) {
  const clean = String(message ?? 'unknown').replace(/[\r\n]+/g, ' ').slice(0, 160);
  track('app_error', { error_type: errorType, error_message: clean });
}
