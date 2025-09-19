'use client';

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  IncomeExpenseChart,
  CashFlowChart,
  ExpensesByCategoryChart,
  PortfolioChart,
  SpendingTrendChart,
  BudgetGaugeChart,
  type FinancialChartProps,
} from '@/lib/recharts';
import { cardVariants } from '@/lib/animations';
import { useNotifications } from '@/lib/store';

// Unified chart props interface
export interface RechartsWrapperProps {
  type: 'income-expense' | 'cash-flow' | 'expenses-category' | 'portfolio' | 'spending-trend' | 'budget-gauge';
  data: any;
  title?: string;
  style?: React.CSSProperties;
  className?: string;
  loading?: boolean;
  onChartReady?: () => void;
  onDataClick?: (data: any) => void;
}

export interface RechartsWrapperRef {
  getData: () => any;
  refresh: () => void;
}

const RechartsWrapper = forwardRef<RechartsWrapperRef, RechartsWrapperProps>(({
  type,
  data,
  title,
  style = { height: '400px', width: '100%' },
  className = '',
  loading = false,
  onChartReady,
  onDataClick,
}, ref) => {
  const chartRef = useRef<any>(null);
  const { addNotification } = useNotifications();

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    getData: () => data,
    refresh: () => {
      // Force re-render by updating a dummy state
      if (chartRef.current) {
        chartRef.current.forceUpdate?.();
      }
    },
  }));

  // Handle data click
  const handleDataClick = (clickedData: any) => {
    if (onDataClick) {
      onDataClick(clickedData);
    } else {
      // Default notification
      addNotification({
        type: 'info',
        title: 'Datos del Gráfico',
        message: `Valor: ${clickedData.value || 'N/A'}`,
        read: false,
      });
    }
  };

  // Render loading state
  if (loading) {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className={`recharts-wrapper ${className}`}
        style={style}
      >
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Cargando gráfico...</span>
        </div>
      </motion.div>
    );
  }

  // Render appropriate chart based on type
  const renderChart = () => {
    switch (type) {
      case 'income-expense':
        return (
          <IncomeExpenseChart 
            data={data} 
            title={title}
          />
        );
      
      case 'cash-flow':
        return (
          <CashFlowChart 
            data={data} 
            title={title}
          />
        );
      
      case 'expenses-category':
        return (
          <ExpensesByCategoryChart 
            data={data} 
            title={title}
          />
        );
      
      case 'portfolio':
        return (
          <PortfolioChart 
            data={data} 
            title={title}
          />
        );
      
      case 'spending-trend':
        return (
          <SpendingTrendChart 
            data={data} 
            title={title}
          />
        );
      
      case 'budget-gauge':
        return (
          <BudgetGaugeChart 
            spent={data.spent}
            budget={data.budget}
            category={data.category}
            title={title}
          />
        );
      
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            Tipo de gráfico no soportado: {type}
          </div>
        );
    }
  };

  return (
    <motion.div
      ref={chartRef}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={`recharts-wrapper ${className}`}
      style={style}
      onAnimationComplete={onChartReady}
    >
      {renderChart()}
    </motion.div>
  );
});

RechartsWrapper.displayName = 'RechartsWrapper';

// Export individual chart components for direct use
export const IncomeExpenseChartWrapper = React.forwardRef<RechartsWrapperRef, Omit<RechartsWrapperProps, 'type'>>((props, ref) => {
  return <RechartsWrapper ref={ref} type="income-expense" {...props} />;
});

export const CashFlowChartWrapper = React.forwardRef<RechartsWrapperRef, Omit<RechartsWrapperProps, 'type'>>((props, ref) => {
  return <RechartsWrapper ref={ref} type="cash-flow" {...props} />;
});

export const ExpensesByCategoryChartWrapper = React.forwardRef<RechartsWrapperRef, Omit<RechartsWrapperProps, 'type'>>((props, ref) => {
  return <RechartsWrapper ref={ref} type="expenses-category" {...props} />;
});

export const PortfolioChartWrapper = React.forwardRef<RechartsWrapperRef, Omit<RechartsWrapperProps, 'type'>>((props, ref) => {
  return <RechartsWrapper ref={ref} type="portfolio" {...props} />;
});

export const SpendingTrendChartWrapper = React.forwardRef<RechartsWrapperRef, Omit<RechartsWrapperProps, 'type'>>((props, ref) => {
  return <RechartsWrapper ref={ref} type="spending-trend" {...props} />;
});

export const BudgetGaugeChartWrapper = React.forwardRef<RechartsWrapperRef, Omit<RechartsWrapperProps, 'type'>>((props, ref) => {
  return <RechartsWrapper ref={ref} type="budget-gauge" {...props} />;
});

export default RechartsWrapper;