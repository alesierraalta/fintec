import * as echarts from 'echarts';
import type {
  EChartsOption,
  LineSeriesOption,
  BarSeriesOption,
  PieSeriesOption,
  ScatterSeriesOption,
  CandlestickSeriesOption,
  GridComponentOption,
  TooltipComponentOption,
  LegendComponentOption,
  TitleComponentOption,
  DataZoomComponentOption,
  ToolboxComponentOption,
} from 'echarts';

// Financial color palette
export const financialColors = {
  profit: '#10b981', // green
  loss: '#ef4444',   // red
  neutral: '#6b7280', // gray
  primary: '#3b82f6', // blue
  secondary: '#8b5cf6', // purple
  warning: '#f59e0b', // amber
  info: '#06b6d4',   // cyan
  success: '#22c55e', // green
  gradient: {
    profit: ['#10b981', '#34d399'],
    loss: ['#ef4444', '#f87171'],
    primary: ['#3b82f6', '#60a5fa'],
    purple: ['#8b5cf6', '#a78bfa'],
  }
};

// Common theme configuration for financial charts
export const financialTheme = {
  color: [
    financialColors.primary,
    financialColors.profit,
    financialColors.loss,
    financialColors.warning,
    financialColors.info,
    financialColors.secondary,
    '#ec4899', // pink
    '#14b8a6', // teal
  ],
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    color: '#374151',
  },
  title: {
    textStyle: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 16,
      fontWeight: 600,
      color: '#111827',
    },
    subtextStyle: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 12,
      color: '#6b7280',
    },
  },
  tooltip: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    textStyle: {
      color: '#ffffff',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  },
  legend: {
    textStyle: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 12,
      color: '#374151',
    },
  },
  grid: {
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
};

// Register financial theme
echarts.registerTheme('financial', financialTheme);

// Common chart configurations
export const commonOptions: Partial<EChartsOption> = {
  animation: true,
  animationDuration: 1000,
  animationEasing: 'cubicOut',
  textStyle: {
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true,
    borderColor: '#e5e7eb',
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    textStyle: {
      color: '#ffffff',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    axisPointer: {
      type: 'cross',
      crossStyle: {
        color: '#999'
      }
    },
    formatter: (params: any) => {
      if (Array.isArray(params)) {
        let result = `<strong>${params[0].axisValue}</strong><br/>`;
        params.forEach((param: any) => {
          const value = typeof param.value === 'number' 
            ? param.value.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })
            : param.value;
          result += `${param.marker} ${param.seriesName}: ${value}<br/>`;
        });
        return result;
      }
      return `${params.marker} ${params.seriesName}: ${params.value}`;
    },
  },
  toolbox: {
    feature: {
      saveAsImage: {
        title: 'Guardar como imagen',
        name: 'grafico-financiero',
      },
      dataZoom: {
        title: {
          zoom: 'Zoom',
          back: 'Restablecer zoom'
        }
      },
    },
    iconStyle: {
      borderColor: '#6b7280',
    },
    emphasis: {
      iconStyle: {
        borderColor: '#3b82f6',
      },
    },
  },
};

// Income vs Expenses Bar Chart
export const createIncomeExpenseEChart = (
  categories: string[],
  incomeData: number[],
  expenseData: number[]
): EChartsOption => ({
  ...commonOptions,
  title: {
    text: 'Ingresos vs Gastos',
    left: 'center',
    textStyle: {
      fontSize: 18,
      fontWeight: 600,
      color: '#111827',
    },
  },
  legend: {
    data: ['Ingresos', 'Gastos'],
    bottom: 0,
  },
  xAxis: {
    type: 'category',
    data: categories,
    axisPointer: {
      type: 'shadow'
    },
    axisLine: {
      lineStyle: {
        color: '#e5e7eb',
      },
    },
    axisLabel: {
      color: '#6b7280',
    },
  },
  yAxis: {
    type: 'value',
    axisLine: {
      lineStyle: {
        color: '#e5e7eb',
      },
    },
    axisLabel: {
      color: '#6b7280',
      formatter: (value: number) => 
        value.toLocaleString('es-ES', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }),
    },
    splitLine: {
      lineStyle: {
        color: '#f3f4f6',
      },
    },
  },
  series: [
    {
      name: 'Ingresos',
      type: 'bar',
      data: incomeData,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: financialColors.gradient.profit[1] },
          { offset: 1, color: financialColors.gradient.profit[0] },
        ]),
        borderRadius: [4, 4, 0, 0],
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(16, 185, 129, 0.3)',
        },
      },
    },
    {
      name: 'Gastos',
      type: 'bar',
      data: expenseData,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: financialColors.gradient.loss[1] },
          { offset: 1, color: financialColors.gradient.loss[0] },
        ]),
        borderRadius: [4, 4, 0, 0],
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(239, 68, 68, 0.3)',
        },
      },
    },
  ],
});

