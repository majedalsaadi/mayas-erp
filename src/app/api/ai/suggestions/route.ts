/**
 * Mayas ERP - AI Suggestions API
 * API الاقتراحات
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSuggestions } from '@/lib/ai/openrouter-client';
import { buildUserContext, contextToText } from '@/lib/ai/context-builder';

export async function GET(request: NextRequest) {
  try {
    // TODO: الحصول على معلومات المستخدم من الجلسة
    const companyId = '00000000-0000-0000-0000-000000000001';
    const userId = '00000000-0000-0000-0000-000000000001';

    // بناء السياق
    const context = await buildUserContext(companyId, userId);
    const contextText = contextToText(context);

    // الحصول على الاقتراحات
    const suggestions = await getSuggestions(contextText);

    return NextResponse.json({
      success: true,
      suggestions: suggestions.map((text: string, index: number) => ({
        id: `suggestion-${index}`,
        text,
        category: 'general',
      })),
    });
  } catch (error: any) {
    console.error('AI suggestions error:', error);
    
    // إرجاع اقتراحات افتراضية
    return NextResponse.json({
      success: true,
      suggestions: [
        { id: '1', text: 'كم مبيعات اليوم؟', category: 'sales' },
        { id: '2', text: 'ما الأصناف الناقصة؟', category: 'inventory' },
        { id: '3', text: 'أعطني ملخص مالي', category: 'finance' },
      ],
    });
  }
}
