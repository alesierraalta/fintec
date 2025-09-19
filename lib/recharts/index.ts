// Unified Recharts library for FinTec
// Replaces ECharts and Chart.js functionality

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
  ReferenceLine,
} from 'recharts';

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

// Category colors for financial data
export const categoryColors = [
  financialColors.primary,
  financialColors.success,
  financialColors.error,
  financialColors.warning,
  financialColors.info,
  financialColors.secondary,
  '#ec4899', // pink
  '#14b8a6', // teal
];

// Common chart configurations
export const chartConfig = {
  margin: { top: 20, right: 30, left: 20, bottom: 5 },
  colors: categoryColors,
  fontFamily: 'Inter, system-ui, sans-serif',
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

// Custom tooltip component
export const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-gray-700">
        <p className="font-semibold">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom label component for pie charts
export const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null; // Don't show labels for slices < 5%
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// Income vs Expenses Bar Chart
export const IncomeExpenseChart = ({ 
  data, 
  title = "Ingresos vs Gastos" 
}: { 
  data: Array<{ period: string; income: number; expenses: number }>;
  title?: string;
}) => {
  return (
    <div className="w-full h-96">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={chartConfig.margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="period" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="income" 
            name="Ingresos" 
            fill={financialColors.success}
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="expenses" 
            name="Gastos" 
            fill={financialColors.loss}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Cash Flow Line Chart
export const CashFlowChart = ({ 
  data, 
  title = "Flujo de Efectivo" 
}: { 
  data: Array<{ date: string; balance: number }>;
  title?: string;
}) => {
  return (
    <div className="w-full h-96">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={chartConfig.margin}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={financialColors.primary} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={financialColors.primary} stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={financialColors.primary}
            strokeWidth={3}
            fill="url(#balanceGradient)"
            dot={{ fill: financialColors.primary, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: financialColors.primary, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Expenses by Category Pie Chart
export const ExpensesByCategoryChart = ({ 
  data, 
  title = "Gastos por Categoría" 
}: { 
  data: Array<{ name: string; value: number }>;
  title?: string;
}) => {
  return (
    <div className="w-full h-96">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => [formatCurrency(value), 'Valor']}
            labelFormatter={(label) => `Categoría: ${label}`}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value) => <span style={{ color: '#374151' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Portfolio Performance Composed Chart
export const PortfolioChart = ({ 
  data, 
  title = "Rendimiento del Portafolio" 
}: { 
  data: Array<{ date: string; value: number; volume: number }>;
  title?: string;
}) => {
  return (
    <div className="w-full h-96">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={chartConfig.margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            yAxisId="value"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <YAxis 
            yAxisId="volume"
            orientation="right"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            yAxisId="volume"
            dataKey="volume" 
            name="Volumen" 
            fill="rgba(59, 130, 246, 0.3)"
            radius={[2, 2, 0, 0]}
          />
          <Line 
            yAxisId="value"
            type="monotone" 
            dataKey="value" 
            name="Valor" 
            stroke={financialColors.primary}
            strokeWidth={3}
            dot={{ fill: financialColors.primary, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: financialColors.primary, strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// Spending Trend Line Chart
export const SpendingTrendChart = ({ 
  data, 
  title = "Tendencia de Gastos por Categoría" 
}: { 
  data: Array<{ period: string; [key: string]: any }>;
  title?: string;
}) => {
  const categories = Object.keys(data[0] || {}).filter(key => key !== 'period');
  
  return (
    <div className="w-full h-96">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={chartConfig.margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="period" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {categories.map((category, index) => (
            <Line
              key={category}
              type="monotone"
              dataKey={category}
              name={category}
              stroke={categoryColors[index % categoryColors.length]}
              strokeWidth={2}
              dot={{ fill: categoryColors[index % categoryColors.length], strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: categoryColors[index % categoryColors.length], strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Budget Gauge Chart (using RadialBar)
export const BudgetGaugeChart = ({ 
  spent, 
  budget, 
  category,
  title 
}: { 
  spent: number;
  budget: number;
  category: string;
  title?: string;
}) => {
  const percentage = Math.min((spent / budget) * 100, 100);
  const data = [{ name: 'Gastado', value: percentage, fill: percentage > 90 ? financialColors.loss : percentage > 75 ? financialColors.warning : financialColors.success }];
  
  return (
    <div className="w-full h-96">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        {title || `Presupuesto: ${category}`}
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart 
          cx="50%" 
          cy="50%" 
          innerRadius="20%" 
          outerRadius="80%" 
          data={data}
          startAngle={180} 
          endAngle={0}
        >
          <RadialBar 
            dataKey="value" 
            cornerRadius={10} 
            fill={data[0].fill}
          />
          <text 
            x="50%" 
            y="50%" 
            textAnchor="middle" 
            dominantBaseline="middle" 
            className="text-2xl font-bold"
            fill={data[0].fill}
          >
            {percentage.toFixed(1)}%
          </text>
          <text 
            x="50%" 
            y="60%" 
            textAnchor="middle" 
            dominantBaseline="middle" 
            className="text-sm text-gray-600"
          >
            {formatCurrency(spent)} / {formatCurrency(budget)}
          </text>
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Export all components and utilities
export {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
  ReferenceLine,
};