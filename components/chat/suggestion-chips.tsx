'use client';

interface SuggestionChipsProps {
  onSelect: (text: string) => void;
}

const SUGGESTIONS = [
  "¿Cuánto gasté en comida el mes pasado?",
  "Crear un gasto de $50 en Walmart",
  "Dame un análisis de mis finanzas",
  "¿Cuál es el saldo de mis cuentas?",
];

export function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 p-4">
      {SUGGESTIONS.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          className="px-4 py-2 bg-muted/50 hover:bg-muted text-sm rounded-full transition-colors border border-border/50 text-muted-foreground hover:text-foreground"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
