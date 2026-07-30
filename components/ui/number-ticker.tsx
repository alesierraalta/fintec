'use client';

import { useState, useEffect } from 'react';

export const NumberTicker = ({
  value,
  prefix = '',
  suffix = '',
  isVisible = true,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  isVisible?: boolean;
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    if (Number.isNaN(value) || !Number.isFinite(value)) return;

    const duration = 1000;
    const steps = 50;
    const isNegative = value < 0;
    const absValue = Math.abs(value);
    const stepValue = absValue / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += stepValue;
      if (current >= absValue) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(isNegative ? -current : current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, isVisible]);

  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return (
      <span>
        {prefix}0.00{suffix}
      </span>
    );
  }

  return (
    <span>
      {prefix}
      {isVisible
        ? displayValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          })
        : '••••••'}
      {suffix}
    </span>
  );
};
