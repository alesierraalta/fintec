'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, ReactNode, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
    title: string;
    icon?: ReactNode;
    children: ReactNode;
    defaultExpanded?: boolean;
    /** Key para persistir estado en localStorage */
    storageKey?: string;
    /** Forzar colapsado en mobile */
    collapseOnMobile?: boolean;
    /** Badge o indicador junto al título */
    badge?: ReactNode;
    className?: string;
}

export function CollapsibleSection({
    title,
    icon,
    children,
    defaultExpanded = true,
    storageKey,
    collapseOnMobile = true,
    badge,
    className = ''
}: CollapsibleSectionProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [isMobile, setIsMobile] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    // Check if mobile on mount
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Load saved state from localStorage
    useEffect(() => {
        if (storageKey && typeof window !== 'undefined') {
            const saved = localStorage.getItem(`collapsible-${storageKey}`);
            if (saved !== null) {
                setIsExpanded(saved === 'true');
            } else if (collapseOnMobile && isMobile) {
                setIsExpanded(false);
            }
        } else if (collapseOnMobile && isMobile) {
            setIsExpanded(false);
        }
        setIsHydrated(true);
    }, [storageKey, collapseOnMobile, isMobile]);

    // Save state to localStorage
    const handleToggle = useCallback(() => {
        const newState = !isExpanded;
        setIsExpanded(newState);

        if (storageKey && typeof window !== 'undefined') {
            localStorage.setItem(`collapsible-${storageKey}`, String(newState));
        }
    }, [isExpanded, storageKey]);

    // Prevent hydration mismatch
    if (!isHydrated) {
        return (
            <div className={`black-theme-card rounded-3xl overflow-hidden ${className}`}>
                <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {icon && <div className="text-primary">{icon}</div>}
                            <h3 className="text-lg sm:text-xl font-semibold text-foreground">{title}</h3>
                            {badge}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`black-theme-card rounded-3xl overflow-hidden ${className}`}>
            {/* Header - always visible */}
            <motion.button
                className="w-full p-4 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-card/40 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                onClick={handleToggle}
                aria-expanded={isExpanded}
                aria-controls={`collapsible-content-${storageKey || title}`}
            >
                <div className="flex items-center space-x-3">
                    {icon && (
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            {icon}
                        </div>
                    )}
                    <div className="text-left">
                        <h3 className="text-lg sm:text-xl font-semibold text-foreground">{title}</h3>
                    </div>
                    {badge && <div className="ml-2">{badge}</div>}
                </div>

                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-2 rounded-full bg-muted/20 text-muted-foreground"
                >
                    <ChevronDown className="h-5 w-5" />
                </motion.div>
            </motion.button>

            {/* Collapsible content */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        id={`collapsible-content-${storageKey || title}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{
                            height: 'auto',
                            opacity: 1,
                            transition: {
                                height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
                                opacity: { duration: 0.25, delay: 0.1 }
                            }
                        }}
                        exit={{
                            height: 0,
                            opacity: 0,
                            transition: {
                                height: { duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] },
                                opacity: { duration: 0.15 }
                            }
                        }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Collapsed hint for mobile */}
            <AnimatePresence>
                {!isExpanded && isMobile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="px-4 pb-3 text-center"
                    >
                        <span className="text-xs text-muted-foreground/60">
                            Toca para expandir
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
