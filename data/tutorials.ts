import type { Tutorial } from '@/hooks/use-tutorial';

export const dashboardTutorial: Tutorial = {
  id: 'dashboard',
  title: 'Dashboard - Tu Centro de Control',
  description: 'Aprende a navegar por tu panel principal y entender toda la información financiera de un vistazo.',
  steps: [
    {
      id: 'welcome',
      title: '¡Bienvenido a Cashew! 🎉',
      content: 'Este es tu dashboard o panel principal. Aquí puedes ver un resumen completo de tu situación financiera actual. Te voy a enseñar paso a paso cómo funciona todo.',
      target: 'body',
      position: 'center',
      nextButton: '¡Empecemos!'
    },
    {
      id: 'stats-cards',
      title: 'Tus Números Importantes 💰',
      content: 'Estas tarjetas te muestran lo más importante: cuánto dinero tienes en total, tus ingresos del mes, gastos y el progreso de tus metas. Los colores te ayudan a entender rápidamente si todo va bien.',
      target: '[data-tutorial="stats-grid"]',
      position: 'bottom',
      nextButton: 'Entendido'
    },
    {
      id: 'recent-transactions',
      title: 'Tus Últimos Movimientos 📱',
      content: 'Aquí ves todas las transacciones recientes con detalles completos: dónde gastaste, cuánto, a qué hora y desde qué cuenta. Los colores te ayudan: verde para ingresos, rosa para gastos.',
      target: '[data-tutorial="recent-transactions"]',
      position: 'right',
      nextButton: 'Perfecto'
    },
    {
      id: 'spending-chart',
      title: 'Visualiza tus Gastos 📊',
      content: 'Este gráfico te muestra en qué categorías gastas más dinero. Es súper útil para identificar patrones y ver dónde puedes ahorrar más.',
      target: '[data-tutorial="spending-chart"]',
      position: 'right',
      nextButton: 'Me gusta'
    },
    {
      id: 'quick-actions',
      title: 'Acciones Rápidas ⚡',
      content: 'Desde aquí puedes agregar transacciones (gastos e ingresos) o transferencias rápidamente sin navegar a otras páginas. ¡Muy conveniente para el día a día!',
      target: '[data-tutorial="quick-actions"]',
      position: 'left',
      nextButton: 'Genial'
    },
    {
      id: 'accounts-overview',
      title: 'Resumen de Cuentas 🏦',
      content: 'Ve el saldo de todas tus cuentas (banco, efectivo, tarjetas) de un vistazo. Puedes hacer clic en cualquiera para ver más detalles.',
      target: '[data-tutorial="accounts-overview"]',
      position: 'left',
      nextButton: 'Súper útil'
    },
    {
      id: 'goals-progress',
      title: 'Progreso de Metas 🎯',
      content: 'Aquí ves cómo van tus metas de ahorro. Las barras de progreso y los porcentajes te muestran qué tan cerca estás de lograr cada objetivo.',
      target: '[data-tutorial="goals-progress"]',
      position: 'top',
      nextButton: 'Motivador'
    },
    {
      id: 'navigation',
      title: 'Navegación Principal 🧭',
      content: 'Usa el menú lateral para navegar entre las diferentes secciones: Cuentas, Gastos, Categorías, Presupuestos, Metas y más. Todo está organizado de forma intuitiva.',
      target: '[data-tutorial="sidebar"]',
      position: 'right',
      nextButton: 'Entiendo'
    },
    {
      id: 'completion',
      title: '¡Tutorial Completado! 🎊',
      content: 'Ahora ya sabes cómo funciona tu dashboard. Recuerda que puedes repetir este tutorial cuando quieras desde el botón de ayuda. ¡Disfruta usando Cashew!',
      target: 'body',
      position: 'center',
      nextButton: '¡Listo para empezar!'
    }
  ]
};

export const accountsTutorial: Tutorial = {
  id: 'accounts',
  title: 'Cuentas - Administra tu Dinero',
  description: 'Aprende a gestionar todas tus cuentas bancarias, efectivo y tarjetas en un solo lugar.',
  steps: [
    {
      id: 'welcome',
      title: 'Gestión de Cuentas 🏦',
      content: 'En esta página puedes ver y administrar todas tus cuentas: cuentas bancarias, efectivo, tarjetas de crédito y más. Te explico cómo funciona todo.',
      target: 'body',
      position: 'center',
      nextButton: 'Vamos'
    },
    {
      id: 'summary-cards',
      title: 'Resumen Financiero 💳',
      content: 'Estas tarjetas te muestran el balance total, número de cuentas activas y el cambio respecto al mes pasado. También puedes mostrar u ocultar los saldos por privacidad.',
      target: '[data-tutorial="accounts-summary"]',
      position: 'bottom',
      nextButton: 'Claro'
    },
    {
      id: 'accounts-list',
      title: 'Lista de Cuentas 📋',
      content: 'Aquí ves todas tus cuentas con su saldo actual, tipo y estado. Puedes editar, eliminar o agregar nuevas cuentas fácilmente.',
      target: '[data-tutorial="accounts-list"]',
      position: 'top',
      nextButton: 'Perfecto'
    },
    {
      id: 'add-account',
      title: 'Agregar Nueva Cuenta ➕',
      content: 'Usa este botón para agregar una nueva cuenta. Puedes configurar el nombre, tipo (banco, efectivo, tarjeta), saldo inicial y moneda.',
      target: '[data-tutorial="add-account-button"]',
      position: 'bottom',
      nextButton: 'Entendido'
    },
    {
      id: 'account-actions',
      title: 'Acciones de Cuenta ⚙️',
      content: 'Cada cuenta tiene opciones para editar información, ver historial de transacciones o eliminarla si ya no la usas.',
      target: '[data-tutorial="account-card"]:first-child',
      position: 'right',
      nextButton: 'Útil'
    }
  ]
};

