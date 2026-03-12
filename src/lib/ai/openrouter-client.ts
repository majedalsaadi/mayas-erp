/**
 * Mayas ERP - OpenRouter Client
 * عميل OpenRouter للـ AI
 */

import OpenAI from 'openai';

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'Mayas ERP',
  },
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * إرسال رسالة للـ AI
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  options: ChatOptions = {}
) {
  const {
    model = 'anthropic/claude-3-sonnet',
    temperature = 0.7,
    maxTokens = 4096,
  } = options;

  try {
    const response = await openrouter.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return {
      success: true,
      content: response.choices[0].message.content,
      usage: response.usage,
    };
  } catch (error: any) {
    console.error('OpenRouter error:', error);
    return {
      success: false,
      error: error.message || 'حدث خطأ في الاتصال بالـ AI',
    };
  }
}

/**
 * الحصول على الاقتراحات
 */
export async function getSuggestions(context: string) {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `أنت مساعد ذكي لنظام محاسبة. اقترح 3 أسئلة مختصرة يمكن للمستخدم طرحها بناءً على السياق المتاح. أعد الاقتراحات كـ JSON array.`,
    },
    {
      role: 'user',
      content: `السياق: ${context}`,
    },
  ];

  const response = await sendChatMessage(messages, {
    temperature: 0.8,
    maxTokens: 500,
  });

  if (response.success && response.content) {
    try {
      return JSON.parse(response.content);
    } catch {
      return [
        'كم مبيعات اليوم؟',
        'ما الأصناف الناقصة؟',
        'أعطني ملخص مالي',
      ];
    }
  }

  return [];
}
