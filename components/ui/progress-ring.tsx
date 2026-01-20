'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface ProgressRingProps {
    /** Progress value from 0 to 100 */
    progress: number;
    /** Size of the ring in pixels */
    size?: number;
    /** Stroke width of the ring */
    strokeWidth?: number;
    /** Color scheme based on progress */
    colorScheme?: 'auto' | 'green' | 'yellow' | 'red' | 'blue';
    /** Show percentage text in center */
    showPercentage?: boolean;
    /** Custom center content */
    centerContent?: React.ReactNode;
    /** Animation duration in seconds */
    animationDuration?: number;
    /** Background ring color */
    bgColor?: string;
    className?: string;
}

const getColorFromProgress = (progress: number, scheme: string) => {
    if (scheme !== 'auto') {
        const colors: Record<string, { stroke: string; text: string }> = {
            green: { stroke: '#22c55e', text: 'text-green-500' },
            yellow: { stroke: '#eab308', text: 'text-yellow-500' },
            red: { stroke: '#ef4444', text: 'text-red-500' },
            blue: { stroke: '#3b82f6', text: 'text-blue-500' },
        };
        return colors[scheme] || colors.blue;
    }

    // Auto color based on progress (for budget: higher = worse)
    if (progress <= 50) {
        return { stroke: '#22c55e', text: 'text-green-500' }; // Green - under budget
    } else if (progress <= 75) {
        return { stroke: '#eab308', text: 'text-yellow-500' }; // Yellow - caution
    } else if (progress <= 100) {
        return { stroke: '#f97316', text: 'text-orange-500' }; // Orange - warning
    } else {
        return { stroke: '#ef4444', text: 'text-red-500' }; // Red - over budget!
    }
};

export function ProgressRing({
    progress,
    size = 80,
    strokeWidth = 8,
    colorScheme = 'auto',
    showPercentage = true,
    centerContent,
    animationDuration = 1,
    bgColor = 'rgba(255,255,255,0.1)',
    className = '',
}: ProgressRingProps) {
    const normalizedProgress = Math.min(Math.max(progress, 0), 150); // Allow up to 150% for over-budget

    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (Math.min(normalizedProgress, 100) / 100) * circumference;

    const colors = useMemo(() => getColorFromProgress(progress, colorScheme), [progress, colorScheme]);

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            <svg
                width={size}
                height={size}
                className="transform -rotate-90"
            >
                {/* Background ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={bgColor}
                    strokeWidth={strokeWidth}
                />

                {/* Progress ring */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: animationDuration, ease: "easeOut" }}
                />

                {/* Glow effect for over-budget */}
                {progress > 100 && (
                    <motion.circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={colors.stroke}
                        strokeWidth={strokeWidth + 4}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        opacity={0.3}
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                )}
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
                {centerContent || (showPercentage && (
                    <div className="text-center">
                        <motion.span
                            className={`text-lg font-bold ${colors.text}`}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: animationDuration * 0.5 }}
                        >
                            {Math.round(normalizedProgress)}%
                        </motion.span>
                    </div>
                ))}
            </div>
        </div>
    );
}