export const transactionsTutorial: Tutorial = {
  id: 'transactions',
  title: 'Transacciones - Controla tus Movimientos',
  description: 'Domina el registro y seguimiento de todos tus ingresos, gastos y transferencias.',
  steps: [
    {
      id: 'welcome',
      title: 'Control de Transacciones 💸',
      content: 'Aquí registras y visualizas todos tus movimientos de dinero: gastos, ingresos y transferencias. Es el corazón de tu gestión financiera.',
      target: 'body',
      position: 'center',
      nextButton: 'Empezar'
    },
    {
      id: 'summary-stats',
      title: 'Estadísticas del Mes 📈',
      content: 'Ve de un vistazo tus ingresos totales, gastos y el balance neto del mes. Los colores te ayudan: verde para ingresos, rosa para gastos.',
      target: '[data-tutorial="transactions-summary"]',
      position: 'bottom',
      nextButton: 'Claro'
    },
    {
      id: 'filters',
      title: 'Filtros Inteligentes 🔍',
      content: 'Usa estos filtros para encontrar transacciones específicas por fecha, cuenta, categoría, tipo o monto. Muy útil cuando tienes muchas transacciones.',
      target: '[data-tutorial="transaction-filters"]',
      position: 'bottom',
      nextButton: 'Genial'
    },
    {
      id: 'add-transaction',
      title: 'Agregar Transacción ➕',
      content: 'Desde aquí puedes registrar nuevos gastos, ingresos o transferencias. El formulario es simple pero completo.',
      target: '[data-tutorial="add-transaction-button"]',
      position: 'bottom',
      nextButton: 'Perfecto'
    },
    {
      id: 'transactions-list',
      title: 'Lista de Transacciones 📝',
      content: 'Todas tus transacciones aparecen aquí con información detallada: descripción, categoría, cuenta, fecha, hora y ubicación. Puedes editarlas o eliminarlas.',
      target: '[data-tutorial="transactions-list"]',
      position: 'top',
      nextButton: 'Entendido'
    }
  ]
};

export const budgetsTutorial: Tutorial = {
  id: 'budgets',
  title: 'Presupuestos - Planifica tus Gastos',
  description: 'Aprende a crear y monitorear presupuestos mensuales para mantener tus finanzas bajo control.',
  steps: [
    {
      id: 'welcome',
      title: 'Gestión de Presupuestos 💰',
      content: 'Los presupuestos te ayudan a planificar y controlar tus gastos por categoría cada mes. Te explico cómo usarlos efectivamente.',
      target: 'body',
      position: 'center',
      nextButton: 'Vamos'
    },
    {
      id: 'month-selector',
      title: 'Selector de Mes 📅',
      content: 'Cambia entre diferentes meses para ver presupuestos pasados, actuales o planificar futuros. Cada mes puede tener presupuestos diferentes.',
      target: '[data-tutorial="month-selector"]',
      position: 'bottom',
      nextButton: 'Entiendo'
    },
    {
      id: 'budget-stats',
      title: 'Estadísticas de Presupuesto 📊',
      content: 'Ve cuánto has presupuestado en total, cuánto has gastado, cuánto te queda disponible y cuántos presupuestos has sobrepasado.',
      target: '[data-tutorial="budget-stats"]',
      position: 'bottom',
      nextButton: 'Claro'
    },
    {
      id: 'budget-cards',
      title: 'Tarjetas de Presupuesto 📋',
      content: 'Cada presupuesto muestra la categoría, monto presupuestado, gastado, progreso visual y alertas si te estás pasando del límite.',
      target: '[data-tutorial="budget-cards"]',
      position: 'top',
      nextButton: 'Útil'
    },
    {
      id: 'create-budget',
      title: 'Crear Presupuesto ➕',
      content: 'Usa este botón para crear nuevos presupuestos. Selecciona la categoría, mes y monto. El sistema calculará automáticamente cuánto has gastado.',
      target: '[data-tutorial="create-budget-button"]',
      position: 'bottom',
      nextButton: 'Perfecto'
    }
  ]
};

