/**
 * Prompt Manager
 * 
 * Gestiona la composición dinámica de prompts modulares.
 * Optimiza el uso de tokens mediante selección inteligente de componentes.
 */

import { PromptTemplate, PromptComponent, PromptCompositionConfig, ComposedPrompt } from './types';
import { identityTemplate } from './templates/identity';
import { capabilitiesTemplate } from './templates/capabilities';
import { getInstructionsTemplate } from './templates/instructions';
import { createContextTemplate } from './templates/context';
import { getExamplesTemplate } from './templates/examples';
import { WalletContext } from '../context-builder';
import { getCachedPrompt, setCachedPrompt } from './cache';
import { logger } from '@/lib/utils/logger';

/**
 * Tipo de factory para templates
 */
type TemplateFactory = (userContext?: any, walletContext?: WalletContext, proactiveSuggestions?: string) => PromptTemplate;

/**
 * Registro de templates disponibles
 */
const templateRegistry: Map<PromptComponent, TemplateFactory> = new Map([
  ['identity', () => identityTemplate],
  ['capabilities', () => capabilitiesTemplate],
  ['instructions', (userContext?: any) => getInstructionsTemplate(userContext)],
  ['context', (_?: any, walletContext?: WalletContext, proactiveSuggestions?: string) => 
    walletContext ? createContextTemplate(walletContext, proactiveSuggestions) : identityTemplate],
  ['examples', () => getExamplesTemplate(true, true, true)],
]);

/**
 * Prompt Manager Class
 */
export class PromptManager {
  /**
   * Compone un prompt completo según la configuración
   * Con soporte para caché en Redis
   */
  static async composePrompt(
    config: PromptCompositionConfig,
    context?: WalletContext,
    proactiveSuggestions?: string,
    userId?: string
  ): Promise<ComposedPrompt> {
    try {
      // Intentar obtener del caché si hay userId y Redis está disponible
      if (userId && context) {
        const cached = await getCachedPrompt(userId, config.components, context);
        if (cached) {
          logger.debug(`[PromptManager] Using cached prompt for user ${userId}`);
          return cached;
        }
      }

      // Resolver dependencias y ordenar componentes por prioridad
      const resolvedComponents = this.resolveComponents(config.components, config.userContext, context, proactiveSuggestions);
      
      // Construir el prompt compuesto
      const contentParts: string[] = [];
      const includedComponents: PromptComponent[] = [];

      for (const component of resolvedComponents) {
        const template = this.getTemplate(component, config.userContext, context, proactiveSuggestions);
        
        if (template && !template.optional) {
          contentParts.push(template.content);
          includedComponents.push(component);
        } else if (template && template.optional && config.options?.includeExamples) {
          contentParts.push(template.content);
          includedComponents.push(component);
        }
      }

      // Optimizar: eliminar duplicados si está habilitado
      let finalContent = contentParts.join('\n\n');
      if (config.options?.removeDuplicates) {
        finalContent = this.removeDuplicateLines(finalContent);
      }

      // Estimar tokens (aproximado: 1 token ≈ 4 caracteres)
      const estimatedTokens = Math.ceil(finalContent.length / 4);

      const composed: ComposedPrompt = {
        content: finalContent,
        components: includedComponents,
        version: '1.0.0',
        estimatedTokens,
        timestamp: Date.now(),
      };

      // Guardar en caché si hay userId
      if (userId && context) {
        await setCachedPrompt(userId, composed, context);
      }

      return composed;
    } catch (error) {
      logger.error('[PromptManager] Error composing prompt:', error);
      throw error;
    }
  }

