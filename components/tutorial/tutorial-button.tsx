'use client';

import { useState, useMemo } from 'react';
import { HelpCircle, BookOpen, RotateCcw, CheckCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTutorialContext } from '@/contexts/tutorial-context';
import type { Tutorial } from '@/hooks/use-tutorial';

interface TutorialButtonProps {
  tutorial: Tutorial;
  variant?: 'floating' | 'inline' | 'header';
  className?: string;
}

export function TutorialButton({ tutorial, variant = 'floating', className = '' }: TutorialButtonProps) {
  const { startTutorial, isTutorialCompleted, resetTutorial, isActive, currentTutorial } = useTutorialContext();
  const [showMenu, setShowMenu] = useState(false);
  
  const status = useMemo(() => ({
    isCompleted: isTutorialCompleted(tutorial.id),
    isCurrent: isActive && currentTutorial?.id === tutorial.id
  }), [isTutorialCompleted, tutorial.id, isActive, currentTutorial?.id]);

  const handleStart = () => {
    const started = startTutorial(tutorial);
    if (!started && status.isCompleted) setShowMenu(true);
    else setShowMenu(false);
  };

  const handleRestart = () => {
    resetTutorial(tutorial.id);
    startTutorial(tutorial, true);
    setShowMenu(false);
  };

  if (status.isCurrent) return null;

  // Floating variant
  if (variant === 'floating') {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={handleStart}
          className={`w-14 h-14 rounded-full shadow-2xl bg-accent-primary hover:bg-accent-primary/90 text-background-primary hover:scale-110 active:scale-95 transition-all duration-200 ${className}`}
          title={status.isCompleted ? 'Repetir tutorial' : 'Iniciar tutorial'}
        >
          {status.isCompleted ? <RotateCcw className="h-6 w-6" /> : <HelpCircle className="h-6 w-6" />}
        </Button>
        {!status.isCompleted && <div className="absolute inset-0 rounded-full bg-accent-primary animate-ping opacity-20" />}
        {status.isCompleted && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center border-2 border-background-primary">
            <CheckCircle className="h-3 w-3 text-background-primary" />
          </div>
        )}
      </div>
    );
  }

  // Header variant
  if (variant === 'header') {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMenu(!showMenu)}
          className={`text-text-muted hover:text-accent-primary hover:bg-background-tertiary rounded-2xl ${className}`}
        >
          <BookOpen className="h-5 w-5" />
        </Button>

        {showMenu && (
          <>
            <div className="absolute right-0 top-full mt-2 w-64 bg-background-elevated border border-border-secondary rounded-2xl shadow-2xl z-50 animate-scale-in">
              <div className="p-4">
                <h4 className="font-semibold text-text-primary mb-2">Tutorial de la página</h4>
                <p className="text-sm text-text-muted mb-4">{tutorial.description}</p>
                
                <div className="space-y-2">
                  <Button
                    onClick={handleStart}
                    className="w-full justify-start bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary border border-accent-primary/20"
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {status.isCompleted ? 'Ver de nuevo' : 'Empezar tutorial'}
                  </Button>
                  
                  {status.isCompleted && (
                    <Button
                      onClick={handleRestart}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-text-muted hover:text-text-primary"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reiniciar progreso
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          </>
        )}
      </div>
    );
  }

  // Inline variant
  return (
    <Button
      onClick={handleStart}
      variant="outline"
      size="sm"
      className={`text-accent-primary border-accent-primary/20 hover:bg-accent-primary/10 hover:border-accent-primary/40 ${className}`}
    >
      <BookOpen className="h-4 w-4 mr-2" />
      {status.isCompleted ? 'Ver tutorial de nuevo' : 'Ver tutorial'}
    </Button>
  );
}