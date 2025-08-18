import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale,
  TimeScale,
  TimeSeriesScale,
  type ChartConfiguration,
  type ChartData,
  type ChartOptions,
  type TooltipItem,
  type LegendItem,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale,
  TimeScale,
  TimeSeriesScale
);

// Color palette for financial charts
export const chartColors = {
  primary: {
    light: 'rgba(59, 130, 246, 0.8)',
    main: 'rgba(59, 130, 246, 1)',
    dark: 'rgba(29, 78, 216, 1)',
  },
  success: {
    light: 'rgba(34, 197, 94, 0.8)',
    main: 'rgba(34, 197, 94, 1)',
    dark: 'rgba(21, 128, 61, 1)',
  },
  error: {
    light: 'rgba(239, 68, 68, 0.8)',
    main: 'rgba(239, 68, 68, 1)',
    dark: 'rgba(185, 28, 28, 1)',
  },
  warning: {
    light: 'rgba(245, 158, 11, 0.8)',
    main: 'rgba(245, 158, 11, 1)',
    dark: 'rgba(180, 83, 9, 1)',
  },
  info: {
    light: 'rgba(14, 165, 233, 0.8)',
    main: 'rgba(14, 165, 233, 1)',
    dark: 'rgba(2, 132, 199, 1)',
  },
  purple: {
    light: 'rgba(168, 85, 247, 0.8)',
    main: 'rgba(168, 85, 247, 1)',
    dark: 'rgba(124, 58, 237, 1)',
  },
  pink: {
    light: 'rgba(236, 72, 153, 0.8)',
    main: 'rgba(236, 72, 153, 1)',
    dark: 'rgba(190, 24, 93, 1)',
  },
  gray: {
    light: 'rgba(107, 114, 128, 0.8)',
    main: 'rgba(107, 114, 128, 1)',
    dark: 'rgba(55, 65, 81, 1)',
  },
};

// Category colors for financial data
export const categoryColors = [
  chartColors.primary.main,
  chartColors.success.main,
  chartColors.error.main,
  chartColors.warning.main,
  chartColors.info.main,
  chartColors.purple.main,
  chartColors.pink.main,
  chartColors.gray.main,
];

