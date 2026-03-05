type FrontendAuthBypassOptions = {
  nodeEnv?: string;
  bypassFlag?: string;
};

const TRUTHY_VALUES = new Set(['1', 'true', 'yes']);

export function isFrontendAuthBypassEnabled(
  options: FrontendAuthBypassOptions = {}
): boolean {
  const nodeEnv = (options.nodeEnv ?? process.env.NODE_ENV ?? '')
    .trim()
    .toLowerCase();

  if (nodeEnv === 'production') {
    return false;
  }

  const bypassFlag = (
    options.bypassFlag ??
    process.env.FRONTEND_AUTH_BYPASS ??
    ''
  )
    .trim()
    .toLowerCase();

  return TRUTHY_VALUES.has(bypassFlag);
}
