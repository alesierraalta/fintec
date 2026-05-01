'use client';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle({ isMinimized }: { isMinimized?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-10 w-10" />; // Placeholder

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={`transition-ios flex items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-ios-sm hover:bg-secondary/80 ${
        isMinimized ? 'h-10 w-10' : 'h-10 w-full space-x-2 px-3'
      }`}
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      {!isMinimized && (
        <span>{resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
      )}
    </button>
  );
}
