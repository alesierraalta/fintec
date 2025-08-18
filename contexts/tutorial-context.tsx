'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useTutorial, type Tutorial } from '@/hooks/use-tutorial';
import { getTutorialByRoute } from '@/data/tutorials';

const TutorialContext = createContext<ReturnType<typeof useTutorial> & { 
  currentPageTutorial: Tutorial | null 
} | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tutorialHook = useTutorial();
  
  const currentPageTutorial = useMemo(() => 
    getTutorialByRoute(pathname), [pathname]);

  // Auto-start tutorial disabled to prevent navigation interference
  // Users can manually start tutorials using the tutorial button
  // useEffect(() => {
  //   if (!currentPageTutorial || tutorialHook.isTutorialCompleted(currentPageTutorial.id) || tutorialHook.isActive) 
  //     return;
  //   const timer = setTimeout(() => {
  //     if (!tutorialHook.isActive && getTutorialByRoute(pathname)?.id === currentPageTutorial.id) {
  //       tutorialHook.startTutorial(currentPageTutorial);
  //     }
  //   }, 3000);
  //   return () => clearTimeout(timer);
  // }, [pathname, currentPageTutorial, tutorialHook]);

  const value = useMemo(() => ({
    ...tutorialHook,
    currentPageTutorial,
  }), [tutorialHook, currentPageTutorial]);

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorialContext() {
  const context = useContext(TutorialContext);
  if (!context) throw new Error('useTutorialContext must be used within TutorialProvider');
  return context;
}