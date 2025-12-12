export function parseLocaleNumber(value: string): number | null {
  const trimmed = value.replace(/\u00A0/g, ' ').trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/[^\d.,+-]/g, '').replace(/\s+/g, '');
  if (!normalized || !/\d/.test(normalized)) {
    return null;
  }

  let sign = '';
  let unsigned = normalized;
  if (unsigned.startsWith('-') || unsigned.startsWith('+')) {
    sign = unsigned[0];
    unsigned = unsigned.slice(1);
  }

  const lastComma = unsigned.lastIndexOf(',');
  const lastDot = unsigned.lastIndexOf('.');
  const hasComma = lastComma !== -1;
  const hasDot = lastDot !== -1;

  let decimalIndex = -1;
  if (hasComma && hasDot) {
    decimalIndex = Math.max(lastComma, lastDot);
  } else if (hasComma) {
    if (/^\d{1,3}(,\d{3})+$/.test(unsigned)) {
      decimalIndex = -1;
    } else {
      decimalIndex = lastComma;
    }
  } else if (hasDot) {
    if (/^\d{1,3}(\.\d{3})+$/.test(unsigned)) {
      decimalIndex = -1;
    } else {
      decimalIndex = lastDot;
    }
  }

  if (decimalIndex === -1) {
    const integerOnly = unsigned.replace(/[.,]/g, '');
    if (!integerOnly) {
      return null;
    }
    const parsed = Number(`${sign}${integerOnly}`);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (decimalIndex <= 0 || decimalIndex >= unsigned.length - 1) {
    return null;
  }

  const integerPart = unsigned.slice(0, decimalIndex).replace(/[.,]/g, '');
  const fractionPart = unsigned.slice(decimalIndex + 1).replace(/[.,]/g, '');

  if (!integerPart && !fractionPart) {
    return null;
  }

  const canonical = `${sign}${integerPart || '0'}.${fractionPart || '0'}`;
  const parsed = Number(canonical);
  return Number.isFinite(parsed) ? parsed : null;
}

