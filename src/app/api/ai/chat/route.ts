/**
 * Mayas ERP - AI Chat API
 * API المحادثة مع الـ AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendChatMessage } from '@/lib/ai/openrouter-client';
import { buildUserContext, contextToText } from '@/lib/ai/context-builder';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    // TODO: الحصول على معلومات المستخدم من الجلسة
    const companyId = '00000000-0000-0000-0000-000000000001';
    const userId = '00000000-0000-0000-0000-000000000001';

    // بناء السياق
    const context = await buildUserContext(companyId, userId);
    const contextText = contextToText(context);

    // إعداد الرسائل
    const messages = [
      {
        role: 'system' as const,
        content: `أنت مساعد ذكي لنظام محاسبة "منصة مياس". 
ساعد المستخدم في:
- الاستعلام عن المبيعات والمشتريات
- فحص المخزون
- التقارير المالية
- تحليل البيانات

السياق الحالي:
${contextText}

تحدث باللغة العربية بأسلوب احترافي وودود.`,
      },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    // إرسال للـ AI
    const response = await sendChatMessage(messages);

    if (response.success) {
      return NextResponse.json({
        success: true,
        message: response.content,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: response.error,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ في معالجة طلبك',
      },
      { status: 500 }
    );
  }
}
