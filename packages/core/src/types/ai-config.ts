import type { BaseDocument } from './common';

// ════════════════════════════════════════════════════════════════
// AI Assistant Identity
// ════════════════════════════════════════════════════════════════

export type AIPersonality = 'formal' | 'amigable' | 'profesional' | 'motivador';
export type AILanguage = 'es' | 'en' | 'ca' | 'pt';

export interface AIIdentity {
  name: string;           // "PadelBot", "FitAssistant"
  systemPrompt: string;   // Main system prompt
  personality: AIPersonality;
  language: AILanguage;
  welcomeMessage: string;
}

// ════════════════════════════════════════════════════════════════
// Agent Configurations
// ════════════════════════════════════════════════════════════════

export interface BookingAgentConfig {
  enabled: boolean;
  config?: {
    maxAdvanceDays: number;
    requiresConfirmation: boolean;
  };
}

export interface InfoAgentConfig {
  enabled: boolean;
}

export interface SupportAgentConfig {
  enabled: boolean;
  config?: {
    escalateToHuman: boolean;
    humanEmail?: string;
  };
}

export interface TournamentsAgentConfig {
  enabled: boolean;
}

export interface ClassesAgentConfig {
  enabled: boolean;
}

export interface NutritionAgentConfig {
  enabled: boolean;
}

export interface AIAgents {
  booking: BookingAgentConfig;
  info: InfoAgentConfig;
  support: SupportAgentConfig;
  tournaments?: TournamentsAgentConfig;
  classes?: ClassesAgentConfig;
  nutrition?: NutritionAgentConfig;
}

// ════════════════════════════════════════════════════════════════
// Business Rules
// ════════════════════════════════════════════════════════════════

export interface AIBusinessRules {
  maxBookingsPerDay: number;
  requiresMembership: boolean;
  canBookForOthers: boolean;
  cancellationHours: number;
}

// ════════════════════════════════════════════════════════════════
// Availability
// ════════════════════════════════════════════════════════════════

export type AIAvailabilityMode = '24h' | 'business_hours' | 'custom';

export interface AIAvailability {
  mode: AIAvailabilityMode;
  customHours?: {
    start: string; // "08:00"
    end: string;   // "22:00"
  };
  offlineMessage: string;
}

// ════════════════════════════════════════════════════════════════
// Custom Tools
// ════════════════════════════════════════════════════════════════

export interface AICustomTool {
  name: string;
  description: string;
  endpoint: string;
  parameters: Record<string, unknown>;
}

// ════════════════════════════════════════════════════════════════
// Advanced Configuration
// ════════════════════════════════════════════════════════════════

export type LLMProvider = 'anthropic' | 'openai';

export interface AIAdvancedConfig {
  llmProvider?: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// ════════════════════════════════════════════════════════════════
// Full AIConfig Interface
// ════════════════════════════════════════════════════════════════

export interface AIConfig extends BaseDocument {
  identity: AIIdentity;
  agents: AIAgents;
  rules: AIBusinessRules;
  availability: AIAvailability;
  customTools?: AICustomTool[];
  advanced?: AIAdvancedConfig;
}

// ════════════════════════════════════════════════════════════════
// Default AI Config
// ════════════════════════════════════════════════════════════════

export const DEFAULT_AI_CONFIG: Omit<AIConfig, '_id' | 'createdAt' | 'updatedAt'> = {
  identity: {
    name: 'Asistente',
    systemPrompt: 'Eres un asistente virtual amable y eficiente.',
    personality: 'amigable',
    language: 'es',
    welcomeMessage: '¡Hola! ¿En qué puedo ayudarte?',
  },
  agents: {
    booking: { enabled: true },
    info: { enabled: true },
    support: { enabled: true },
  },
  rules: {
    maxBookingsPerDay: 2,
    requiresMembership: false,
    canBookForOthers: false,
    cancellationHours: 2,
  },
  availability: {
    mode: '24h',
    offlineMessage: 'Estamos fuera de horario. Por favor, inténtalo más tarde.',
  },
};
