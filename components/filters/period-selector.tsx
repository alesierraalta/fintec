'use client';

import { useState } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { getTimePeriods, getPeriodById, formatDateForAPI, TimePeriod } from '@/lib/dates/periods';

interface PeriodSelectorProps {
  selectedPeriod?: string;
  onPeriodChange: (period: TimePeriod | null) => void;
  className?: string;
}

export function PeriodSelector({ selectedPeriod, onPeriodChange, className = '' }: PeriodSelectorProps) {
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
        endDate: new Date(customRange.to)
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
        className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all duration-200 ${
          activePeriod
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary'
        }`}
      >
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-medium">
          {activePeriod?.label || 'Período'}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {activePeriod && (
        <button
          onClick={clearPeriod}
          className="ml-2 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
          <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Períodos Rápidos</div>
              
              {periods.slice(0, 10).map((period) => (
                <button
                  key={period.id}
                  onClick={() => handlePeriodSelect(period)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedPeriod === period.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {period.label}
                </button>
              ))}

              <div className="border-t border-border my-2" />
              
              <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Últimos Días</div>
              {periods.slice(10).map((period) => (
                <button
                  key={period.id}
                  onClick={() => handlePeriodSelect(period)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedPeriod === period.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {period.label}
                </button>
              ))}

              <div className="border-t border-border my-2" />
              
              <button
                onClick={() => setShowCustom(!showCustom)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                📅 Rango Personalizado
              </button>

              {showCustom && (
                <div className="p-3 border-t border-border">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Desde</label>
                      <input
                        type="date"
                        value={customRange.from}
                        onChange={(e) => setCustomRange(prev => ({ ...prev, from: e.target.value }))}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Hasta</label>
                      <input
                        type="date"
                        value={customRange.to}
                        onChange={(e) => setCustomRange(prev => ({ ...prev, to: e.target.value }))}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <button
                      onClick={handleCustomRange}
                      disabled={!customRange.from || !customRange.to}
                      className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
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
