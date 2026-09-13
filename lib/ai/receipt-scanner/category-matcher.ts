import type {
  CategoryCandidate,
  ReceiptLineItem,
  ScannedReceiptType,
} from './types';

export interface CategoryMatchResult {
  suggestedCategoryId?: string;
  suggestedCategoryName?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  reason?: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Keyword association map for common expense and income categories
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // Expense - Food & Groceries
  alimentacion: [
    'alimento',
    'mercado',
    'supermercado',
    'abasto',
    'viveres',
    'charcuteria',
    'carniceria',
    'panaderia',
    'fruteria',
    'queso',
    'harina',
    'leche',
    'carne',
    'pollo',
    'arroz',
    'pasta',
    'aceite',
    'cafe',
    'huevos',
    'comida',
    'groceries',
  ],
  // Expense - Health & Pharmacy
  salud: [
    'salud',
    'farmacia',
    'farmatodo',
    'locatel',
    'dronena',
    'botica',
    'medicamento',
    'medicina',
    'pastilla',
    'jarabe',
    'remedio',
    'clinica',
    'medico',
    'consulta',
    'laboratorio',
    'examenes',
    'odontologo',
    'dentista',
    'optica',
  ],
  // Expense - Restaurants & Dining
  restaurantes: [
    'restaurante',
    'almuerzo',
    'cena',
    'desayuno',
    'cafe',
    'cafeteria',
    'hamburguesa',
    'pizza',
    'sushi',
    'tacos',
    'fast food',
    'comida rapida',
    'tasca',
    'bar',
  ],
  // Expense - Transportation & Vehicles
  transporte: [
    'transporte',
    'gasolina',
    'combustible',
    'estacion de servicio',
    'bomba',
    'taxi',
    'uber',
    'ridery',
    'yummy',
    'peaje',
    'estacionamiento',
    'taller',
    'mecanico',
    'repuesto',
    'caucho',
    'bateria',
    'lavado',
    'autolavado',
  ],
  // Expense - Home & Utilities
  servicios: [
    'servicio',
    'luz',
    'electricidad',
    'corpoelec',
    'agua',
    'hidrocapital',
    'gas',
    'cantv',
    'internet',
    'fibra',
    'movistar',
    'digitel',
    'movilnet',
    'simple tv',
    'inter',
    'netuno',
    'alquiler',
    'condominio',
  ],
  // Expense - Shopping & Personal
  compras: [
    'compra',
    'ropa',
    'zapato',
    'calzado',
    'vestimenta',
    'tienda',
    'boutique',
    'ferreteria',
    'electronica',
    'computacion',
    'celular',
    'accesorios',
    'hogar',
  ],
  // Expense - Entertainment & Leisure
  entretenimiento: [
    'entretenimiento',
    'cine',
    'concierto',
    'teatro',
    'evento',
    'hotel',
    'viaje',
    'turismo',
    'pasaje',
    'ocio',
    'juego',
    'suscripcion',
    'netflix',
    'spotify',
  ],
  // Expense - Education
  educacion: [
    'educacion',
    'colegio',
    'escuela',
    'universidad',
    'instituto',
    'matricula',
    'mensualidad',
    'curso',
    'taller',
    'libro',
    'utiles',
    'papeleria',
  ],

  // Income - Salary & Employment
  salario: [
    'salario',
    'sueldo',
    'nomina',
    'quincena',
    'pago de nomina',
    'utilidades',
    'bono',
    'bonificacion',
    'remuneracion',
    'empleo',
  ],
  // Income - Freelance & Professional Services
  servicios_profesionales: [
    'honorarios',
    'freelance',
    'consultoria',
    'asesoria',
    'desarrollo',
    'diseno',
    'proyecto',
    'trabajo independiente',
    'profesional',
  ],
  // Income - Business & Sales
  ventas: [
    'venta',
    'comercio',
    'cliente',
    'cobro',
    'facturacion',
    'ingreso por venta',
    'mercancia',
    'producto',
  ],
  // Income - Investments & Trading
  inversiones: [
    'inversion',
    'rendimiento',
    'intereses',
    'dividendo',
    'ganancia',
    'binance',
    'staking',
    'trading',
    'crypto',
  ],
  // Income - Remittances & Gifts
  remesas: ['remesa', 'apoyo', 'familiar', 'ayuda', 'regalo', 'zelle'],
};

