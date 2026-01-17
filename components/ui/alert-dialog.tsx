'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface AlertDialogContextValue {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextValue | undefined>(undefined);

function useAlertDialog() {
    const context = React.useContext(AlertDialogContext);
    if (!context) {
        throw new Error('AlertDialog components must be used within AlertDialog');
    }
    return context;
}

export interface AlertDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}

export function AlertDialog({ open: controlledOpen, onOpenChange, children }: AlertDialogProps) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);

    const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
    const handleOpenChange = onOpenChange || setUncontrolledOpen;

    return (
        <AlertDialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
            {children}
        </AlertDialogContext.Provider>
    );
}

export interface AlertDialogTriggerProps {
    asChild?: boolean;
    children: React.ReactNode;
    className?: string;
}

export function AlertDialogTrigger({ children, asChild, className }: AlertDialogTriggerProps) {
    const { onOpenChange } = useAlertDialog();

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, {
            onClick: (e: React.MouseEvent) => {
                onOpenChange(true);
                children.props.onClick?.(e);
            },
        } as any);
    }

    return (
        <button onClick={() => onOpenChange(true)} className={className}>
            {children}
        </button>
    );
}

export interface AlertDialogContentProps {
    children: React.ReactNode;
    className?: string;
}

export function AlertDialogContent({ children, className }: AlertDialogContentProps) {
    const { open, onOpenChange } = useAlertDialog();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [open]);

    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onOpenChange(false);
        };
        if (open) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [open, onOpenChange]);

    if (!mounted || !open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
                aria-hidden="true"
            />
            <div
                className={cn(
                    'relative w-full max-w-lg mx-4 bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border p-6',
                    className
                )}
                role="alertdialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}

export interface AlertDialogHeaderProps {
    children: React.ReactNode;
    className?: string;
}

export function AlertDialogHeader({ children, className }: AlertDialogHeaderProps) {
    return <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)}>{children}</div>;
}

export interface AlertDialogFooterProps {
    children: React.ReactNode;
    className?: string;
}

export function AlertDialogFooter({ children, className }: AlertDialogFooterProps) {
    return (
        <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6', className)}>
            {children}
        </div>
    );
}

export interface AlertDialogTitleProps {
    children: React.ReactNode;
    className?: string;
}

export function AlertDialogTitle({ children, className }: AlertDialogTitleProps) {
    return <h2 className={cn('text-lg font-semibold text-foreground', className)}>{children}</h2>;
}

export interface AlertDialogDescriptionProps {
    children: React.ReactNode;
    className?: string;
}

export function AlertDialogDescription({ children, className }: AlertDialogDescriptionProps) {
    return <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>;
}

export interface AlertDialogActionProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
}

export function AlertDialogAction({ children, className, onClick, disabled }: AlertDialogActionProps) {
    const { onOpenChange } = useAlertDialog();

    return (
        <button
            type="button"
            className={cn(
                'inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
                'hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:pointer-events-none disabled:opacity-50',
                className
            )}
            onClick={() => {
                onClick?.();
                onOpenChange(false);
            }}
            disabled={disabled}
        >
            {children}
        </button>
    );
}

export interface AlertDialogCancelProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
}

export function AlertDialogCancel({ children, className, onClick, disabled }: AlertDialogCancelProps) {
    const { onOpenChange } = useAlertDialog();

    return (
        <button
            type="button"
            className={cn(
                'mt-2 sm:mt-0 inline-flex h-10 items-center justify-center rounded-xl border border-input bg-background px-4 py-2 text-sm font-medium',
                'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:pointer-events-none disabled:opacity-50',
                className
            )}
            onClick={() => {
                onClick?.();
                onOpenChange(false);
            }}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
