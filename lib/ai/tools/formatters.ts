import { Transaction } from '@/types';

/**
 * Extended transaction type for formatting purposes
 */
type TransactionWithCategory = Transaction & {
    categoryName?: string;
    accountName?: string;
};



/**
 * Formatea un monto en formato legible con símbolo de moneda.
 * 
 * @param amountMinor - Monto en unidades menores (centavos)
 * @param currencyCode - Código de moneda (USD, VES, etc.)
 * @returns Monto formateado (ej: "$1,234.56")
 * 
 * @example
 * formatCurrency(123456, 'USD') // => "$1,234.56"
 * formatCurrency(0, 'USD') // => "$0.00"
 * formatCurrency(-5000, 'USD') // => "-$50.00"
 */
export function formatCurrency(amountMinor: number, currencyCode: string = 'USD'): string {
    const amountMajor = amountMinor / 100;
    const sign = amountMajor < 0 ? '-' : '';
    const absAmount = Math.abs(amountMajor);

    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(absAmount);

    // Mapeo de símbolos de moneda
    const currencySymbols: Record<string, string> = {
        'USD': '$',
        'VES': 'Bs.',
        'EUR': '€',
        'BTC': '₿',
    };

    const symbol = currencySymbols[currencyCode] || currencyCode;

    return `${sign}${symbol}${formatted}`;
}

/**
 * Formatea una fecha ISO en formato legible en español.
 * 
 * @param isoDate - Fecha en formato ISO (YYYY-MM-DD)
 * @returns Fecha formateada (ej: "05 Ene 2026")
 * 
 * @example
 * formatDate('2026-01-05') // => "05 Ene 2026"
 * formatDate('2025-12-30') // => "30 Dic 2025"
 */
export function formatDate(isoDate: string): string {
    const monthNames = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];

    const date = new Date(isoDate + 'T00:00:00'); // Evitar problemas de timezone
    const day = date.getDate().toString().padStart(2, '0');
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
}

/**
 * Mapea una categoría a su emoji correspondiente.
 * 
 * @param category - Nombre de la categoría
 * @returns Emoji representativo
 * 
 * @example
 * getCategoryEmoji('Food') // => "🍽️"
 * getCategoryEmoji('Transport') // => "🚗"
 * getCategoryEmoji('Unknown') // => "💰"
 */
export function getCategoryEmoji(category: string): string {
    const categoryMap: Record<string, string> = {
        // Gastos comunes
        'food': '🍽️',
        'comida': '🍽️',
        'restaurant': '🍽️',
        'groceries': '🛒',
        'supermercado': '🛒',

        'transport': '🚗',
        'transporte': '🚗',
        'gas': '⛽',
        'gasolina': '⛽',
        'taxi': '🚕',

        'entertainment': '🎮',
        'entretenimiento': '🎮',
        'movies': '🎬',
        'cine': '🎬',
        'games': '🎮',

        'shopping': '🛍️',
        'compras': '🛍️',
        'clothes': '👕',
        'ropa': '👕',

        'health': '🏥',
        'salud': '🏥',
        'pharmacy': '💊',
        'farmacia': '💊',
        'gym': '💪',

        'bills': '📄',
        'facturas': '📄',
        'utilities': '💡',
        'servicios': '💡',
        'rent': '🏠',
        'alquiler': '🏠',

        'education': '📚',
        'educación': '📚',
        'books': '📖',
        'libros': '📖',

        // Ingresos
        'salary': '💼',
        'salario': '💼',
        'sueldo': '💼',
        'quincena': '💼',
        'income': '💵',
        'ingreso': '💵',
        'bonus': '🎁',
        'bono': '🎁',

        // Transferencias y préstamos
        'transfer': '🔄',
        'transferencia': '🔄',
        'loan': '💸',
        'préstamo': '💸',
        'prestamo': '💸',

        // Inversiones
        'investment': '📈',
        'inversión': '📈',
        'crypto': '₿',
        'stocks': '📊',

        // Otros
        'gift': '🎁',
        'regalo': '🎁',
        'savings': '🐷',
        'ahorros': '🐷',
        'other': '💰',
        'otros': '💰',
    };

    const normalized = category.toLowerCase().trim();
    return categoryMap[normalized] || '💰';
}

/**
 * Formatea una lista de transacciones con resumen estadístico.
 * 
 * @param transactions - Array de transacciones
 * @param limit - Número máximo de transacciones a mostrar
 * @returns String formateado con resumen y lista
 */
