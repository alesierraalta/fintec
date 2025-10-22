'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface SuspenseLoadingProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  overlay?: boolean;
  message?: string;
}

export function SuspenseLoading({ 
  className = '', 
  size = 'md', 
  overlay = false,
  message = 'Cargando...'
}: SuspenseLoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const containerClasses = overlay 
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'
    : 'flex items-center justify-center p-4';

  return (
    <div className={`${containerClasses} ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3"
      >
        <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
        {message && (
          <p className="text-sm text-muted-foreground animate-pulse">
            {message}
          </p>
        )}
      </motion.div>
    </div>
  );
}

// Specific loading components for different contexts
export function FormLoading() {
  return (
    <SuspenseLoading 
      overlay 
      message="Cargando formulario..." 
      className="bg-black/30" 
    />
  );
}

export function ChartLoading() {
  return (
    <SuspenseLoading 
      size="lg" 
      message="Cargando gráfico..." 
      className="min-h-[300px]" 
    />
  );
}

export function PageLoading() {
  return (
    <SuspenseLoading 
      overlay 
      size="lg" 
      message="Cargando página..." 
    />
  );
}

export function DashboardLoading() {
  return (
    <SuspenseLoading 
      size="lg" 
      message="Cargando dashboard..." 
      className="min-h-[400px]" 
    />
  );
}

export function ReportsLoading() {
  return (
    <SuspenseLoading 
      size="lg" 
      message="Cargando reportes..." 
      className="min-h-[500px]" 
    />
  );
}
