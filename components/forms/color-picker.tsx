'use client';

import { useState } from 'react';

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  label?: string;
}

const colors = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#f59e0b', // amber-500
  '#eab308', // yellow-500
  '#84cc16', // lime-500
  '#22c55e', // green-500
  '#10b981', // emerald-500
  '#14b8a6', // teal-500
  '#06b6d4', // cyan-500
  '#0ea5e9', // sky-500
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#a855f7', // purple-500
  '#d946ef', // fuchsia-500
  '#ec4899', // pink-500
  '#f43f5e', // rose-500
  '#6b7280', // gray-500
];

export function ColorPicker({ selectedColor, onColorChange, label }: ColorPickerProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-3">
          {label}
        </label>
      )}
      <div className="grid grid-cols-6 gap-3">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onColorChange(color)}
            className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
              selectedColor === color 
                ? 'border-white shadow-lg' 
                : 'border-gray-600 hover:border-gray-400'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          >
            {selectedColor === color && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Selecciona un color para identificar la categoría
      </p>
    </div>
  );
}
