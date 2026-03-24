/**
 * FinTec Performance Testing - External k6 Utility Libraries
 *
 * Centralized re-export of remote k6 helper libraries so every flow
 * uses the same pinned versions.
 */

export {
  randomIntBetween,
  randomItem,
  uuidv4,
} from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
