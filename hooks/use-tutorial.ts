'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'hover' | 'none';
  nextButton?: string;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  steps: TutorialStep[];
}

const STORAGE_KEY = 'cashew-tutorials';

export function useTutorial() {
  const [isActive, setIsActive] = useState(false);
  const [currentTutorial, setCurrentTutorial] = useState<Tutorial | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);

  // Load completed tutorials from localStorage (optimized)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCompletedTutorials(JSON.parse(saved));
    } catch {
      // Silent fail - invalid JSON
    }
  }, []);

  // Optimized save function
  const saveCompleted = useCallback((tutorials: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tutorials));
    setCompletedTutorials(tutorials);
  }, []);

  // Memoized helpers
  const isTutorialCompleted = useCallback((id: string) => 
    completedTutorials.includes(id), [completedTutorials]);

  const getCurrentStep = useMemo(() => 
    isActive && currentTutorial ? currentTutorial.steps[currentStep] : null, 
    [isActive, currentTutorial, currentStep]);

  const getProgress = useMemo(() => {
    if (!currentTutorial) return { current: 0, total: 0, percentage: 0 };
    const current = currentStep + 1;
    const total = currentTutorial.steps.length;
    return { current, total, percentage: Math.round((current / total) * 100) };
  }, [currentTutorial, currentStep]);

  // Actions
  const startTutorial = useCallback((tutorial: Tutorial, force = false) => {
    if (!force && isTutorialCompleted(tutorial.id)) return false;
    setCurrentTutorial(tutorial);
    setCurrentStep(0);
    setIsActive(true);
    return true;
  }, [isTutorialCompleted]);

  const nextStep = useCallback(() => {
    if (!currentTutorial) return;
    if (currentStep < currentTutorial.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      const newCompleted = [...completedTutorials, currentTutorial.id];
      saveCompleted(newCompleted);
      setIsActive(false);
      setCurrentTutorial(null);
      setCurrentStep(0);
    }
  }, [currentTutorial, currentStep, completedTutorials, saveCompleted]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  }, [currentStep]);

  const closeTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentTutorial(null);
    setCurrentStep(0);
  }, []);

  const skipTutorial = useCallback(() => {
    if (!currentTutorial) return;
    const newCompleted = [...completedTutorials, currentTutorial.id];
    saveCompleted(newCompleted);
    closeTutorial();
  }, [currentTutorial, completedTutorials, saveCompleted, closeTutorial]);

  const resetTutorial = useCallback((id: string) => {
    const newCompleted = completedTutorials.filter(tutorialId => tutorialId !== id);
    saveCompleted(newCompleted);
  }, [completedTutorials, saveCompleted]);

  return {
    isActive,
    currentTutorial,
    currentStep,
    completedTutorials,
    startTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    closeTutorial,
    resetTutorial,
    isTutorialCompleted,
    getCurrentStep,
    getProgress,
  };
}