export const goalsTutorial: Tutorial = {
  id: 'goals',
  title: 'Metas - Alcanza tus Objetivos',
  description: 'Configura y sigue el progreso de tus metas de ahorro para lograr tus objetivos financieros.',
  steps: [
    {
      id: 'welcome',
      title: 'Metas de Ahorro 🎯',
      content: 'Las metas te ayudan a ahorrar para objetivos específicos como vacaciones, casa nueva o fondo de emergencia. Te muestro cómo funcionan.',
      target: 'body',
      position: 'center',
      nextButton: 'Empezar'
    },
    {
      id: 'goals-stats',
      title: 'Estadísticas de Metas 📈',
      content: 'Ve cuántas metas tienes en total, completadas, en progreso y vencidas. También el progreso general de todas tus metas.',
      target: '[data-tutorial="goals-stats"]',
      position: 'bottom',
      nextButton: 'Genial'
    },
    {
      id: 'overall-progress',
      title: 'Progreso General 🏆',
      content: 'Esta barra muestra tu progreso total hacia todas las metas. Ve cuánto has ahorrado del total que quieres alcanzar.',
      target: '[data-tutorial="overall-progress"]',
      position: 'bottom',
      nextButton: 'Motivador'
    },
    {
      id: 'goals-filters',
      title: 'Filtros de Metas 🔍',
      content: 'Filtra tus metas por estado (todas, en progreso, completadas, vencidas) o busca por nombre para encontrar rápidamente lo que necesitas.',
      target: '[data-tutorial="goals-filters"]',
      position: 'bottom',
      nextButton: 'Útil'
    },
    {
      id: 'goal-cards',
      title: 'Tarjetas de Metas 🎪',
      content: 'Cada meta muestra el nombre, descripción, progreso visual, monto ahorrado, fecha límite y acciones como agregar dinero o editar.',
      target: '[data-tutorial="goal-cards"]',
      position: 'top',
      nextButton: 'Claro'
    },
    {
      id: 'create-goal',
      title: 'Crear Nueva Meta ➕',
      content: 'Crea nuevas metas definiendo nombre, descripción, monto objetivo, fecha límite opcional y cuenta asociada.',
      target: '[data-tutorial="create-goal-button"]',
      position: 'bottom',
      nextButton: 'Perfecto'
    }
  ]
};

export const categoriesTutorial: Tutorial = {
  id: 'categories',
  title: 'Categorías - Organiza tus Gastos',
  description: 'Aprende a crear y gestionar categorías para organizar mejor tus ingresos y gastos.',
  steps: [
    {
      id: 'welcome',
      title: 'Gestión de Categorías 🏷️',
      content: 'Las categorías te ayudan a organizar y entender mejor en qué gastas tu dinero. Puedes personalizarlas con colores e iconos.',
      target: 'body',
      position: 'center',
      nextButton: 'Vamos'
    },
    {
      id: 'category-stats',
      title: 'Estadísticas por Tipo 📊',
      content: 'Ve cuántas categorías tienes para ingresos y gastos, además del total gastado o ganado en cada tipo este mes.',
      target: '[data-tutorial="category-stats"]',
      position: 'bottom',
      nextButton: 'Entiendo'
    },
    {
      id: 'category-filters',
      title: 'Filtros y Búsqueda 🔍',
      content: 'Filtra por tipo (todas, ingresos, gastos), busca por nombre y cambia entre vista de cuadrícula o lista según prefieras.',
      target: '[data-tutorial="category-filters"]',
      position: 'bottom',
      nextButton: 'Claro'
    },
    {
      id: 'category-cards',
      title: 'Tarjetas de Categorías 🎨',
      content: 'Cada categoría muestra su icono, color, nombre, tipo y estadísticas de uso. Puedes editarlas, eliminarlas o ver detalles.',
      target: '[data-tutorial="category-cards"]',
      position: 'top',
      nextButton: 'Me gusta'
    },
    {
      id: 'create-category',
      title: 'Crear Categoría ➕',
      content: 'Crea nuevas categorías personalizando nombre, tipo (ingreso/gasto), color e icono. Esto te ayuda a organizar mejor tus finanzas.',
      target: '[data-tutorial="create-category-button"]',
      position: 'bottom',
      nextButton: 'Perfecto'
    }
  ]
};

// Export all tutorials
export const tutorials = {
  dashboard: dashboardTutorial,
  accounts: accountsTutorial,
  transactions: transactionsTutorial,
  budgets: budgetsTutorial,
  goals: goalsTutorial,
  categories: categoriesTutorial,
};

// Helper function to get tutorial by route
export function getTutorialByRoute(route: string): Tutorial | null {
  switch (route) {
    case '/':
      return dashboardTutorial;
    case '/accounts':
      return accountsTutorial;
    case '/transactions':
      return transactionsTutorial;
    case '/budgets':
      return budgetsTutorial;
    case '/goals':
      return goalsTutorial;
    case '/categories':
      return categoriesTutorial;
    default:
      return null;
  }
}
