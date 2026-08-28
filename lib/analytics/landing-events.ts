export type LandingEventName =
  | 'landing_hero_cta_click'
  | 'rate_cockpit_view'
  | 'rate_source_select'
  | 'rate_cockpit_interaction'
  | 'register_start'
  | 'register_complete'
  | 'binance_exit_click'
  | 'rate_state_change'
  | 'rate_retry_click';

export type LandingEventProperties = Record<string, string | boolean | undefined>;

const CONTRACT_VERSION = 'landing.v1';

export function trackLandingEvent(
  name: LandingEventName,
  properties: LandingEventProperties = {}
): void {
  if (typeof window === 'undefined') return;

  const detail = { ...properties, contract_version: CONTRACT_VERSION };
  window.dispatchEvent(new CustomEvent(`fintec:${name}`, { detail }));
}
