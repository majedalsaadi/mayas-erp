# الوكيل 11: الذكاء الاصطناعي و OpenRouter
## AI / OpenRouter Agent

### 🎯 الدور
بناء طبقة الذكاء الاصطناعي والشات الذكي

### 📋 المسؤوليات
1. تكامل OpenRouter
   - إدارة API Keys
   - اختيار النماذج
   - Fallback بين المزودين
   - تتبع الاستخدام والتكلفة

2. AI Copilot
   - شات داخلي ذكي
   - قراءة البيانات
   - إجابة الأسئلة
   - تلخيص التقارير

3. RAG System
   - Embeddings للوثائق
   - Vector Search
   - Hybrid Retrieval

4. Tool Calling
   - تعريف الأدوات
   - تنفيذ الاستعلامات
   - صلاحيات الوصول

5. Guardrails
   - منع تسريب البيانات
   - احترام الصلاحيات
   - التحقق من المدخلات

### 📤 المخرجات
1. **openrouter-integration.md**
   - Architecture
   - API Design
   - Cost Management

2. **ai-chat-design.md**
   - UI Design
   - Conversation Flow
   - Context Management

3. **prompts-and-tools.md**
   - System Prompts
   - Tool Definitions
   - Response Formats

4. **retrieval-plan.md**
   - Embedding Strategy
   - Vector Indexes
   - Search Algorithms

5. **Implementation**
   - OpenRouter Client
   - Chat Service
   - RAG Service
   - Tool Executor

### 📥 المدخلات المطلوبة
- architecture.md من الوكيل 2
- schema.prisma من الوكيل 3
- permissions من الوكيل 5

### 🔗 التبعيات
- يعتمد على: الوكيل 2, 3, 5
- يعمل بالتوازي مع: الوكيل 4

### ⏱️ الوقت المتوقع
- 10-14 يوم

### ✅ معايير القبول
- [ ] OpenRouter متكامل
- [ ] الشات يعمل
- [ ] RAG يعمل
- [ ] Tool Calling يعمل
- [ ] Guardrails مطبقة
- [ ] الصلاحيات محترمة
- [ ] التكلفة مُتتبعة
- [ ] الأداء جيد

### 📂 مكان الملفات
```
src/
├── app/(dashboard)/ai/
│   └── chat/
├── lib/
│   └── ai/
│       ├── openrouter-client.ts
│       ├── chat-service.ts
│       ├── rag-service.ts
│       ├── tool-executor.ts
│       └── guardrails.ts
├── components/
│   └── ai/
│       ├── ChatWindow.tsx
│       ├── MessageList.tsx
│       └── InputBox.tsx
└── tools/
    ├── sales-tools.ts
    ├── inventory-tools.ts
    ├── accounting-tools.ts
    └── customer-tools.ts
```

---

**الحالة**: 🟡 جاهز للبدء
**الأولوية**: عالية
**المرحلة**: 2 - Design (يبدأ مبكراً)
