'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export function useIsNative(): boolean {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  return isNative;
}
