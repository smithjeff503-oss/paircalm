declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export const tracking = {
  init(measurementId: string) {
    if (typeof window === 'undefined' || !measurementId) return;

    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}', {
        page_path: window.location.pathname,
      });
    `;
    document.head.appendChild(script2);
  },

  pageView(path: string) {
    if (typeof window === 'undefined' || !window.gtag) return;
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (!measurementId) return;

    window.gtag('config', measurementId, {
      page_path: path,
    });
  },

  event(eventName: string, parameters?: Record<string, any>) {
    if (typeof window === 'undefined' || !window.gtag) return;
    window.gtag('event', eventName, parameters);
  },

  trackSignup(method: string) {
    this.event('sign_up', { method });
  },

  trackLogin(method: string) {
    this.event('login', { method });
  },

  trackSubscription(tier: string, value: number) {
    this.event('purchase', {
      transaction_id: Date.now().toString(),
      value,
      currency: 'USD',
      items: [
        {
          item_id: tier,
          item_name: `PairCalm ${tier}`,
          item_category: 'subscription',
          price: value,
          quantity: 1,
        },
      ],
    });
  },

  trackFeatureUse(feature: string) {
    this.event('feature_use', { feature_name: feature });
  },

  trackCheckIn(zone: string) {
    this.event('check_in', { nervous_system_zone: zone });
  },

  trackCrisisAlert(severity: string) {
    this.event('crisis_alert', { severity });
  },

  trackContentPlay(contentTitle: string, category: string) {
    this.event('content_play', {
      content_title: contentTitle,
      content_category: category,
    });
  },

  trackAISession() {
    this.event('ai_coaching_session');
  },

  trackPartnerInvite() {
    this.event('partner_invite_sent');
  },

  trackPartnerAccept() {
    this.event('partner_invite_accepted');
  },

  trackRitualComplete(ritualType: string) {
    this.event('ritual_complete', { ritual_type: ritualType });
  },

  trackConflictResolved(duration: number) {
    this.event('conflict_resolved', { duration_minutes: duration });
  },
};
