/**
 * Tool Registry - Registro Centralizado de Herramientas
 * 
 * Registro centralizado de todas las herramientas disponibles para el agente.
 * Permite descubrimiento dinámico, validación de parámetros y ejecución con manejo de errores.
 */

import { logger } from '@/lib/utils/logger';
import { ChatCompletionTool } from 'openai/resources/chat/completions';
import { AI_ACTION_TOOLS, getToolByName } from '../../action-tools';
import { WalletContext } from '../../context-builder';
import { ToolResult } from '../core/types';
import { executeAction } from '../../action-executor';
import { FUNCTION_ACTION_MAP } from '../../action-tools';

/**
 * Definición de una herramienta en el registro
 */
export interface RegisteredTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: Record<string, any>, context: WalletContext, userId: string) => Promise<ToolResult>;
  requiresConfirmation?: (params: Record<string, any>) => boolean;
}

/**
 * Registro de herramientas
 */
class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();

  /**
   * Registra una herramienta
   */
  register(tool: RegisteredTool): void {
    this.tools.set(tool.name, tool);
    logger.debug(`[ToolRegistry] Registered tool: ${tool.name}`);
  }

  /**
   * Obtiene una herramienta por nombre
   */
  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Obtiene todas las herramientas registradas
   */
  getAll(): RegisteredTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Obtiene las herramientas como ChatCompletionTool para OpenAI
   */
  getAsOpenAITools(): ChatCompletionTool[] {
    return AI_ACTION_TOOLS;
  }

  /**
   * Ejecuta una herramienta
   */
  async execute(
    toolName: string,
    parameters: Record<string, any>,
    context: WalletContext,
    userId: string
  ): Promise<ToolResult> {
    const tool = this.get(toolName);
    
    if (!tool) {
      logger.error(`[ToolRegistry] Tool not found: ${toolName}`);
      return {
        success: false,
        error: `Herramienta ${toolName} no encontrada`,
      };
    }

    try {
      // Validar parámetros básicos
      const validation = this.validateParameters(tool, parameters);
      if (!validation.valid) {
        return {
          success: false,
          error: `Parámetros inválidos: ${validation.errors.join(', ')}`,
        };
      }

      // Ejecutar herramienta
      logger.info(`[ToolRegistry] Executing tool: ${toolName}`, parameters);
      const result = await tool.execute(parameters, context, userId);
      
      return result;
    } catch (error: any) {
      logger.error(`[ToolRegistry] Error executing tool ${toolName}:`, error);
      return {
        success: false,
        error: error.message || 'Error desconocido al ejecutar herramienta',
      };
    }
  }

  /**
   * Valida parámetros de una herramienta
   */
  private validateParameters(
    tool: RegisteredTool,
    parameters: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const toolDef = getToolByName(tool.name);

    if (!toolDef || !('function' in toolDef)) {
      return { valid: true, errors: [] }; // No hay definición, no validar
    }

    const schema = toolDef.function.parameters;
    if (!schema || schema.type !== 'object') {
      return { valid: true, errors: [] };
    }

    // Validar parámetros requeridos
    if (schema.required && Array.isArray(schema.required)) {
      for (const requiredParam of schema.required) {
        if (!(requiredParam in parameters) || parameters[requiredParam] === undefined) {
          errors.push(`Parámetro requerido faltante: ${requiredParam}`);
        }
      }
    }

    // Validar tipos y enums
    if (schema.properties && typeof schema.properties === 'object') {
      const properties = schema.properties as Record<string, any>;
      for (const [paramName, paramValue] of Object.entries(parameters)) {
        const paramDef = properties[paramName];
        if (!paramDef) {
          // Parámetro desconocido, pero no es error crítico
          continue;
        }

        // Validar enum
        if (paramDef.enum && !paramDef.enum.includes(paramValue)) {
          errors.push(`Parámetro ${paramName} debe ser uno de: ${paramDef.enum.join(', ')}`);
        }

        // Validar tipo básico
        if (paramDef.type === 'number' && typeof paramValue !== 'number') {
          errors.push(`Parámetro ${paramName} debe ser un número`);
        } else if (paramDef.type === 'string' && typeof paramValue !== 'string') {
          errors.push(`Parámetro ${paramName} debe ser una cadena`);
        } else if (paramDef.type === 'boolean' && typeof paramValue !== 'boolean') {
          errors.push(`Parámetro ${paramName} debe ser un booleano`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Verifica si una herramienta requiere confirmación
   */
  requiresConfirmation(toolName: string, parameters: Record<string, any>): boolean {
    const tool = this.get(toolName);
    if (!tool || !tool.requiresConfirmation) {
      return false;
    }
    return tool.requiresConfirmation(parameters);
  }
}

// Instancia singleton del registro
export const toolRegistry = new ToolRegistry();

/**
 * Inicializa el registro con todas las herramientas disponibles
 */
export function initializeToolRegistry(): void {
  // Las herramientas se registrarán automáticamente cuando se importen los módulos
  // Por ahora, el registro usa directamente AI_ACTION_TOOLS
  logger.info('[ToolRegistry] Tool registry initialized');
}

