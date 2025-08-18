'use client';

import { 
  UtensilsCrossed, Car, Home, Zap, Gamepad2, Heart, GraduationCap, 
  ShoppingBag, MoreHorizontal, Banknote, Laptop, TrendingUp, Plus,
  Coffee, Fuel, Plane, Building2, Smartphone, Book, Music, Film,
  Dumbbell, Shirt, Gift, Wrench, Calculator, Briefcase, MapPin,
  Clock, Star, Target, Award, Lightbulb, Palette, Camera
} from 'lucide-react';

interface IconPickerProps {
  selectedIcon: string;
  onIconChange: (icon: string) => void;
  label?: string;
}

const icons = [
  // Expense icons
  { name: 'UtensilsCrossed', icon: UtensilsCrossed, category: 'Alimentación' },
  { name: 'Coffee', icon: Coffee, category: 'Alimentación' },
  { name: 'Car', icon: Car, category: 'Transporte' },
  { name: 'Fuel', icon: Fuel, category: 'Transporte' },
  { name: 'Plane', icon: Plane, category: 'Transporte' },
  { name: 'Home', icon: Home, category: 'Vivienda' },
  { name: 'Building2', icon: Building2, category: 'Vivienda' },
  { name: 'Zap', icon: Zap, category: 'Servicios' },
  { name: 'Smartphone', icon: Smartphone, category: 'Servicios' },
  { name: 'Gamepad2', icon: Gamepad2, category: 'Entretenimiento' },
  { name: 'Film', icon: Film, category: 'Entretenimiento' },
  { name: 'Music', icon: Music, category: 'Entretenimiento' },
  { name: 'Heart', icon: Heart, category: 'Salud' },
  { name: 'Dumbbell', icon: Dumbbell, category: 'Salud' },
  { name: 'GraduationCap', icon: GraduationCap, category: 'Educación' },
  { name: 'Book', icon: Book, category: 'Educación' },
  { name: 'ShoppingBag', icon: ShoppingBag, category: 'Compras' },
  { name: 'Shirt', icon: Shirt, category: 'Compras' },
  { name: 'Gift', icon: Gift, category: 'Otros' },
  { name: 'Wrench', icon: Wrench, category: 'Otros' },
  
  // Income icons
  { name: 'Banknote', icon: Banknote, category: 'Ingresos' },
  { name: 'Laptop', icon: Laptop, category: 'Trabajo' },
  { name: 'Briefcase', icon: Briefcase, category: 'Trabajo' },
  { name: 'TrendingUp', icon: TrendingUp, category: 'Inversiones' },
  { name: 'Calculator', icon: Calculator, category: 'Inversiones' },
  { name: 'Award', icon: Award, category: 'Bonos' },
  { name: 'Star', icon: Star, category: 'Otros' },
  
  // General icons
  { name: 'Plus', icon: Plus, category: 'General' },
  { name: 'Target', icon: Target, category: 'General' },
  { name: 'MapPin', icon: MapPin, category: 'General' },
  { name: 'Clock', icon: Clock, category: 'General' },
  { name: 'Lightbulb', icon: Lightbulb, category: 'General' },
  { name: 'Palette', icon: Palette, category: 'General' },
  { name: 'Camera', icon: Camera, category: 'General' },
  { name: 'MoreHorizontal', icon: MoreHorizontal, category: 'General' },
];

export function IconPicker({ selectedIcon, onIconChange, label }: IconPickerProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-3">
          {label}
        </label>
      )}
      <div className="max-h-48 overflow-y-auto border border-gray-700 rounded-lg p-3 bg-gray-800/50">
        <div className="grid grid-cols-8 gap-2">
          {icons.map(({ name, icon: Icon }) => (
            <button
              key={name}
              type="button"
              onClick={() => onIconChange(name)}
              className={`p-3 rounded-lg border transition-all hover:scale-105 ${
                selectedIcon === name
                  ? 'border-primary-600 bg-primary-600/20 text-primary-400'
                  : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500 hover:text-gray-300'
              }`}
              title={name}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Selecciona un icono para representar la categoría
      </p>
    </div>
  );
}