// Default chart options with accessibility features
export const defaultChartOptions: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index',
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          size: 12,
          family: 'Inter, system-ui, sans-serif',
        },
        generateLabels: (chart) => {
          const original = ChartJS.defaults.plugins.legend.labels.generateLabels;
          const labels = original.call(this, chart);
          
          // Add accessibility attributes
          labels.forEach((label: LegendItem, index: number) => {
            label.text = `${label.text} (${index + 1} de ${labels.length})`;
          });
          
          return labels;
        },
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: 'white',
      bodyColor: 'white',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      padding: 12,
      titleFont: {
        size: 14,
        weight: 'bold',
        family: 'Inter, system-ui, sans-serif',
      },
      bodyFont: {
        size: 13,
        family: 'Inter, system-ui, sans-serif',
      },
      callbacks: {
        title: (tooltipItems: TooltipItem<any>[]) => {
          return tooltipItems[0]?.label || '';
        },
        label: (context: TooltipItem<any>) => {
          const label = context.dataset.label || '';
          const value = context.parsed.y || context.parsed;
          
          if (typeof value === 'number') {
            return `${label}: $${value.toLocaleString('es-ES', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
          }
          
          return `${label}: ${value}`;
        },
      },
    },
    title: {
      display: false, // We'll handle titles externally for better control
    },
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
        drawBorder: false,
      },
      ticks: {
        color: 'rgba(0, 0, 0, 0.6)',
        font: {
          size: 11,
          family: 'Inter, system-ui, sans-serif',
        },
      },
    },
    y: {
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
        drawBorder: false,
      },
      ticks: {
        color: 'rgba(0, 0, 0, 0.6)',
        font: {
          size: 11,
          family: 'Inter, system-ui, sans-serif',
        },
        callback: function(value: any) {
          if (typeof value === 'number') {
            return `$${value.toLocaleString('es-ES')}`;
          }
          return value;
        },
      },
    },
  },
  elements: {
    point: {
      radius: 4,
      hoverRadius: 6,
      borderWidth: 2,
    },
    line: {
      borderWidth: 3,
      tension: 0.4,
    },
    bar: {
      borderRadius: 4,
      borderSkipped: false,
    },
  },
  // Accessibility options
  onHover: (event, activeElements, chart) => {
    // Change cursor on hover
    if (chart.canvas) {
      chart.canvas.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
    }
  },
};

// Specific chart configurations
export const lineChartConfig = (
  data: ChartData<'line'>,
  options?: Partial<ChartOptions<'line'>>
): ChartConfiguration<'line'> => ({
  type: 'line',
  data,
  options: {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      filler: {
        propagate: false,
      },
    },
    scales: {
      ...defaultChartOptions.scales,
      x: {
        ...defaultChartOptions.scales?.x,
        type: 'time',
        time: {
          displayFormats: {
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy',
          },
        },
      },
    },
    ...options,
  },
});

export const barChartConfig = (
  data: ChartData<'bar'>,
  options?: Partial<ChartOptions<'bar'>>
): ChartConfiguration<'bar'> => ({
  type: 'bar',
  data,
  options: {
    ...defaultChartOptions,
    ...options,
  },
});

export const doughnutChartConfig = (
  data: ChartData<'doughnut'>,
  options?: Partial<ChartOptions<'doughnut'>>
): ChartConfiguration<'doughnut'> => ({
  type: 'doughnut',
  data,
  options: {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: 'Inter, system-ui, sans-serif',
          },
        },
      },
      tooltip: {
        ...defaultChartOptions.plugins?.tooltip,
        callbacks: {
          label: (context: TooltipItem<'doughnut'>) => {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            
            return `${label}: $${value.toLocaleString('es-ES', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} (${percentage}%)`;
          },
        },
      },
    },
    ...options,
  },
});

// Utility functions for creating chart data
export const createLineChartData = (
  labels: string[],
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
    fill?: boolean;
  }>
): ChartData<'line'> => ({
  labels,
  datasets: datasets.map((dataset, index) => ({
    label: dataset.label,
    data: dataset.data,
    borderColor: dataset.color || categoryColors[index % categoryColors.length],
    backgroundColor: dataset.fill 
      ? `${dataset.color || categoryColors[index % categoryColors.length]}20`
      : 'transparent',
    fill: dataset.fill || false,
    tension: 0.4,
  })),
});

export const createBarChartData = (
  labels: string[],
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
  }>
): ChartData<'bar'> => ({
  labels,
  datasets: datasets.map((dataset, index) => ({
    label: dataset.label,
    data: dataset.data,
    backgroundColor: dataset.color || categoryColors[index % categoryColors.length],
    borderColor: dataset.color || categoryColors[index % categoryColors.length],
    borderWidth: 1,
  })),
});

export const createDoughnutChartData = (
  labels: string[],
  data: number[],
  colors?: string[]
): ChartData<'doughnut'> => ({
  labels,
  datasets: [
    {
      data,
      backgroundColor: colors || categoryColors.slice(0, data.length),
      borderColor: '#ffffff',
      borderWidth: 2,
    },
  ],
});

// Financial-specific chart creators
export const createIncomeExpenseChart = (
  periods: string[],
  income: number[],
  expenses: number[]
): ChartConfiguration<'bar'> => {
  return barChartConfig(
    createBarChartData(periods, [
      { label: 'Ingresos', data: income, color: chartColors.success.main },
      { label: 'Gastos', data: expenses, color: chartColors.error.main },
    ]),
    {
      plugins: {
        title: {
          display: true,
          text: 'Ingresos vs Gastos',
          font: {
            size: 16,
            weight: 'bold',
          },
        },
      },
    }
  );
};

export const createCashFlowChart = (
  dates: string[],
  balances: number[]
): ChartConfiguration<'line'> => {
  return lineChartConfig(
    createLineChartData(dates, [
      {
        label: 'Saldo',
        data: balances,
        color: chartColors.primary.main,
        fill: true,
      },
    ]),
    {
      plugins: {
        title: {
          display: true,
          text: 'Flujo de Efectivo',
          font: {
            size: 16,
            weight: 'bold',
          },
        },
      },
    }
  );
};

export const createExpensesByCategoryChart = (
  categories: string[],
  amounts: number[]
): ChartConfiguration<'doughnut'> => {
  return doughnutChartConfig(
    createDoughnutChartData(categories, amounts),
    {
      plugins: {
        title: {
          display: true,
          text: 'Gastos por Categoría',
          font: {
            size: 16,
            weight: 'bold',
          },
        },
      },
    }
  );
};

// Accessibility helpers
export const addChartAccessibility = (canvas: HTMLCanvasElement, chart: ChartJS) => {
  // Add ARIA attributes
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Gráfico financiero interactivo');
  
  // Add keyboard navigation
  canvas.setAttribute('tabindex', '0');
  
  // Add keyboard event listeners
  canvas.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        // Navigate to next data point
        break;
      case 'ArrowLeft':
        event.preventDefault();
        // Navigate to previous data point
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        // Trigger tooltip or action
        break;
    }
  });
  
  // Add focus styles
  canvas.addEventListener('focus', () => {
    canvas.style.outline = '2px solid #3b82f6';
    canvas.style.outlineOffset = '2px';
  });
  
  canvas.addEventListener('blur', () => {
    canvas.style.outline = 'none';
  });
};

// Chart data formatters
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
};

export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'percent',
    minimumFractionDigits: 1,
  }).format(value / 100);
};

// Chart animation configurations
export const chartAnimations = {
  smooth: {
    duration: 1000,
    easing: 'easeInOutQuart',
  },
  fast: {
    duration: 300,
    easing: 'easeOutQuart',
  },
  bounce: {
    duration: 1500,
    easing: 'easeOutBounce',
  },
};

// Export Chart.js instance for direct use
export { ChartJS };
export default ChartJS;
