const DEFAULT_TEST_USER_EMAIL_PATTERNS = [
  'test@fintec.com',
  'eval-fixture-*@fintec.local',
  'perf-test-*@*',
  // RFC 6761 reserves .test exclusively for testing.
  '*@*.test',
  // RFC 2606 reserves example.com for documentation and examples.
  '*@example.com',
  // Generated CI prefixes identify synthetic test users.
  'jest-test-*@*',
  'debug-*@*',
  'fixture-*@*',
  'uhook-*@*',
  'fintec-smoke+*@*',
  // The owner demo account is used for screenshots.
  'demo.screenshots@fintec.app',
] as const;
const MAX_PATTERN_LENGTH = 200;
const MAX_PATTERN_LIST_LENGTH = 1000;
const SAFE_PATTERN = /^[a-z0-9.!#$%&'*+\-/=?^_`{|}~@%*\[\](){}|]+$/i;
let cachedRaw: string | undefined;
let cachedPatterns: string[] | undefined;
function warnMalformed(): void {
  console.warn(
    '[TestUserMatcher] invalid TEST_USER_EMAIL_PATTERNS; using reviewed defaults'
  );
}
function parsePatterns(): string[] {
  const raw = process.env.TEST_USER_EMAIL_PATTERNS;
  if (cachedRaw === raw && cachedPatterns) return cachedPatterns;
  if (raw === undefined) {
    cachedRaw = raw;
    cachedPatterns = [...DEFAULT_TEST_USER_EMAIL_PATTERNS];
    return cachedPatterns;
  }
  const patterns = raw.split(',');
  if (
    !raw ||
    raw.length > MAX_PATTERN_LIST_LENGTH ||
    patterns.some(
      (pattern) =>
        !pattern ||
        pattern.length > MAX_PATTERN_LENGTH ||
        !SAFE_PATTERN.test(pattern)
    )
  ) {
    warnMalformed();
    cachedRaw = raw;
    cachedPatterns = [...DEFAULT_TEST_USER_EMAIL_PATTERNS];
    return cachedPatterns;
  }
  cachedRaw = raw;
  cachedPatterns = patterns;
  return patterns;
}
export function getTestUserPatterns(): string[] {
  return parsePatterns();
}
function patternToRegex(pattern: string): RegExp {
  return new RegExp(
    `^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/[\*%]/g, '.*')}$`,
    'i'
  );
}
export function isTestUserEmail(email: string | null | undefined): boolean {
  return (
    !!email &&
    getTestUserPatterns().some((pattern) => patternToRegex(pattern).test(email))
  );
}
export { DEFAULT_TEST_USER_EMAIL_PATTERNS };