export function formatTransactionsList(
    transactions: TransactionWithCategory[],
    limit: number = 10
): string {
    if (transactions.length === 0) {
        return '📭 No se encontraron transacciones.';
    }

    // Calcular estadísticas
    let totalExpenses = 0;
    let totalIncome = 0;

    transactions.forEach(tx => {
        if (tx.type === 'EXPENSE') {
            totalExpenses += tx.amountBaseMinor;
        } else {
            totalIncome += tx.amountBaseMinor;
        }
    });

    const netBalance = totalIncome - totalExpenses;

    // Construir respuesta
    const lines: string[] = [];

    // Encabezado
    lines.push(`📊 Encontré ${transactions.length} transacción${transactions.length !== 1 ? 'es' : ''}`);
    if (transactions.length > limit) {
        lines.push(`(mostrando las ${limit} más recientes)`);
    }
    lines.push('');

    // Resumen estadístico
    lines.push('💰 Resumen:');
    lines.push(`• Total gastado: ${formatCurrency(totalExpenses)}`);
    lines.push(`• Total ingresado: ${formatCurrency(totalIncome)}`);
    lines.push(`• Balance neto: ${formatCurrency(netBalance)}`);
    lines.push('');

    // Lista de transacciones
    lines.push('📅 Transacciones recientes:');

    const displayTransactions = transactions.slice(0, limit);

    displayTransactions.forEach(tx => {
        const emoji = getCategoryEmoji(tx.categoryName || 'other');
        const date = formatDate(tx.date);
        const amount = tx.type === 'EXPENSE'
            ? `-${formatCurrency(tx.amountBaseMinor, tx.currencyCode)}`
            : `+${formatCurrency(tx.amountBaseMinor, tx.currencyCode)}`;
        const accountTag = tx.accountName ? ` | 📌 ${tx.accountName}` : '';

        lines.push(`• ${date} | ${emoji} ${tx.description} | ${amount}${accountTag}`);
    });

    if (transactions.length > limit) {
        lines.push(`\n... y ${transactions.length - limit} más`);
    }

    return lines.join('\n');
}

/**
 * Formatea el balance de una o varias cuentas.
 * 
 * @param accounts - Array de cuentas con balance
 * @returns String formateado con balances
 */
export function formatAccountBalance(
    accounts: Array<{ name: string; balance: number; currencyCode: string }>
): string {
    if (accounts.length === 0) {
        return '❌ No se encontraron cuentas.';
    }

    if (accounts.length === 1) {
        const account = accounts[0];
        return `💰 Cuenta "${account.name}": ${formatCurrency(account.balance, account.currencyCode)}`;
    }

    // Múltiples cuentas
    const lines: string[] = [];
    lines.push('💰 Balances de cuentas:\n');

    accounts.forEach(account => {
        const balance = formatCurrency(account.balance, account.currencyCode);
        lines.push(`• ${account.name}: ${balance}`);
    });

    // Calcular total (solo cuentas en USD para simplificar)
    const usdAccounts = accounts.filter(a => a.currencyCode === 'USD');
    if (usdAccounts.length > 0) {
        const totalUSD = usdAccounts.reduce((sum, a) => sum + a.balance, 0);
        lines.push(`\n📊 Total USD: ${formatCurrency(totalUSD)}`);
    }

    return lines.join('\n');
}

/**
 * Formatea la respuesta de creación de transacción.
 * 
 * @param transaction - Transacción creada
 * @returns Mensaje de confirmación formateado
 */
export function formatTransactionCreated(transaction: {
    description: string;
    amountBaseMinor: number;
    currencyCode: string;
    type: 'INCOME' | 'EXPENSE';
    categoryName?: string;
    date: string;
}): string {
    const emoji = transaction.type === 'INCOME' ? '✅' : '💸';
    const categoryEmoji = getCategoryEmoji(transaction.categoryName || 'other');
    const amount = formatCurrency(transaction.amountBaseMinor, transaction.currencyCode);
    const date = formatDate(transaction.date);
    const typeText = transaction.type === 'INCOME' ? 'Ingreso' : 'Gasto';

    return [
        `${emoji} ${typeText} registrado exitosamente`,
        '',
        `${categoryEmoji} ${transaction.description}`,
        `💰 Monto: ${amount}`,
        `📅 Fecha: ${date}`,
        transaction.categoryName ? `🏷️ Categoría: ${transaction.categoryName}` : '',
    ].filter(Boolean).join('\n');
}

/**
 * Formatea la respuesta de creación de meta.
 * 
 * @param goal - Meta creada
 * @returns Mensaje de confirmación formateado
 */
export function formatGoalCreated(goal: {
    name: string;
    targetBaseMinor: number;
    targetDate: string;
}): string {
    const target = formatCurrency(goal.targetBaseMinor);
    const deadline = formatDate(goal.targetDate);

    return [
        '🎯 Meta creada exitosamente',
        '',
        `📝 Nombre: ${goal.name}`,
        `💰 Objetivo: ${target}`,
        `📅 Fecha límite: ${deadline}`,
        '',
        '¡Mucho éxito alcanzando tu meta! 🚀',
    ].join('\n');
}
