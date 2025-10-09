'use client';

import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface LimitWarningProps {
  title: string;
  message: string;
  onUpgrade: () => void;
  severity?: 'warning' | 'error';
}

export function LimitWarning({ 
  title, 
  message, 
  onUpgrade,
  severity = 'warning' 
}: LimitWarningProps) {
  const colors = {
    warning: 'border-orange-500/50 bg-orange-500/10',
    error: 'border-destructive/50 bg-destructive/10',
  };

  const iconColors = {
    warning: 'text-orange-500',
    error: 'text-destructive',
  };

  return (
    <Card className={`border-2 ${colors[severity]}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconColors[severity]}`} />
          
          <div className="flex-1 space-y-2">
            <div>
              <h4 className="font-semibold">{title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
            </div>

            <Button
              size="sm"
              onClick={onUpgrade}
              className="gap-2"
            >
              <span>Actualizar Plan</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

