'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  isMobile: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true); // Start open by default for desktop
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile - only after mount to avoid hydration mismatch
  // This ensures isMobile is consistent during initial hydration (always false)
  // and only updates after the component is mounted on the client
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      
      // On mobile, sidebar should be closed by default
      // On desktop, keep current state (user preference)
      if (mobile) {
        setIsOpen(false);
      }
    };

    // Only check after mount to ensure consistent hydration
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []); // Empty deps - only run once on mount, not when isOpen changes

  const toggleSidebar = useCallback(() => setIsOpen(!isOpen), [isOpen]);
  const closeSidebar = useCallback(() => setIsOpen(false), []);
  const openSidebar = useCallback(() => setIsOpen(true), []);

  const value = useMemo(() => ({
    isOpen,
    isMobile,
    toggleSidebar,
    closeSidebar,
    openSidebar,
  }), [isOpen, isMobile, toggleSidebar, closeSidebar, openSidebar]);

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}
