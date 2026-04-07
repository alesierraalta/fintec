'use client';

import React, { useState, useRef, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQAccordionProps {
  items: { question: string; answer: string }[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const toggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = (index + 1) % items.length;
          buttonRefs.current[next]?.focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = (index - 1 + items.length) % items.length;
          buttonRefs.current[prev]?.focus();
          break;
        }
        case 'Home': {
          e.preventDefault();
          buttonRefs.current[0]?.focus();
          break;
        }
        case 'End': {
          e.preventDefault();
          buttonRefs.current[items.length - 1]?.focus();
          break;
        }
      }
    },
    [items.length]
  );

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-border/40 bg-card/90 backdrop-blur-xl transition-all duration-300"
          >
            <h3 id={`faq-question-${index}`}>
              <button
                ref={(el) => {
                  buttonRefs.current[index] = el;
                }}
                type="button"
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${index}`}
                onClick={() => toggle(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-muted/30"
              >
                <span className="pr-4 text-lg font-semibold text-foreground">
                  {item.question}
                </span>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-300',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>
            </h3>

            <div
              id={`faq-answer-${index}`}
              role="region"
              aria-labelledby={`faq-question-${index}`}
              className={cn(
                'overflow-hidden transition-all duration-300',
                isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              )}
            >
              <div className="px-6 pb-5 leading-relaxed text-muted-foreground">
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
