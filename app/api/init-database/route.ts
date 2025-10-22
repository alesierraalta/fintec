import { NextResponse } from 'next/server';
import { SupabaseAppRepository } from '@/repositories/supabase';
import { CategoryKind } from '@/types/domain';

const DEFAULT_CATEGORIES = [
  // Income categories
  { name: 'Salario', kind: CategoryKind.INCOME, color: '#10b981', icon: 'Banknote' },
  { name: 'Freelance', kind: CategoryKind.INCOME, color: '#8b5cf6', icon: 'Laptop' },
  { name: 'Inversiones', kind: CategoryKind.INCOME, color: '#f59e0b', icon: 'TrendingUp' },
  { name: 'Otros Ingresos', kind: CategoryKind.INCOME, color: '#06b6d4', icon: 'Plus' },
  
  // Expense categories
  { name: 'Alimentación', kind: CategoryKind.EXPENSE, color: '#ef4444', icon: 'UtensilsCrossed' },
  { name: 'Transporte', kind: CategoryKind.EXPENSE, color: '#3b82f6', icon: 'Car' },
  { name: 'Entretenimiento', kind: CategoryKind.EXPENSE, color: '#ec4899', icon: 'GameController' },
  { name: 'Servicios', kind: CategoryKind.EXPENSE, color: '#f97316', icon: 'Zap' },
  { name: 'Salud', kind: CategoryKind.EXPENSE, color: '#84cc16', icon: 'Heart' },
  { name: 'Educación', kind: CategoryKind.EXPENSE, color: '#6366f1', icon: 'BookOpen' },
  { name: 'Hogar', kind: CategoryKind.EXPENSE, color: '#14b8a6', icon: 'Home' },
  { name: 'Ropa', kind: CategoryKind.EXPENSE, color: '#a855f7', icon: 'Shirt' },
];

export async function POST() {
  try {
    const repository = new SupabaseAppRepository();
    
    // Check if categories exist
    const existingCategories = await repository.categories.findAll();
    
    if (existingCategories.length === 0) {
      // Create default categories
      for (const categoryData of DEFAULT_CATEGORIES) {
        await repository.categories.create({
          ...categoryData,
          parentId: undefined,
          active: true,
        });
      }
      
      return NextResponse.json({
        success: true,
        message: `Created ${DEFAULT_CATEGORIES.length} default categories`,
        categoriesCreated: DEFAULT_CATEGORIES.length
      });
    } else {
      return NextResponse.json({
        success: true,
        message: `Found ${existingCategories.length} existing categories, no action needed`,
        categoriesFound: existingCategories.length
      });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize database',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  return POST(); // Allow GET requests too for easier testing
}
