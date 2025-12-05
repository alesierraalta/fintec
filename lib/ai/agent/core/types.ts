/**
 * Types for Agentic AI System
 * 
 * Tipos compartidos para el sistema agéntico.
 */

import { WalletContext } from '../../context-builder';

/**
 * Tipo de acción que puede realizar el agente
 */
export type AgentActionType =
  | 'CREATE_TRANSACTION'
  | 'CREATE_BUDGET'
  | 'CREATE_GOAL'
  | 'CREATE_ACCOUNT'
  | 'CREATE_TRANSFER'
  | 'QUERY_BALANCE'
  | 'QUERY_TRANSACTIONS'
  | 'QUERY_BUDGETS'
  | 'QUERY_GOALS'
  | 'QUERY_ACCOUNTS'
  | 'QUERY_RATES'
  | 'QUERY_CATEGORIES'
  | 'QUERY_RECURRING'
  | 'QUERY_FINANCIAL_DATA'
  | 'ANALYZE_SPENDING'
  | 'CALCULATE_PERCENTAGES'
  | 'GET_FINANCIAL_SUMMARY'
  | 'COMPARE_PERIODS'
  | 'ANALYZE_BY_CATEGORY'
  | 'GET_SPENDING_TRENDS'
  | 'UNKNOWN';

/**
 * Plan de tareas generado por el planificador
 */
export interface TaskPlan {
  id: string;
  tasks: Task[];
  estimatedSteps: number;
  requiresConfirmation: boolean;
}

/**
 * Tarea individual en un plan
 */
export interface Task {
  id: string;
  type: AgentActionType;
  toolName: string;
  parameters: Record<string, any>;
  description: string;
  dependsOn?: string[]; // IDs de tareas de las que depende
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

/**
 * Resultado del razonamiento del agente
 */
export interface ReasoningResult {
  intention: string;
  confidence: number;
  reasoning: string;
  suggestedTools: string[];
  requiresPlanning: boolean;
}

/**
 * Estado del agente durante una conversación
 */
export interface AgentState {
  conversationId?: string;
  currentPlan?: TaskPlan;
  completedTasks: Task[];
  context: WalletContext;
  reasoningHistory: ReasoningResult[];
}

/**
 * Resultado de ejecución de una herramienta
 */
export interface ToolResult {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
  requiresConfirmation?: boolean;
}

/**
 * Configuración del agente
 */
export interface AgentConfig {
  useSequentialThinking: boolean;
  maxPlanningDepth: number;
  enableAutoExecution: boolean;
  requireConfirmationFor: AgentActionType[];
}

