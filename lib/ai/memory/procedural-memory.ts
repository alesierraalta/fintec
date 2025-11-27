/**
 * Procedural Memory - Gestión de perfil y preferencias estructuradas del usuario
 * 
 * Almacena el perfil aprendido del usuario, incluyendo estilo de comunicación,
 * preferencias financieras, patrones de interacción y reglas personalizadas.
 */

import { createSupabaseServiceClient } from '@/repositories/supabase/client';
import { logger } from '@/lib/utils/logger';

export interface UserProfile {
  userId: string;
  communicationStyle: {
    tone?: 'formal' | 'casual' | 'friendly' | 'professional';
    verbosity?: 'concise' | 'moderate' | 'detailed';
    language?: string;
    preferences?: string[];
  };
  financialPreferences: {
    defaultCurrency?: string;
    preferredAccounts?: string[];
    budgetAlertThreshold?: number;
    goalReminderFrequency?: 'daily' | 'weekly' | 'monthly' | 'never';
    [key: string]: any;
  };
  interactionPatterns: {
    preferredActions?: string[];
    commonQueries?: string[];
    timeOfDayUsage?: Record<string, number>;
    [key: string]: any;
  };
  learnedRules: Array<{
    condition: string;
    action: string;
    priority: number;
    createdAt: Date;
  }>;
  lastUpdatedAt: Date;
  createdAt: Date;
}

/**
 * Obtiene el perfil del usuario
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const client = createSupabaseServiceClient();
    
    const { data, error } = await (client
      .from('ai_user_profile') as any)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No existe perfil, retornar null
        return null;
      }
      throw new Error(`Failed to retrieve profile: ${error.message}`);
    }

    return mapProfileFromDb(data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[procedural-memory] Error retrieving profile:', error);
    throw new Error(`Failed to retrieve profile: ${errorMessage}`);
  }
}

/**
 * Crea o actualiza el perfil del usuario
 */
export async function upsertUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, 'userId' | 'createdAt' | 'lastUpdatedAt'>>
): Promise<UserProfile> {
  try {
    const client = createSupabaseServiceClient();
    
    // Obtener perfil existente si existe
    const existingProfile = await getUserProfile(userId);
    
    const profileData: any = {
      user_id: userId,
      communication_style: updates.communicationStyle || existingProfile?.communicationStyle || {},
      financial_preferences: updates.financialPreferences || existingProfile?.financialPreferences || {},
      interaction_patterns: updates.interactionPatterns || existingProfile?.interactionPatterns || {},
      learned_rules: updates.learnedRules 
        ? updates.learnedRules.map(rule => ({
            condition: rule.condition,
            action: rule.action,
            priority: rule.priority,
            created_at: rule.createdAt.toISOString(),
          }))
        : existingProfile?.learnedRules?.map(rule => ({
            condition: rule.condition,
            action: rule.action,
            priority: rule.priority,
            created_at: rule.createdAt.toISOString(),
          })) || [],
    };

    const { data, error } = await (client
      .from('ai_user_profile') as any)
      .upsert(profileData, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert profile: ${error.message}`);
    }

    logger.debug(`[procedural-memory] Updated profile for user ${userId}`);
    return mapProfileFromDb(data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[procedural-memory] Error upserting profile:', error);
    throw new Error(`Failed to upsert profile: ${errorMessage}`);
  }
}

/**
 * Actualiza una sección específica del perfil
 */
export async function updateProfileSection(
  userId: string,
  section: 'communicationStyle' | 'financialPreferences' | 'interactionPatterns',
  updates: Record<string, any>
): Promise<UserProfile> {
  try {
    const existingProfile = await getUserProfile(userId);
    
    const currentSection = existingProfile?.[section] || {};
    const updatedSection = { ...currentSection, ...updates };

    const profileUpdates: Partial<UserProfile> = {
      [section]: updatedSection,
    };

    return await upsertUserProfile(userId, profileUpdates);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[procedural-memory] Error updating profile section:', error);
    throw new Error(`Failed to update profile section: ${errorMessage}`);
  }
}

/**
 * Agrega una regla aprendida al perfil
 */
export async function addLearnedRule(
  userId: string,
  condition: string,
  action: string,
  priority: number = 0.5
): Promise<UserProfile> {
  try {
    const existingProfile = await getUserProfile(userId);
    const existingRules = existingProfile?.learnedRules || [];

    // Verificar si la regla ya existe
    const ruleExists = existingRules.some(
      rule => rule.condition === condition && rule.action === action
    );

    if (ruleExists) {
      logger.debug(`[procedural-memory] Rule already exists for user ${userId}`);
      return existingProfile!;
    }

    const newRule = {
      condition,
      action,
      priority: Math.max(0, Math.min(1, priority)),
      createdAt: new Date(),
    };

    const updatedRules = [...existingRules, newRule];

    return await upsertUserProfile(userId, {
      learnedRules: updatedRules,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[procedural-memory] Error adding learned rule:', error);
    throw new Error(`Failed to add learned rule: ${errorMessage}`);
  }
}

/**
 * Elimina una regla aprendida
 */
export async function removeLearnedRule(
  userId: string,
  condition: string,
  action: string
): Promise<UserProfile> {
  try {
    const existingProfile = await getUserProfile(userId);
    if (!existingProfile) {
      throw new Error('Profile not found');
    }

    const updatedRules = existingProfile.learnedRules.filter(
      rule => !(rule.condition === condition && rule.action === action)
    );

    return await upsertUserProfile(userId, {
      learnedRules: updatedRules,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[procedural-memory] Error removing learned rule:', error);
    throw new Error(`Failed to remove learned rule: ${errorMessage}`);
  }
}

/**
 * Obtiene las reglas aprendidas ordenadas por prioridad
 */
export async function getLearnedRules(
  userId: string,
  minPriority: number = 0
): Promise<UserProfile['learnedRules']> {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) {
      return [];
    }

    return profile.learnedRules
      .filter(rule => rule.priority >= minPriority)
      .sort((a, b) => b.priority - a.priority);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[procedural-memory] Error retrieving learned rules:', error);
    throw new Error(`Failed to retrieve learned rules: ${errorMessage}`);
  }
}

// Helper function para mapear datos de DB

function mapProfileFromDb(data: any): UserProfile {
  return {
    userId: data.user_id,
    communicationStyle: data.communication_style || {},
    financialPreferences: data.financial_preferences || {},
    interactionPatterns: data.interaction_patterns || {},
    learnedRules: (data.learned_rules || []).map((rule: any) => ({
      condition: rule.condition,
      action: rule.action,
      priority: rule.priority || 0.5,
      createdAt: rule.created_at ? new Date(rule.created_at) : new Date(),
    })),
    lastUpdatedAt: new Date(data.last_updated_at),
    createdAt: new Date(data.created_at),
  };
}

