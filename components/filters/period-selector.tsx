'use client';

import { useState } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import {
  getTimePeriods,
  getPeriodById,
  formatDateForAPI,
  TimePeriod,
} from '@/lib/dates/periods';

interface PeriodSelectorProps {
  selectedPeriod?: string;
  onPeriodChange: (period: TimePeriod | null) => void;
  className?: string;
}

export function PeriodSelector({
  selectedPeriod,
  onPeriodChange,
  className = '',
}: PeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [showCustom, setShowCustom] = useState(false);

  const periods = getTimePeriods();
  const activePeriod = selectedPeriod ? getPeriodById(selectedPeriod) : null;

  const handlePeriodSelect = (period: TimePeriod) => {
    onPeriodChange(period);
    setIsOpen(false);
    setShowCustom(false);
  };

  const handleCustomRange = () => {
    if (customRange.from && customRange.to) {
      const customPeriod: TimePeriod = {
        id: 'custom',
        label: `${customRange.from} - ${customRange.to}`,
        startDate: new Date(customRange.from),
        endDate: new Date(customRange.to),
      };
      onPeriodChange(customPeriod);
      setIsOpen(false);
    }
  };

  const clearPeriod = () => {
    onPeriodChange(null);
    setCustomRange({ from: '', to: '' });
    setShowCustom(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`focus-ring flex min-h-[44px] items-center space-x-2 rounded-xl border px-4 py-2.5 transition-all duration-200 ${
          activePeriod
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground'
        }`}
      >
        <Calendar className="h-4 w-4" />
        <span className="text-base font-medium md:text-sm">
          {activePeriod?.label || 'Período'}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {activePeriod && (
        <button
          onClick={clearPeriod}
          className="focus-ring ml-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full z-50 mt-2 max-h-96 w-64 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
            <div className="p-2">
              <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                Períodos Rápidos
              </div>

              {periods.slice(0, 10).map((period) => (
                <button
                  key={period.id}
                  onClick={() => handlePeriodSelect(period)}
                  className={`min-h-[44px] w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selectedPeriod === period.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {period.label}
                </button>
              ))}

              <div className="my-2 border-t border-border" />

              <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                Últimos Días
              </div>
              {periods.slice(10).map((period) => (
                <button
                  key={period.id}
                  onClick={() => handlePeriodSelect(period)}
                  className={`min-h-[44px] w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selectedPeriod === period.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {period.label}
                </button>
              ))}

              <div className="my-2 border-t border-border" />

              <button
                onClick={() => setShowCustom(!showCustom)}
                className="min-h-[44px] w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                📅 Rango Personalizado
              </button>

              {showCustom && (
                <div className="border-t border-border p-3">
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Desde
                      </label>
                      <input
                        type="date"
                        value={customRange.from}
                        onChange={(e) =>
                          setCustomRange((prev) => ({
                            ...prev,
                            from: e.target.value,
                          }))
                        }
                        className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary md:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Hasta
                      </label>
                      <input
                        type="date"
                        value={customRange.to}
                        onChange={(e) =>
                          setCustomRange((prev) => ({
                            ...prev,
                            to: e.target.value,
                          }))
                        }
                        className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary md:text-sm"
                      />
                    </div>
                    <button
                      onClick={handleCustomRange}
                      disabled={!customRange.from || !customRange.to}
                      className="min-h-[44px] w-full rounded-lg bg-primary px-3 py-2 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    >
                      Aplicar Rango
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