// Cash Flow Line Chart
export const createCashFlowEChart = (
  dates: string[],
  balanceData: number[]
): EChartsOption => ({
  ...commonOptions,
  title: {
    text: 'Flujo de Efectivo',
    left: 'center',
    textStyle: {
      fontSize: 18,
      fontWeight: 600,
      color: '#111827',
    },
  },
  xAxis: {
    type: 'category',
    data: dates,
    boundaryGap: false,
    axisLine: {
      lineStyle: {
        color: '#e5e7eb',
      },
    },
    axisLabel: {
      color: '#6b7280',
    },
  },
  yAxis: {
    type: 'value',
    axisLine: {
      lineStyle: {
        color: '#e5e7eb',
      },
    },
    axisLabel: {
      color: '#6b7280',
      formatter: (value: number) => 
        value.toLocaleString('es-ES', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }),
    },
    splitLine: {
      lineStyle: {
        color: '#f3f4f6',
      },
    },
  },
  series: [
    {
      name: 'Balance',
      type: 'line',
      data: balanceData,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        width: 3,
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: financialColors.gradient.primary[0] },
          { offset: 1, color: financialColors.gradient.primary[1] },
        ]),
      },
      itemStyle: {
        color: financialColors.primary,
        borderColor: '#ffffff',
        borderWidth: 2,
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
          { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
        ]),
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(59, 130, 246, 0.5)',
        },
      },
    },
  ],
  dataZoom: [
    {
      type: 'inside',
      start: 0,
      end: 100,
    },
    {
      start: 0,
      end: 100,
      height: 30,
      bottom: 30,
    },
  ],
});

// Expenses by Category Pie Chart
export const createExpensesByCategoryEChart = (
  categories: string[],
  amounts: number[]
): EChartsOption => {
  const data = categories.map((category, index) => ({
    name: category,
    value: amounts[index],
  }));

  return {
    ...commonOptions,
    title: {
      text: 'Gastos por Categoría',
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 600,
        color: '#111827',
      },
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 10,
      top: 20,
      bottom: 20,
      data: categories,
    },
    series: [
      {
        name: 'Gastos',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        label: {
          formatter: '{b}: {d}%',
          fontSize: 12,
        },
        labelLine: {
          length: 15,
          length2: 10,
        },
      },
    ],
  };
};

// Portfolio Performance Candlestick Chart
export const createPortfolioEChart = (
  dates: string[],
  ohlcData: number[][],  // [open, high, low, close]
  volumeData: number[]
): EChartsOption => ({
  ...commonOptions,
  title: {
    text: 'Rendimiento del Portafolio',
    left: 'center',
  },
  legend: {
    data: ['Precio', 'Volumen'],
    bottom: 0,
  },
  grid: [
    {
      left: '3%',
      right: '4%',
      height: '60%',
    },
    {
      left: '3%',
      right: '4%',
      top: '70%',
      height: '20%',
    },
  ],
  xAxis: [
    {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLine: { onZero: false },
      splitLine: { show: false },
      min: 'dataMin',
      max: 'dataMax',
    },
    {
      type: 'category',
      gridIndex: 1,
      data: dates,

      boundaryGap: false,
      axisLine: { onZero: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      min: 'dataMin',
      max: 'dataMax',
    },
  ],
  yAxis: [
    {

      splitArea: {
        show: true,
      },
    },
    {

      gridIndex: 1,
      splitNumber: 2,
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
    },
  ],
  series: [
    {
      name: 'Precio',
      type: 'candlestick',
      data: ohlcData,
      itemStyle: {
        color: financialColors.profit,
        color0: financialColors.loss,
        borderColor: financialColors.profit,
        borderColor0: financialColors.loss,
      },
    },
    {
      name: 'Volumen',
      type: 'bar',
      xAxisIndex: 1,
      yAxisIndex: 1,
      data: volumeData,
      itemStyle: {
        color: 'rgba(59, 130, 246, 0.3)',
      },
    },
  ],
  dataZoom: [
    {
      type: 'inside',
      xAxisIndex: [0, 1],
      start: 50,
      end: 100,
    },
    {
      show: true,
      xAxisIndex: [0, 1],
      type: 'slider',
      bottom: 10,
      start: 50,
      end: 100,
    },
  ],
});

// Monthly Spending Trend Chart
export const createSpendingTrendEChart = (
  months: string[],
  categories: string[],
  data: { [category: string]: number[] }
): EChartsOption => {
  const series = categories.map((category, index) => ({
    name: category,
    type: 'line' as const,
    data: data[category],
    smooth: true,
    symbol: 'circle',
    symbolSize: 4,
    lineStyle: {
      width: 2,
    },
    itemStyle: {
      color: Object.values(financialColors).filter(v => typeof v === 'string')[index % Object.values(financialColors).filter(v => typeof v === 'string').length],
    },
  }));

  return {
    ...commonOptions,
    title: {
      text: 'Tendencia de Gastos por Categoría',
      left: 'center',
    },
    legend: {
      data: categories,
      bottom: 0,
      type: 'scroll',
    },
    xAxis: {
      type: 'category',
      data: months,
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => 
          value.toLocaleString('es-ES', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }),
      },
    },
    series,
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
      },
    ],
  };
};

