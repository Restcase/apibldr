export interface FeedbackApi {
  openSurvey: (id: string) => void;
}
declare global {
  interface Window {
    appzi?: FeedbackApi;
    appziSettings?: {
      portal?: string;
      render?: { type: 'none' };
      ready?: (api: FeedbackApi) => void;
    };
  }
}

// Public widget identifiers, not API credentials. Override them for other sites.
export function feedbackConfig() {
  return {
    portal: (import.meta.env.VITE_APPZI_PORTAL ?? 'qt2PM').trim(),
    survey: (
      import.meta.env.VITE_APPZI_SURVEY ??
      '05aeef10-f2f4-4389-9044-ac2fe42ccd4e'
    ).trim(),
  };
}
let pending: Promise<FeedbackApi> | undefined;
let readyApi: FeedbackApi | undefined;
function loadFeedback(): Promise<FeedbackApi> {
  if (readyApi) return Promise.resolve(readyApi);
  if (window.appzi?.openSurvey) return Promise.resolve(window.appzi);
  if (pending) return pending;
  pending = new Promise<FeedbackApi>((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      script.remove();
      reject(
        new Error(
          'Feedback could not load. Check your connection or reload this page. You can also use GitHub issues.',
        ),
      );
    };
    const timeout = window.setTimeout(fail, 15000);
    window.appziSettings = {
      portal: feedbackConfig().portal,
      render: { type: 'none' },
      ready: (api) => {
        readyApi = api;
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve(api);
      },
    };
    script.src = `https://w.appzi.io/w.js?token=${encodeURIComponent(feedbackConfig().portal)}`;
    script.async = true;
    script.dataset.apibldrFeedback = 'true';
    script.onerror = fail;
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
  return pending;
}
export async function openFeedback() {
  const { portal, survey } = feedbackConfig();
  if (!portal || !survey)
    throw new Error(
      'Feedback is not configured on this site. You can use GitHub issues instead.',
    );
  const api = await loadFeedback();
  api.openSurvey(survey);
}
