import * as React from 'react';
import { cn } from '@/lib/utils';
import { ButtonVariant, ButtonSize } from '@/types';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, icon, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-250 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] focus:outline-none focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none micro-bounce hover-lift shadow-sm hover:shadow-lg backdrop-blur-sm animate-fade-in-up';
    
    const variants = {
      primary: 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl glass-light border border-primary/30',
      secondary: 'bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground hover:from-secondary/90 hover:to-secondary/80 shadow-md hover:shadow-lg glass-card',
      success: 'bg-gradient-to-r from-success to-success/90 text-white hover:from-success/90 hover:to-success/80 shadow-lg hover:shadow-xl hover-glow',
      warning: 'bg-gradient-to-r from-warning to-warning/90 text-white hover:from-warning/90 hover:to-warning/80 shadow-lg hover:shadow-xl',
      danger: 'bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground hover:from-destructive/90 hover:to-destructive/80 shadow-lg hover:shadow-xl',
      ghost: 'hover:bg-muted/50 hover:text-foreground glass-card backdrop-blur-sm border border-border/20 hover:border-border/40',
      outline: 'border-2 border-primary bg-background/70 hover:bg-primary/10 hover:text-primary glass-light backdrop-blur-md hover:border-primary/50',
    };

    const sizes = {
      sm: 'h-9 px-4 text-sm rounded-lg',
      md: 'h-11 px-6 text-base rounded-xl',
      lg: 'h-13 px-8 text-lg rounded-xl',
    };

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          loading && 'cursor-wait',
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
        )}
        {!loading && icon && (
          <span className={cn("flex items-center", children && "mr-2")}>
            {icon}
          </span>
        )}
        <span className="flex items-center">{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
