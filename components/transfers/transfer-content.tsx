'use client';

import React, { useState } from 'react';
import { ArrowRightLeft, History } from 'lucide-react';
import { MobileTransfer } from './mobile-transfer';
import { DesktopTransfer } from './desktop-transfer';
import { TransferHistory } from './transfer-history';
import { useMediaQuery } from '@/hooks';

export function TransferContent() {
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  const tabs = [
    {
      id: 'create' as const,
      label: 'Nueva Transferencia',
      icon: ArrowRightLeft,
      component: isMobile ? <MobileTransfer /> : <DesktopTransfer />,
    },
    {
      id: 'history' as const,
      label: 'Historial',
      icon: History,
      component: <TransferHistory />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="rounded-2xl border border-border/40 bg-card/90 p-2 shadow-sm backdrop-blur-xl">
        <div className="flex space-x-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`focus-ring flex min-h-[44px] flex-1 items-center justify-center space-x-2 rounded-xl px-4 py-3 font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                    : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>{tabs.find((tab) => tab.id === activeTab)?.component}</div>
    </div>
  );
}