  /**
   * Resuelve dependencias y ordena componentes por prioridad
   */
  private static resolveComponents(
    components: PromptComponent[],
    userContext?: any,
    walletContext?: WalletContext,
    proactiveSuggestions?: string
  ): PromptComponent[] {
    const resolved = new Set<PromptComponent>();
    const componentMap = new Map<PromptComponent, PromptTemplate>();

    // Resolver todos los componentes y sus dependencias
    for (const component of components) {
      this.resolveComponent(component, resolved, componentMap, userContext, walletContext, proactiveSuggestions);
    }

    // Ordenar por prioridad (mayor = primero)
    const sorted = Array.from(resolved).sort((a, b) => {
      const templateA = componentMap.get(a);
      const templateB = componentMap.get(b);
      const priorityA = templateA?.priority || 0;
      const priorityB = templateB?.priority || 0;
      return priorityB - priorityA;
    });

    return sorted;
  }

  /**
   * Resuelve un componente y sus dependencias recursivamente
   */
  private static resolveComponent(
    component: PromptComponent,
    resolved: Set<PromptComponent>,
    componentMap: Map<PromptComponent, PromptTemplate>,
    userContext?: any,
    walletContext?: WalletContext,
    proactiveSuggestions?: string
  ): void {
    if (resolved.has(component)) {
      return;
    }

    const template = this.getTemplate(component, userContext, walletContext, proactiveSuggestions);
    if (!template) {
      logger.warn(`[PromptManager] Template not found for component: ${component}`);
      return;
    }

    // Resolver dependencias primero
    if (template.dependencies) {
      for (const dep of template.dependencies) {
        this.resolveComponent(dep, resolved, componentMap, userContext, walletContext, proactiveSuggestions);
      }
    }

    // Agregar el componente
    resolved.add(component);
    componentMap.set(component, template);
  }

  /**
   * Obtiene un template para un componente
   */
  private static getTemplate(
    component: PromptComponent,
    userContext?: any,
    walletContext?: WalletContext,
    proactiveSuggestions?: string
  ): PromptTemplate | null {
    const factory = templateRegistry.get(component);
    if (!factory) {
      return null;
    }

    try {
      // Llamar a la factory con los parámetros apropiados
      return factory(userContext, walletContext, proactiveSuggestions);
    } catch (error) {
      logger.error(`[PromptManager] Error getting template for ${component}:`, error);
      return null;
    }
  }

  /**
   * Elimina líneas duplicadas del contenido
   */
  private static removeDuplicateLines(content: string): string {
    const lines = content.split('\n');
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Ignorar líneas vacías y duplicados exactos
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        unique.push(line);
      } else if (!trimmed) {
        // Mantener líneas vacías para formato
        unique.push(line);
      }
    }

    return unique.join('\n');
  }

  /**
   * Crea una configuración por defecto para el system prompt del chat assistant
   */
  static createDefaultChatConfig(
    context: WalletContext,
    proactiveSuggestions?: string
  ): PromptCompositionConfig {
    return {
      components: ['identity', 'capabilities', 'instructions', 'context', 'examples'],
      userContext: {
        hasAccounts: context.accounts.total > 0,
        hasTransactions: context.transactions.recent.length > 0,
        hasBudgets: context.budgets.active.length > 0,
        hasGoals: context.goals.active.length > 0,
      },
      options: {
        includeOnlyRelevant: true,
        removeDuplicates: true,
        includeExamples: true,
      },
    };
  }

  /**
   * Genera el system prompt para el chat assistant
   * Con soporte para caché y userId
   * Ahora incluye contexto de memoria si está disponible
   */
  static async generateChatSystemPrompt(
    context: WalletContext,
    proactiveSuggestions?: string,
    userId?: string,
    memoryContext?: string
  ): Promise<string> {
    const config = this.createDefaultChatConfig(context, proactiveSuggestions);
    const composed = await this.composePrompt(config, context, proactiveSuggestions, userId);
    
    // Agregar contexto de memoria si está disponible
    let finalContent = composed.content;
    if (memoryContext) {
      finalContent = composed.content + '\n\n' + memoryContext;
    }
    
    logger.debug(`[PromptManager] Generated system prompt with ${composed.estimatedTokens} estimated tokens, components: ${composed.components.join(', ')}${memoryContext ? ', with memory context' : ''}`);
    
    return finalContent;
  }
}

