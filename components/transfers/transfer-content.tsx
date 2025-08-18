'use client';

import React, { useState, useEffect } from 'react';
import { MobileTransfer } from './mobile-transfer';
import { DesktopTransfer } from './desktop-transfer';

export function TransferContent() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile ? <MobileTransfer /> : <DesktopTransfer />;
}
