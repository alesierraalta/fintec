const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const defaultCategories = {
  EXPENSE: [
    { value: 'food', label: 'Comida', icon: 'Utensils', color: '#f97316' },
    { value: 'transport', label: 'Transporte', icon: 'Car', color: '#3b82f6' },
    { value: 'shopping', label: 'Compras', icon: 'ShoppingBag', color: '#ec4899' },
    { value: 'entertainment', label: 'Entretenimiento', icon: 'Music', color: '#8b5cf6' },
    { value: 'health', label: 'Salud', icon: 'Stethoscope', color: '#10b981' },
    { value: 'home', label: 'Hogar', icon: 'Home', color: '#f59e0b' },
    { value: 'education', label: 'Educación', icon: 'Book', color: '#6366f1' },
    { value: 'fitness', label: 'Fitness', icon: 'Dumbbell', color: '#ef4444' },
    { value: 'travel', label: 'Viajes', icon: 'Plane', color: '#06b6d4' },
    { value: 'tech', label: 'Tecnología', icon: 'Smartphone', color: '#6b7280' },
    { value: 'subscriptions', label: 'Suscripciones', icon: 'Calendar', color: '#8b5cf6' },
    { value: 'loans', label: 'Préstamos', icon: 'Banknote', color: '#dc2626' },
    { value: 'insurance', label: 'Seguros', icon: 'Heart', color: '#3b82f6' },
    { value: 'utilities', label: 'Servicios', icon: 'Zap', color: '#f59e0b' },
    { value: 'rent', label: 'Alquiler', icon: 'Building2', color: '#6b7280' },
    { value: 'taxes', label: 'Impuestos', icon: 'Receipt', color: '#dc2626' },
  ],
  INCOME: [
    { value: 'salary', label: 'Salario', icon: 'Briefcase', color: '#10b981' },
    { value: 'freelance', label: 'Freelance', icon: 'Coffee', color: '#3b82f6' },
    { value: 'investment', label: 'Inversiones', icon: 'TrendingUp', color: '#8b5cf6' },
    { value: 'bonus', label: 'Bonos', icon: 'Gift', color: '#f59e0b' },
    { value: 'rental', label: 'Alquiler', icon: 'Home', color: '#10b981' },
    { value: 'business', label: 'Negocio', icon: 'Building2', color: '#06b6d4' },
    { value: 'other', label: 'Otros', icon: 'Star', color: '#ec4899' },
  ],
  TRANSFER_OUT: [
    { value: 'transfer', label: 'Transferencia', icon: 'Repeat', color: '#3b82f6' },
    { value: 'savings', label: 'Ahorros', icon: 'PiggyBank', color: '#10b981' },
    { value: 'investment', label: 'Inversión', icon: 'TrendingUp', color: '#8b5cf6' },
  ]
};

async function insertCategories() {
  console.log('🚀 Starting category insertion...');

  try {
    // Check if categories already exist
    const { data: existingCategories, error: checkError } = await supabase
      .from('categories')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('❌ Error checking existing categories:', checkError);
      return;
    }

    if (existingCategories && existingCategories.length > 0) {
      console.log('⚠️  Categories already exist. Skipping insertion.');
      return;
    }

    // Prepare categories for insertion
    const categoriesToInsert = [];
    
    for (const [type, categories] of Object.entries(defaultCategories)) {
      for (const category of categories) {
        categoriesToInsert.push({
          name: category.label,
          description: `Categoría predeterminada: ${category.label}`,
          icon: category.icon,
          color: category.color,
          kind: type,
          is_default: true,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }

    console.log(`📝 Inserting ${categoriesToInsert.length} default categories...`);

    // Insert categories
    const { data, error } = await supabase
      .from('categories')
      .insert(categoriesToInsert)
      .select();

    if (error) {
      console.error('❌ Error inserting categories:', error);
      return;
    }

    console.log(`✅ Successfully inserted ${data.length} categories!`);
    
    // Log summary
    const expenseCount = categoriesToInsert.filter(c => c.kind === 'EXPENSE').length;
    const incomeCount = categoriesToInsert.filter(c => c.kind === 'INCOME').length;
    const transferCount = categoriesToInsert.filter(c => c.kind === 'TRANSFER_OUT').length;
    
    console.log(`📊 Summary:`);
    console.log(`   • ${expenseCount} EXPENSE categories`);
    console.log(`   • ${incomeCount} INCOME categories`);
    console.log(`   • ${transferCount} TRANSFER_OUT categories`);
    console.log(`   • Total: ${data.length} categories`);

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

insertCategories()
  .then(() => {
    console.log('🎉 Category insertion completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Insertion failed:', error);
    process.exit(1);
  });
