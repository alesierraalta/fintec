'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, History } from 'lucide-react';
import { MobileTransfer } from './mobile-transfer';
import { DesktopTransfer } from './desktop-transfer';
import { TransferHistory } from './transfer-history';

export function TransferContent() {
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const tabs = [
    {
      id: 'create' as const,
      label: 'Nueva Transferencia',
      icon: ArrowRightLeft,
      component: isMobile ? <MobileTransfer /> : <DesktopTransfer />
    },
    {
      id: 'history' as const,
      label: 'Historial',
      icon: History,
      component: <TransferHistory />
    }
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl p-2 border border-neutral-200 dark:border-neutral-700">
        <div className="flex space-x-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700'
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
      <div>
        {tabs.find(tab => tab.id === activeTab)?.component}
      </div>
    </div>
  );
}
