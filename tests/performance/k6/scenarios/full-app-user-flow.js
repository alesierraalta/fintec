/**
 * FinTec Performance - Full App User Flow
 *
 * End-to-end load profile for the complete user journey across
 * authenticated and public app paths.
 */

import { ENDPOINT_THRESHOLDS, STRESS_THRESHOLDS } from '../lib/thresholds.js';
import { authenticateUserPool, authHeaders, getVUToken } from '../lib/auth.js';
import { fullUserJourney } from '../flows/full-user-journey.js';

export const options = {
  scenarios: {
    full_app_journey: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 10 },
        { duration: '3m', target: 30 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    ...STRESS_THRESHOLDS,
    ...ENDPOINT_THRESHOLDS,
  },
};

export function setup() {
  const tokens = authenticateUserPool(30);
  return { tokens };
}

export default function (data) {
  const token = getVUToken(data.tokens);
  const headers = authHeaders(token);
  fullUserJourney(headers);
}