// Budget vs Actual Gauge Chart
export const createBudgetGaugeEChart = (
  spent: number,
  budget: number,
  category: string
): EChartsOption => {
  const percentage = Math.min((spent / budget) * 100, 100);
  
  return {
    ...commonOptions,
    title: {
      text: `Presupuesto: ${category}`,
      left: 'center',
      top: '10%',
    },
    series: [
      {
        name: 'Presupuesto',
        type: 'gauge',
        center: ['50%', '60%'],
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        splitNumber: 10,
        itemStyle: {
          color: percentage > 90 ? financialColors.loss : 
                 percentage > 75 ? financialColors.warning : 
                 financialColors.profit,
        },
        progress: {
          show: true,
          width: 30,
        },
        pointer: {
          show: false,
        },
        axisLine: {
          lineStyle: {
            width: 30,
            color: [
              [0.75, financialColors.profit],
              [0.9, financialColors.warning],
              [1, financialColors.loss],
            ],
          },
        },
        axisTick: {
          distance: -45,
          splitNumber: 5,
          lineStyle: {
            width: 2,
            color: '#999',
          },
        },
        splitLine: {
          distance: -52,
          length: 14,
          lineStyle: {
            width: 3,
            color: '#999',
          },
        },
        axisLabel: {
          distance: -20,
          color: '#999',
          fontSize: 12,
          formatter: (value: number) => `${value}%`,
        },
        anchor: {
          show: false,
        },
        title: {
          show: false,
        },
        detail: {
          valueAnimation: true,
          width: '60%',
          lineHeight: 40,
          borderRadius: 8,
          offsetCenter: [0, '-15%'],
          fontSize: 20,
          fontWeight: 'bold',
          formatter: (value: number) => {
            return `{value|${value.toFixed(1)}%}\n{name|${spent.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })} / ${budget.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })}}`;
          },
          rich: {
            value: {
              fontSize: 24,
              fontWeight: 'bold',
              color: percentage > 90 ? financialColors.loss : financialColors.primary,
            },
            name: {
              fontSize: 14,
              color: '#6b7280',
              padding: [5, 0, 0, 0],
            },
          },
        },
        data: [
          {
            value: percentage,
          },
        ],
      },
    ],
  };
};

// Utility functions
export const formatCurrency = (value: number): string => {
  return value.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// ECharts instance management
export const createEChartsInstance = (
  container: HTMLElement,
  theme: string = 'financial'
): echarts.ECharts => {
  return echarts.init(container, theme, {
    renderer: 'canvas',
    useDirtyRect: true,
  });
};

export const disposeEChartsInstance = (instance: echarts.ECharts): void => {
  if (instance && !instance.isDisposed()) {
    instance.dispose();
  }
};

// Responsive helper
export const makeEChartsResponsive = (instance: echarts.ECharts): () => void => {
  const resizeHandler = () => {
    if (instance && !instance.isDisposed()) {
      instance.resize();
    }
  };

  window.addEventListener('resize', resizeHandler);
  
  return () => {
    window.removeEventListener('resize', resizeHandler);
  };
};

// Export echarts instance for direct use
export { echarts };
export default echarts;
