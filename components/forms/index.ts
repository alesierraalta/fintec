import { lazy } from 'react';

// Lazy load heavy forms that are not immediately visible
export const TransactionForm = lazy(() => import('./transaction-form').then(module => ({ default: module.TransactionForm })));
export const AccountForm = lazy(() => import('./account-form').then(module => ({ default: module.AccountForm })));
export const CategoryForm = lazy(() => import('./category-form').then(module => ({ default: module.CategoryForm })));
export const BudgetForm = lazy(() => import('./budget-form').then(module => ({ default: module.BudgetForm })));
export const GoalForm = lazy(() => import('./goal-form').then(module => ({ default: module.GoalForm })));

// Keep lightweight components as regular exports
export { ColorPicker } from './color-picker';
export { IconPicker } from './icon-picker';
