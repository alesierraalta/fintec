'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { X, ArrowLeft, ArrowRight, SkipForward, CheckCircle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTutorialContext } from '@/contexts/tutorial-context';

export function TutorialOverlay() {
  const {
    isActive, currentTutorial, getCurrentStep, getProgress,
    nextStep, previousStep, skipTutorial, closeTutorial
  } = useTutorialContext();

  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = getCurrentStep;
  const progress = getProgress;

  // Optimized positioning calculation
  const calculatePosition = useCallback((element: HTMLElement) => {
    if (!currentStep) return { x: 0, y: 0 };

    const rect = element.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    const width = vw < 640 ? Math.min(350, vw - 40) : vw < 1024 ? 380 : 400;
    const height = 300;
    const margin = 20;

    const positions = {
      bottom: { x: rect.left + rect.width / 2 - width / 2, y: rect.bottom + margin },
      top: { x: rect.left + rect.width / 2 - width / 2, y: rect.top - height - margin },
      right: { x: rect.right + margin, y: rect.top + rect.height / 2 - height / 2 },
      left: { x: rect.left - width - margin, y: rect.top + rect.height / 2 - height / 2 },
      center: { x: vw / 2 - width / 2, y: vh / 2 - height / 2 }
    };

    let pos = positions[currentStep.position] || positions.bottom;

    if (currentStep.position !== 'center') {
      const spaces = { top: rect.top, bottom: vh - rect.bottom, left: rect.left, right: vw - rect.right };
      if (spaces.bottom < height + margin && spaces.top >= height + margin) pos = positions.top;
      else if (spaces.right < width + margin && spaces.left >= width + margin) pos = positions.left;
      else if (spaces.left < width + margin && spaces.right >= width + margin) pos = positions.right;
      else if (Object.values(spaces).every(space => space < height + margin)) pos = positions.center;
    }

    pos.x = Math.max(20, Math.min(pos.x, vw - width - 20));
    pos.y = Math.max(20, Math.min(pos.y, vh - height - 20));
    return pos;
  }, [currentStep]);

  // Find and position tooltip
  useEffect(() => {
    if (!isActive || !currentStep) {
      setTargetElement(null);
      return;
    }

    const element = document.querySelector(currentStep.target) as HTMLElement;
    if (element) {
      setTargetElement(element);
      setTooltipPosition(calculatePosition(element));
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive, currentStep, calculatePosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTutorial();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); nextStep(); }
      else if (e.key === 'ArrowLeft' && progress.current > 1) { e.preventDefault(); previousStep(); }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, progress.current, nextStep, previousStep, closeTutorial]);

  // Window resize handler
  useEffect(() => {
    if (!targetElement || !currentStep) return;

    const handleResize = () => setTooltipPosition(calculatePosition(targetElement));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [targetElement, currentStep, calculatePosition]);

  // Early return after all hooks - prevent interference during navigation
  if (!isActive || !currentStep || !currentTutorial) return null;
  
  // Don't render if tutorial is being closed or changed
  if (!targetElement && currentStep.target !== 'body') return null;

  const isFirstStep = progress.current === 1;
  const isLastStep = progress.current === progress.total;

  // Create backdrop sections
  const createBackdropSections = () => {
    if (!targetElement) return [];
    const rect = targetElement.getBoundingClientRect();
    const margin = 10;
    return [
      { top: 0, left: 0, width: '100vw', height: rect.top - margin },
      { top: rect.top - margin, left: 0, width: rect.left - margin, height: rect.height + 2 * margin },
      { top: rect.top - margin, left: rect.right + margin, width: `calc(100vw - ${rect.right + margin}px)`, height: rect.height + 2 * margin },
      { top: rect.bottom + margin, left: 0, width: '100vw', height: `calc(100vh - ${rect.bottom + margin}px)` }
    ].filter(section => section.width !== 0 && section.height !== 0);
  };

  const backdropSections = createBackdropSections();

  return (
    <>
      {/* Backdrop - Less intrusive */}
      {backdropSections.length > 0 ? (
        <div className="fixed inset-0 z-50" onClick={closeTutorial}>
          {backdropSections.map((section, i) => (
            <div key={i} className="absolute bg-black/50" style={section} />
          ))}
        </div>
      ) : (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={closeTutorial} />
      )}

      {/* Highlight border */}
      {targetElement && (
        <div
          className="fixed z-50 pointer-events-none border-2 border-accent-primary rounded-2xl animate-pulse"
          style={{
            left: targetElement.getBoundingClientRect().left - 4,
            top: targetElement.getBoundingClientRect().top - 4,
            width: targetElement.getBoundingClientRect().width + 8,
            height: targetElement.getBoundingClientRect().height + 8,
            boxShadow: '0 0 0 2px rgba(74, 222, 128, 0.3), 0 0 20px rgba(74, 222, 128, 0.5)'
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 bg-background-elevated border border-border-secondary rounded-3xl shadow-2xl animate-scale-in max-h-[80vh] overflow-auto"
        style={{ ...tooltipPosition, width: window.innerWidth < 640 ? 350 : 400 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-primary">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-accent-primary/20 rounded-2xl">
              <Lightbulb className="h-5 w-5 text-accent-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">{currentStep.title}</h3>
              <p className="text-sm text-text-muted">
                {currentTutorial.title} - Paso {progress.current} de {progress.total}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={closeTutorial} className="text-text-muted">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress */}
        <div className="px-6 py-2">
          <div className="w-full bg-background-tertiary rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-accent-primary to-accent-secondary h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-text-secondary leading-relaxed mb-6">{currentStep.content}</p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            {!isFirstStep && (
              <Button variant="outline" size="sm" onClick={previousStep}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
            )}
            
            <div className="flex items-center space-x-2 ml-auto">
              <Button variant="ghost" size="sm" onClick={skipTutorial} className="text-text-muted">
                <SkipForward className="h-4 w-4 mr-1" />
                Saltar
              </Button>
              <Button onClick={nextStep} className="bg-accent-primary hover:bg-accent-primary/90 text-background-primary">
                {isLastStep ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Finalizar
                  </>
                ) : (
                  <>
                    Siguiente
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Shortcuts */}
        <div className="px-6 pb-4 text-xs text-text-muted text-center space-x-4">
          <span>← → navegar</span>
          <span>Enter continuar</span>
          <span>Esc cerrar</span>
        </div>
      </div>
    </>
  );
}