/**
 * Deterministic smart category matcher.
 * Evaluates candidate user categories against extracted receipt features.
 */
export function matchReceiptCategory(params: {
  transactionType: ScannedReceiptType;
  suggestedCategoryName?: string;
  suggestedMotive?: string;
  merchantOrCounterparty?: string;
  items?: ReceiptLineItem[];
  userCategories: CategoryCandidate[];
}): CategoryMatchResult {
  const {
    transactionType,
    suggestedCategoryName,
    suggestedMotive,
    merchantOrCounterparty,
    items = [],
    userCategories = [],
  } = params;

  if (transactionType === 'TRANSFER') {
    return {
      confidence: 'NONE',
      reason: 'Transferencia no requiere categoría de gasto/ingreso',
    };
  }

  const targetKind = transactionType === 'INCOME' ? 'INCOME' : 'EXPENSE';
  const relevantCategories = userCategories.filter(
    (c) => c.kind === targetKind
  );

  if (relevantCategories.length === 0) {
    return {
      suggestedCategoryName,
      confidence: 'NONE',
      reason: `El usuario no tiene categorías registradas de tipo ${targetKind}`,
    };
  }

  // 1. Direct / Exact Name Match with suggested category
  if (suggestedCategoryName) {
    const normSuggested = normalize(suggestedCategoryName);

    const exactMatch = relevantCategories.find(
      (c) => normalize(c.name) === normSuggested
    );
    if (exactMatch) {
      return {
        suggestedCategoryId: exactMatch.id,
        suggestedCategoryName: exactMatch.name,
        confidence: 'HIGH',
        reason: `Coincidencia exacta con la categoría "${exactMatch.name}"`,
      };
    }

    // 2. Substring or Containment Match
    const partialMatch = relevantCategories.find((c) => {
      const normCat = normalize(c.name);
      return normSuggested.includes(normCat) || normCat.includes(normSuggested);
    });

    if (partialMatch) {
      return {
        suggestedCategoryId: partialMatch.id,
        suggestedCategoryName: partialMatch.name,
        confidence: 'HIGH',
        reason: `Coincidencia parcial con la categoría "${partialMatch.name}"`,
      };
    }
  }

  // 3. Basket Line Items & Description Analysis
  const textualCorpus: string[] = [];
  if (suggestedCategoryName) textualCorpus.push(suggestedCategoryName);
  if (suggestedMotive) textualCorpus.push(suggestedMotive);
  if (merchantOrCounterparty) textualCorpus.push(merchantOrCounterparty);
  for (const item of items) {
    if (item.description) textualCorpus.push(item.description);
  }

  const fullNormalizedCorpus = normalize(textualCorpus.join(' '));

  // Score each relevant category
  let bestCategory: CategoryCandidate | null = null;
  let bestScore = 0;
  let bestReason = '';

  for (const category of relevantCategories) {
    const normCatName = normalize(category.name);
    let score = 0;

    // Direct mention of category name or individual words in text
    const catWords = normCatName.split(/\s+/).filter((w) => w.length > 3);
    for (const word of catWords) {
      const stem = word.endsWith('s') ? word.slice(0, -1) : word;
      if (
        fullNormalizedCorpus.includes(word) ||
        (stem.length >= 4 && fullNormalizedCorpus.includes(stem))
      ) {
        score += 15;
      }
    }

    // Keyword matching
    for (const [topic, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const categoryMatchesTopic =
        normCatName.includes(topic) ||
        keywords.some((kw) => normCatName.includes(kw));

      if (categoryMatchesTopic) {
        for (const kw of keywords) {
          if (fullNormalizedCorpus.includes(kw)) {
            score += 10;
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
      bestReason = `Deducido por contenido (${score} pts) para "${category.name}"`;
    }
  }

  if (bestCategory && bestScore >= 10) {
    return {
      suggestedCategoryId: bestCategory.id,
      suggestedCategoryName: bestCategory.name,
      confidence: bestScore >= 15 ? 'HIGH' : 'MEDIUM',
      reason: bestReason,
    };
  }

  // 4. Default fallback: If suggestedCategoryName provided
  if (suggestedCategoryName) {
    return {
      suggestedCategoryName,
      confidence: 'LOW',
      reason: `Sugerido por IA sin coincidencia directa con categorías del usuario`,
    };
  }

  return {
    confidence: 'NONE',
    reason: 'No se identificó categoría correspondiente',
  };
}
