'use client';

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import {
  echarts,
  createEChartsInstance,
  disposeEChartsInstance,
  makeEChartsResponsive,
  createIncomeExpenseEChart,
  createCashFlowEChart,
  createExpensesByCategoryEChart,
  createPortfolioEChart,
  createSpendingTrendEChart,
  createBudgetGaugeEChart,
  formatCurrency,
} from '@/lib/echarts';
import type { EChartsOption } from 'echarts';
import { cardVariants } from '@/lib/animations';
import { useNotifications } from '@/lib/store';

interface EChartsWrapperProps {
  option: EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  loading?: boolean;
  theme?: string;
  onChartReady?: (instance: echarts.ECharts) => void;
  onEvents?: { [eventName: string]: (params: any) => void };
  notMerge?: boolean;
  lazyUpdate?: boolean;
  showLoading?: boolean;
  loadingOption?: {
    text?: string;
    color?: string;
    textColor?: string;
    maskColor?: string;
    zlevel?: number;
  };
}

export interface EChartsWrapperRef {
  getInstance: () => echarts.ECharts | null;
  resize: () => void;
  dispose: () => void;
}

const EChartsWrapper = forwardRef<EChartsWrapperRef, EChartsWrapperProps>(({
  option,
  style = { height: '400px', width: '100%' },
  className = '',
  loading = false,
  theme = 'financial',
  onChartReady,
  onEvents = {},
  notMerge = false,
  lazyUpdate = false,
  showLoading = false,
  loadingOption = {
    text: 'Cargando...',
    color: '#3b82f6',
    textColor: '#374151',
    maskColor: 'rgba(255, 255, 255, 0.8)',
    zlevel: 0,
  },
}, ref) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { addNotification } = useNotifications();

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    getInstance: () => instanceRef.current,
    resize: () => instanceRef.current?.resize(),
    dispose: () => {
      if (instanceRef.current) {
        disposeEChartsInstance(instanceRef.current);
        instanceRef.current = null;
      }
    },
  }));

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current) return;

    try {
      // Create chart instance
      instanceRef.current = createEChartsInstance(chartRef.current, theme);
      
      // Set up resize handler
      resizeHandlerRef.current = makeEChartsResponsive(instanceRef.current);
      
      // Add event listeners
      Object.entries(onEvents).forEach(([eventName, handler]) => {
        instanceRef.current?.on(eventName, handler);
      });

      // Add default click event for accessibility
      instanceRef.current.on('click', (params) => {
        if (params.componentType === 'series') {
          const value = typeof params.value === 'number' ? formatCurrency(params.value) : params.value;
          addNotification({
            type: 'info',
            title: `${params.seriesName}`,
            message: `${params.name}: ${value}`,
            read: false,
          });
        }
      });

      setIsReady(true);
      onChartReady?.(instanceRef.current);

    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error en gráfico',
        message: 'No se pudo cargar el gráfico',
        read: false,
      });
    }

    // Cleanup
    return () => {
      if (resizeHandlerRef.current) {
        resizeHandlerRef.current();
      }
      if (instanceRef.current) {
        disposeEChartsInstance(instanceRef.current);
        instanceRef.current = null;
      }
    };
  }, [theme, onChartReady, addNotification]);

  // Update chart option
  useEffect(() => {
    if (!instanceRef.current || !isReady) return;

    try {
      instanceRef.current.setOption(option, notMerge, lazyUpdate);
    } catch (error) {
    }
  }, [option, notMerge, lazyUpdate, isReady]);

  // Handle loading state
  useEffect(() => {
    if (!instanceRef.current) return;

    if (loading || showLoading) {
      instanceRef.current.showLoading('default', loadingOption);
    } else {
      instanceRef.current.hideLoading();
    }
  }, [loading, showLoading, loadingOption]);

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={`echarts-wrapper ${className}`}
      style={style}
    >
      <div
        ref={chartRef}
        style={{ width: '100%', height: '100%' }}
        role="img"
        aria-label="Gráfico financiero interactivo"
        tabIndex={0}
        onKeyDown={(e) => {
          // Basic keyboard navigation
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            // Could trigger tooltip or other interaction
          }
        }}
      />
    </motion.div>
  );
});

EChartsWrapper.displayName = 'EChartsWrapper';

// Pre-configured financial chart components
interface FinancialChartProps {
  style?: React.CSSProperties;
  className?: string;
  loading?: boolean;
}

export const IncomeExpenseChart = React.forwardRef<EChartsWrapperRef, FinancialChartProps & {
  categories: string[];
  incomeData: number[];
  expenseData: number[];
}>(({ categories, incomeData, expenseData, ...props }, ref) => {
  const option = createIncomeExpenseEChart(categories, incomeData, expenseData);
  return <EChartsWrapper ref={ref} option={option} {...props} />;
});

IncomeExpenseChart.displayName = 'IncomeExpenseChart';

export const CashFlowChart = React.forwardRef<EChartsWrapperRef, FinancialChartProps & {
  dates: string[];
  balanceData: number[];
}>(({ dates, balanceData, ...props }, ref) => {
  const option = createCashFlowEChart(dates, balanceData);
  return <EChartsWrapper ref={ref} option={option} {...props} />;
});

CashFlowChart.displayName = 'CashFlowChart';

export const ExpensesByCategoryChart = React.forwardRef<EChartsWrapperRef, FinancialChartProps & {
  categories: string[];
  amounts: number[];
}>(({ categories, amounts, ...props }, ref) => {
  const option = createExpensesByCategoryEChart(categories, amounts);
  return <EChartsWrapper ref={ref} option={option} {...props} />;
});

ExpensesByCategoryChart.displayName = 'ExpensesByCategoryChart';

export const PortfolioChart = React.forwardRef<EChartsWrapperRef, FinancialChartProps & {
  dates: string[];
  ohlcData: number[][];
  volumeData: number[];
}>(({ dates, ohlcData, volumeData, ...props }, ref) => {
  const option = createPortfolioEChart(dates, ohlcData, volumeData);
  return <EChartsWrapper ref={ref} option={option} {...props} />;
});

PortfolioChart.displayName = 'PortfolioChart';

export const SpendingTrendChart = React.forwardRef<EChartsWrapperRef, FinancialChartProps & {
  months: string[];
  categories: string[];
  data: { [category: string]: number[] };
}>(({ months, categories, data, ...props }, ref) => {
  const option = createSpendingTrendEChart(months, categories, data);
  return <EChartsWrapper ref={ref} option={option} {...props} />;
});

SpendingTrendChart.displayName = 'SpendingTrendChart';

export const BudgetGaugeChart = React.forwardRef<EChartsWrapperRef, FinancialChartProps & {
  spent: number;
  budget: number;
  category: string;
}>(({ spent, budget, category, ...props }, ref) => {
  const option = createBudgetGaugeEChart(spent, budget, category);
  return <EChartsWrapper ref={ref} option={option} {...props} />;
});

BudgetGaugeChart.displayName = 'BudgetGaugeChart';

export default EChartsWrapper;
