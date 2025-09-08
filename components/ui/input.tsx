import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, suffix, ...props }, ref) => {
    const inputId = React.useId();
    const errorId = React.useId();

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <div className="h-5 w-5 text-muted-foreground">{icon}</div>
            </div>
          )}
          <input
            type={type}
            id={inputId}
            className={cn(
              // Base styles with enhanced animations
              'flex h-12 w-full rounded-xl border-2 border-input/50 bg-background/80 px-4 py-3',
              'text-sm ring-offset-background file:border-0 file:bg-transparent',
              'file:text-sm file:font-medium placeholder:text-muted-foreground/70',
              'focus-glow disabled:cursor-not-allowed disabled:opacity-50',
              'transition-smooth backdrop-blur-sm',
              
              // Glass morphism and elegant styling
              'glass-light shadow-lg hover:shadow-xl',
              'hover:border-primary/30 focus:border-primary/60 hover:bg-background/90',
              'animate-fade-in-up',
              
              // Conditional styles
              error && 'border-destructive/50 focus:border-destructive hover:border-destructive/70 animate-wiggle',
              icon && 'pl-12',
              suffix && 'pr-12',
              className
            )}
            ref={ref}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : undefined}
            {...props}
          />
          {suffix && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
              <div className="text-sm text-muted-foreground">{suffix}</div>
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-2 text-sm text-destructive animate-fade-in">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
