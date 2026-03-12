/**
 * Mayas ERP - AI Types
 * أنواع الـ AI
 */

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  companyId: string;
  userId: string;
}

export interface AIChatRequest {
  message: string;
  conversationHistory?: AIChatMessage[];
}

export interface AIChatResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface AISuggestion {
  id: string;
  text: string;
  category: 'sales' | 'inventory' | 'finance' | 'general';
}

export interface AIAnalysis {
  summary: string;
  insights: string[];
  recommendations: string[];
}
