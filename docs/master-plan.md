# Automotive ERP Master Plan
## Vercel + Supabase + GitHub + Cloudflare + Resend + Sentry + GitHub Actions + Turnstile + Upstash Redis + Trigger.dev/Inngest + PostHog + OpenRouter

Version: 1.0 
Audience: Founders, Tech Leads, Dev Teams, AI Agents, Implementation Partners 
Project Type: Cloud ERP for Automotive Spare Parts 
Scope: End-to-end production blueprint 

---

# 1. Executive Summary

هذا المستند هو الخطة الكاملة لبناء نظام ERP سحابي متكامل لقطاع **قطع غيار السيارات**، ويشمل:

- بيع جملة
- بيع مفرد
- نقاط بيع POS
- مخزون متعدد الفروع والمستودعات
- محاسبة كاملة
- مشتريات وموردين
- ضرائب وفواتير إلكترونية
- جاهزية ZATCA
- تقارير تشغيلية ومالية
- دردشة داخلية ذكية تقرأ كل شيء وتجيب على كل شيء حسب الصلاحيات
- تكامل كامل مع OpenRouter عبر API
- توزيع العمل على وكلاء / Agents بشكل واضح من التحليل إلى الإطلاق

هذا المستند لا يصف فقط "البرنامج"، بل يصف أيضًا:

- المنصات المطلوبة
- البنية التقنية
- الوكلاء وتوزيع المهام
- قاعدة البيانات
- الشاشات
- شجرة الحسابات
- القيود الآلية
- الذكاء الاصطناعي والدردشة
- الأمن والصلاحيات
- خطة التنفيذ المتوازية
- خطة التسريع
- معايير الجودة
- متطلبات الإطلاق الفعلي

---

# 2. Stack النهائي المعتمد

## 2.1 المنصات والخدمات

- GitHub
- GitHub Actions
- Vercel
- Supabase
- Cloudflare
- Cloudflare Turnstile
- Resend
- Sentry
- Upstash Redis
- Trigger.dev أو Inngest
- PostHog
- OpenRouter

## 2.2 دور كل خدمة

### GitHub
- source of truth للكود
- pull requests
- branching strategy
- code review
- docs
- migrations
- infra config history

### GitHub Actions
- lint
- typecheck
- tests
- build validation
- migration checks
- preview validation
- release checks

### Vercel
- استضافة Next.js
- preview deployments
- production deployment
- route handlers / server actions
- edge / node runtime حسب الحاجة

### Supabase
- PostgreSQL
- Auth
- Storage
- Realtime
- Edge Functions
- RLS
- SQL functions
- pgvector / search-ready design when needed

### Cloudflare
- DNS
- SSL
- WAF
- caching / protection
- Turnstile

### Cloudflare Turnstile
- حماية login
- حماية forgot password
- حماية forms
- حماية support / contact endpoints
- bot mitigation

### Resend
- reset password emails
- invoice emails
- alerts
- internal notifications

### Sentry
- frontend monitoring
- backend monitoring
- trace failures
- release health
- alerting

### Upstash Redis
- cache
- rate limiting
- fast counters
- ephemeral state
- selected queue/cursor helpers

### Trigger.dev أو Inngest
- background jobs
- scheduled jobs
- retries
- long workflows
- email/report/XML/ZATCA pipelines

### PostHog
- product analytics
- feature flags
- usage tracking
- funnel analysis
- session insights

### OpenRouter
- unified LLM gateway
- model routing
- multi-provider fallback
- chat/completion access
- agent and tool-enabled assistant layer

---

# 3. Product Scope

## 3.1 Business Scope

النظام مخصص لـ **محل / مؤسسة / شركة قطع غيار سيارات** ويجب أن يدعم:

- فروع متعددة
- مستودعات متعددة
- مواقع رفوف داخل المستودع
- عملاء جملة
- عملاء مفرد
- ورش
- موزعين
- بيع نقدي وآجل
- نقاط بيع
- طباعة حرارية وA4
- أسعار متعددة
- ضرائب
- محاسبة كاملة

## 3.2 Functional Scope

- الإدارة العامة
- المستخدمون والصلاحيات
- العملاء والموردون
- دليل الأصناف وقطع الغيار
- توافق القطع مع السيارات
- المخزون
- المشتريات
- المبيعات
- POS
- المحاسبة العامة
- الضرائب والفواتير الإلكترونية
- التقارير
- الدردشة الذكية الداخلية
- لوحة التحكم
- التنبيهات
- التتبع والتدقيق audit log

---

# 4. Modules الكاملة للنظام

## 4.1 الإدارة العامة
- بيانات الشركة
- الفروع
- المستودعات
- الصناديق
- نقاط البيع
- البنوك
- العملات
- الضرائب
- تسلسل المستندات
- الإعدادات العامة

## 4.2 المستخدمون والصلاحيات
- المستخدمون
- الأدوار
- الصلاحيات
- branch access
- warehouse access
- POS access
- report access
- accounting approval rights
- profitability visibility rights

## 4.3 العملاء
- ملفات العملاء
- مجموعات العملاء
- حد الائتمان
- فترة السداد
- أسعار افتراضية
- أسعار خاصة
- كشف الحساب
- أعمار الديون

## 4.4 الموردون
- ملفات الموردين
- شروط الدفع
- كشف الحساب
- أعمار الدائنين
- عملات الموردين
- أسعار الموردين

## 4.5 دليل الأصناف
- الأصناف
- الفئات
- العلامات التجارية
- الشركات المصنعة
- الوحدات
- الباركود
- الأسعار
- البدائل
- الأرقام المرجعية
- OEM Number
- Part Number
- مواقع التخزين
- صور الأصناف

## 4.6 توافق القطع مع السيارات
- Vehicle Make
- Vehicle Model
- Engine
- Year From / To
- Compatibility notes

## 4.7 المشتريات
- طلب شراء
- أمر شراء
- فاتورة شراء
- مردودات شراء
- استلام مخزني
- تحميل مصاريف الاستيراد والشحن
- تحديث التكلفة

## 4.8 المبيعات
- عرض سعر
- أمر بيع
- فاتورة مبيعات
- مرتجع مبيعات
- إشعار دائن
- إشعار مدين
- بيع نقدي
- بيع آجل
- جملة / مفرد / ورش

## 4.9 POS
- شاشة بيع سريعة
- barcode scan
- item search
- hold / resume invoice
- payment modal
- opening shift
- closing shift
- refund / return
- thermal receipt printing

## 4.10 المخزون
- رصيد لحظي
- stock by warehouse
- stock by bin
- transfers
- adjustments
- counts
- reservations
- reorder levels
- stock movements
- stock valuation

## 4.11 المحاسبة العامة
- شجرة الحسابات
- الأرصدة الافتتاحية
- القيود اليومية
- القيود الآلية
- سند قبض
- سند صرف
- سند قيد
- الأستاذ العام
- ميزان المراجعة
- قائمة الدخل
- المركز المالي
- التدفقات النقدية
- التسوية البنكية
- الإقفال الشهري/السنوي

## 4.12 الضرائب والفواتير الإلكترونية
- tax codes
- VAT
- tax summary
- invoice QR
- UUID
- XML archive
- document status
- submission logs
- ZATCA-ready abstraction layer

## 4.13 التقارير
- sales reports
- purchases reports
- stock reports
- customer aging
- supplier aging
- profitability reports
- financial reports
- POS reports
- tax reports

## 4.14 AI Copilot / Chat
- محادثة داخلية
- تقرأ البيانات المسموح بها
- تقرأ التقارير
- تقرأ المستندات
- تجيب على الأسئلة التشغيلية والمالية
- تلخص الأداء
- تساعد في البحث والتحليل
- تدعم workflow-aware answers

---

# 5. شجرة الحسابات المقترحة

## 1 الأصول

### 11 الأصول المتداولة
- 111001 الصندوق الرئيسي
- 111002 صندوق فرع 1
- 111003 صندوق فرع 2
- 112001 بنك الراجحي
- 112002 بنك الأهلي
- 113001 العملاء
- 113002 عملاء الجملة
- 113003 عملاء الورش
- 114001 مخزون قطع غيار
- 114002 مخزون زيوت
- 114003 مخزون بطاريات
- 114004 مخزون إطارات
- 115001 دفعات مقدمة للموردين
- 116001 ضريبة مدخلات
- 117001 مصروفات مدفوعة مقدمًا

### 12 الأصول غير المتداولة
- 121001 أثاث وتجهيزات
- 122001 أجهزة وأنظمة
- 123001 سيارات
- 124001 معدات مستودعات
- 129001 مجمع الإهلاك

## 2 الالتزامات

### 21 الالتزامات المتداولة
- 211001 الموردون
- 211002 موردون خارجيون
- 212001 ضريبة مخرجات
- 213001 مصروفات مستحقة
- 214001 رواتب مستحقة
- 215001 سلف عملاء
- 216001 أوراق دفع / شيكات

## 3 حقوق الملكية
- 311001 رأس المال
- 312001 جاري المالك
- 313001 أرباح مبقاة
- 314001 صافي الربح والخسارة

## 4 الإيرادات
- 411001 مبيعات مفرد
- 411002 مبيعات جملة
- 411003 مبيعات ورش
- 412001 مردودات مبيعات
- 413001 خصومات مسموح بها
- 414001 إيرادات أخرى

## 5 تكلفة المبيعات
- 511001 تكلفة مبيعات مفرد
- 511002 تكلفة مبيعات جملة
- 511003 تكلفة مبيعات ورش
- 512001 فروقات جرد
- 513001 تلف وهالك

## 6 المصروفات
- 611001 رواتب وأجور
- 612001 إيجارات
- 613001 كهرباء ومياه
- 614001 اتصالات
- 615001 شحن ونقل
- 616001 صيانة
- 617001 دعاية وتسويق
- 618001 رسوم بنكية
- 619001 استهلاك
- 620001 لوازم مكتبية
- 621001 مصاريف أنظمة واشتراكات

---

# 6. الدورة المحاسبية والقيود الآلية

## 6.1 الأرصدة الافتتاحية
يجب دعم:
- أرصدة الحسابات
- أرصدة العملاء
- أرصدة الموردين
- أرصدة المخزون
- أرصدة الصناديق
- أرصدة البنوك

## 6.2 البيع النقدي
من ح/ الصندوق أو البنك 
إلى ح/ المبيعات 
إلى ح/ ضريبة القيمة المضافة المخرجات 

وقيد التكلفة: 
من ح/ تكلفة البضاعة المباعة 
إلى ح/ المخزون 

## 6.3 البيع الآجل
من ح/ العملاء 
إلى ح/ المبيعات 
إلى ح/ ضريبة القيمة المضافة المخرجات 

وقيد التكلفة: 
من ح/ تكلفة البضاعة المباعة 
إلى ح/ المخزون 

## 6.4 مرتجع المبيعات
من ح/ مردودات المبيعات 
من ح/ ضريبة القيمة المضافة المخرجات 
إلى ح/ العميل أو الصندوق 

وقيد عكسي للتكلفة: 
من ح/ المخزون 
إلى ح/ تكلفة البضاعة المباعة 

## 6.5 الشراء النقدي
من ح/ المخزون 
من ح/ ضريبة المدخلات 
إلى ح/ الصندوق أو البنك 

## 6.6 الشراء الآجل
من ح/ المخزون 
من ح/ ضريبة المدخلات 
إلى ح/ الموردين 

## 6.7 مردودات الشراء
من ح/ الموردين 
إلى ح/ المخزون 
إلى ح/ ضريبة المدخلات 

## 6.8 سند قبض عميل
من ح/ الصندوق أو البنك 
إلى ح/ العملاء 

## 6.9 سند صرف مورد
من ح/ الموردين 
إلى ح/ الصندوق أو البنك 

## 6.10 تسويات المخزون
### بالنقص
من ح/ فروقات الجرد أو الهالك 
إلى ح/ المخزون 

### بالزيادة
من ح/ المخزون 
إلى ح/ فروقات الجرد 

---

# 7. قاعدة البيانات — المجالات والجداول الأساسية

## 7.1 الإدارة والإعدادات
- companies
- branches
- warehouses
- warehouse_zones
- warehouse_bins
- cashboxes
- bank_accounts
- document_sequences
- settings_general
- fiscal_periods

## 7.2 المستخدمون والصلاحيات
- users
- roles
- permissions
- role_permissions
- user_roles
- user_branch_access
- user_warehouse_access
- approval_rules
- audit_logs

## 7.3 العملاء والموردون
- customer_groups
- customers
- suppliers
- contact_persons
- customer_vehicle_profiles

## 7.4 الأصناف والماستر داتا
- item_categories
- brands
- manufacturers
- units
- items
- item_barcodes
- item_alternatives
- item_cross_references
- price_tiers
- item_prices
- customer_special_prices
- supplier_items

## 7.5 توافق القطع مع السيارات
- vehicle_makes
- vehicle_models
- vehicle_engines
- item_vehicle_compatibility

## 7.6 المخزون
- stock_balances
- inventory_transactions
- inventory_transaction_lines
- stock_reservations
- stock_counts
- stock_count_lines
- stock_transfers
- stock_transfer_lines
- stock_adjustments
- stock_adjustment_lines

## 7.7 المبيعات وPOS
- sales_quotes
- sales_quote_lines
- sales_orders
- sales_order_lines
- sales_invoices
- sales_invoice_lines
- sales_returns
- sales_return_lines
- sales_payments
- pos_terminals
- pos_shifts
- pos_shift_movements

## 7.8 المشتريات
- purchase_orders
- purchase_order_lines
- purchase_invoices
- purchase_invoice_lines
- purchase_returns
- purchase_return_lines
- landed_costs
- landed_cost_allocations

## 7.9 المحاسبة
- accounts
- journal_entries
- journal_entry_lines
- opening_balances
- receipt_vouchers
- receipt_voucher_lines
- payment_vouchers
- payment_voucher_lines
- bank_reconciliations

## 7.10 الضرائب وZATCA
- tax_codes
- invoice_tax_summary
- zatca_settings
- zatca_documents
- zatca_logs

## 7.11 الملفات والمرفقات
- files
- attachments
- print_templates
- export_jobs

## 7.12 AI / Knowledge / Chat
- ai_conversations
- ai_messages
- ai_sources
- ai_indexes
- ai_embeddings
- ai_tool_logs
- ai_access_policies
- ai_saved_prompts

---

# 8. الشاشات الأساسية التي لا يجوز إسقاطها

## 8.1 الإعدادات
- بيانات الشركة
- الفروع
- المستودعات
- الصناديق
- البنوك
- الضرائب
- العملات
- تسلسل المستندات

## 8.2 المحاسبة
- شجرة الحسابات
- الأرصدة الافتتاحية
- القيود اليومية
- سند قبض
- سند صرف
- سند قيد
- التسوية البنكية
- الأستاذ العام
- ميزان المراجعة
- قائمة الدخل
- المركز المالي

## 8.3 المخزون
- الأصناف
- الباركود
- الأسعار
- مواقع التخزين
- الحركة المخزنية
- الجرد
- التحويل
- التسويات

## 8.4 المبيعات
- عروض الأسعار
- أوامر البيع
- فواتير المبيعات
- مرتجعات المبيعات
- إشعارات دائن/مدين

## 8.5 المشتريات
- أوامر الشراء
- فواتير الشراء
- مردودات الشراء
- تحميل التكاليف

## 8.6 POS
- شاشة بيع
- فتح وردية
- إغلاق وردية
- مرتجع
- تعليق فاتورة
- طباعة إيصال

## 8.7 التقارير
- dashboards
- sales reports
- stock reports
- customer/supplier reports
- financial reports
- tax reports

## 8.8 الذكاء الاصطناعي
- AI settings
- AI providers
- OpenRouter settings
- chat interface
- assistant logs
- knowledge indexing
- prompt policies

---

# 9. AI Copilot / Chat الكامل

## 9.1 الهدف
بناء شات داخلي داخل النظام يستطيع أن:

- يقرأ بيانات التشغيل
- يقرأ المخزون
- يقرأ المبيعات
- يقرأ المشتريات
- يقرأ العملاء والموردين
- يقرأ التقارير المالية
- يقرأ المستندات المرفوعة
- يشرح النتائج
- يجيب على الأسئلة
- يساعد في البحث
- يساعد في اتخاذ القرار
- يلتزم بالصلاحيات ولا يتجاوزها

## 9.2 ما الذي يقرأه الشات؟

### Structured Data
- فواتير المبيعات
- فواتير الشراء
- الأرصدة
- كشوف العملاء
- حركات المخزون
- القيود اليومية
- الضرائب
- التقارير

### Semi-Structured / Documents
- ملفات PDF
- ملفات Excel/CSV المستوردة
- سياسات الشركة
- أدلة التشغيل
- ملفات تعاقدية أو ملاحظات
- قوالب الطباعة

### Knowledge Sources
- schema metadata
- read models
- business glossary
- prompt instructions
- financial formulas
- tax rules mapping

## 9.3 صلاحيات الشات

يجب أن يكون الشات **RBAC + RLS aware**:
- لا يجيب إلا من البيانات التي يحق للمستخدم رؤيتها
- إذا الكاشير لا يرى الأرباح، الشات أيضًا لا يرى الأرباح له
- إذا المحاسب يرى فرعين فقط، الشات يرى فرعين فقط
- إذا المستخدم لا يملك الوصول لملف أو تقرير، الشات لا يستخدمه

## 9.4 قدرات الشات المطلوبة
- إجابة أسئلة تشغيلية
- إجابة أسئلة محاسبية
- تلخيص مبيعات اليوم / الأسبوع / الشهر
- تحليل الأصناف الراكدة
- تحليل العملاء الأكثر شراءً
- تحليل الموردين
- شرح سبب انخفاض الربحية
- استخراج مؤشرات أداء
- مساعدات على مستوى النظام مثل "أين المشكلة؟"

## 9.5 أمثلة أسئلة يجب أن يجيب عليها
- كم مبيعات اليوم حسب الفرع؟
- ما أكثر 20 صنف مبيعًا هذا الشهر؟
- من العملاء المتأخرين في السداد؟
- ما سبب فرق الجرد في المستودع الرئيسي؟
- كم هامش الربح في مبيعات الجملة؟
- ما المورد الذي لديه أعلى قيمة مشتريات؟
- ما قيمة ضريبة المخرجات لهذا الشهر؟
- أعطني تلخيصًا ماليًا مختصرًا لآخر 30 يوم

## 9.6 آلية عمل الشات

### الطبقة 1 — Intent Router
- يحدد نوع السؤال
- هل السؤال تشغيلي؟ محاسبي؟ مخزني؟ تقريري؟ وثائقي؟

### الطبقة 2 — Access Control
- يطبق صلاحيات المستخدم
- يحدد الفروع والمستودعات والبيانات المسموح بها

### الطبقة 3 — Retrieval
- SQL read model query إذا السؤال structured
- vector/doc retrieval إذا السؤال وثائقي
- hybrid retrieval إذا السؤال يحتاج الاثنين

### الطبقة 4 — LLM Orchestration
- إرسال السياق إلى OpenRouter
- اختيار model/provider المناسب
- إضافة system prompt والسياسات
- تنفيذ tool calls إذا لزم

### الطبقة 5 — Output Guard
- تنظيف الإجابة
- منع تسريب معلومات غير مصرح بها
- إرفاق links/sources داخلية عند الحاجة

---

# 10. تكامل OpenRouter الكامل

## 10.1 الهدف
استخدام OpenRouter كبوابة موحدة للنماذج حتى يمكن:
- تبديل النماذج بدون تغيير التطبيق
- استخدام fallback بين providers
- استخدام model routing
- دعم tool calling وstructured outputs حسب ما يتم اعتماده
- تقليل lock-in على مزود واحد

## 10.2 ما الذي يجب دعمه؟
- API key management
- model catalog
- selected default model per workload
- provider routing policy
- fallback policy
- usage logging
- cost tracking per workspace / feature / user
- prompt versioning
- tool calling adapter

## 10.3 حالات استخدام OpenRouter داخل النظام

### Chat Assistant
- سؤال وجواب داخل النظام
- قراءة structured + document context

### Summaries
- تلخيص المبيعات
- تلخيص التقارير
- تلخيص أداء الفروع

### Accounting Helper
- شرح القيود
- تفسير الأرصدة
- تفسير الفروقات

### Inventory Analyst
- تحليل الأصناف الراكدة
- تحليل النواقص
- اقتراح reorder

### Customer Service / Admin Helper
- شرح بيانات العميل أو المورد
- اقتراح خطوات تحصيل

## 10.4 تصميم طبقة OpenRouter داخل النظام

### tables
- ai_providers
- ai_models
- ai_model_policies
- ai_request_logs
- ai_usage_costs
- ai_prompt_templates
- ai_tool_definitions

### services
- OpenRouterClient
- ModelRouterService
- PromptTemplateService
- RetrievalService
- ToolExecutionService
- AIConversationService
- AIUsageService
- AIGuardrailService

## 10.5 قواعد مهمة
- لا يتم استخدام مفتاح OpenRouter في الواجهة مباشرة
- المفتاح محفوظ في server-side secret فقط
- جميع الاستدعاءات تمر من backend / secure route
- جميع responses تُسجل مع metadata عند الحاجة
- يتم حساب التكلفة والاستهلاك لكل مساحة عمل/مستخدم عند الحاجة

---

# 11. Agents / الوكلاء وتوزيع العمل

## Agent 1 — Product & Business Analyst
### مسؤولياته
- تحليل النشاط
- تعريف use cases
- تعريف workflows
- تعريف التقارير
- تعريف الصلاحيات
- تعريف Acceptance Criteria

### مخرجاته
- PRD
- user stories
- workflows
- reports matrix
- permissions matrix

---

## Agent 2 — System Architect
### مسؤولياته
- رسم المعمارية
- تحديد boundaries
- تحديد ماذا يذهب إلى Vercel / Supabase / Jobs / Redis / AI
- تحديد security model
- تحديد AI architecture

### مخرجاته
- architecture.md
- runtime topology
- service boundaries
- deployment topology

---

## Agent 3 — Database Architect
### مسؤولياته
- ERD
- schema
- indexes
- constraints
- migrations
- RLS design
- vector index design

### مخرجاته
- database-spec.md
- sql migrations
- rls-policies.md
- ai-indexing-schema.md

---

## Agent 4 — Platform / DevOps Agent
### مسؤولياته
- GitHub setup
- branch strategy
- actions setup
- Vercel projects
- Supabase projects
- Cloudflare DNS
- Resend setup
- Sentry setup
- Redis setup
- Trigger/Inngest setup
- PostHog setup
- secrets management

### مخرجاته
- infra.md
- env-vars.md
- ci-cd.md
- release-guide.md

---

## Agent 5 — Auth / Permissions Agent
### مسؤولياته
- auth model
- roles
- permissions
- branch access
- warehouse access
- AI access control
- RLS mapping

### مخرجاته
- auth-and-permissions.md
- role matrix
- ai-access-policy.md

---

## Agent 6 — Master Data & Inventory Agent
### مسؤولياته
- items
- categories
- barcodes
- prices
- alternatives
- vehicle compatibility
- stock balances
- transfers
- adjustments
- counts
- reservations

### مخرجاته
- inventory module
- inventory APIs
- inventory workflows

---

## Agent 7 — Sales & POS Agent
### مسؤولياته
- quotations
- sales orders
- sales invoices
- POS
- shift open/close
- payments
- returns
- pricing hierarchy

### مخرجاته
- sales module
- pos module
- receipt print flow

---

## Agent 8 — Purchasing Agent
### مسؤولياته
- purchase orders
- purchase invoices
- returns
- landed costs
- supplier balances

### مخرجاته
- purchasing module
- supplier workflows

---

## Agent 9 — Accounting Agent
### مسؤولياته
- chart of accounts
- opening balances
- journals
- auto posting rules
- receipts
- payments
- ledger
- trial balance
- income statement
- balance sheet
- bank reconciliation
- closing process

### مخرجاته
- accounting module
- posting engine
- financial reports
- chart-of-accounts-seed.md

---

## Agent 10 — Tax & ZATCA Agent
### مسؤولياته
- tax codes
- VAT logic
- QR
- UUID
- XML archive
- submission logs
- reporting readiness

### مخرجاته
- tax engine
- zatca module
- tax-workflows.md

---

## Agent 11 — AI / OpenRouter Agent
### مسؤولياته
- OpenRouter integration
- model policy layer
- prompt templates
- tool definitions
- hybrid retrieval
- structured query tools
- document retrieval tools
- answer guardrails
- usage logging
- AI chat UI contracts

### مخرجاته
- openrouter-integration.md
- ai-chat-design.md
- prompts-and-tools.md
- retrieval-plan.md

---

## Agent 12 — Frontend Agent
### مسؤولياته
- admin UI
- inventory screens
- sales screens
- purchasing screens
- accounting screens
- reports screens
- POS UI
- AI chat UI

### مخرجاته
- UI implementation
- print templates
- screen specs

---

## Agent 13 — QA & UAT Agent
### مسؤولياته
- functional QA
- accounting QA
- POS QA
- inventory QA
- tax QA
- AI safety QA
- permissions QA
- UAT checklists

### مخرجاته
- qa-report.md
- uat-checklist.md
- release sign-off

---

## Agent 14 — Documentation Agent
### مسؤولياته
- developer docs
- deployment docs
- admin guide
- cashier guide
- accountant guide
- AI copilot guide
- troubleshooting

### مخرجاته
- docs bundle
- onboarding docs
- runbooks

---

# 12. ترتيب العمل الصحيح

## المرحلة 1 — Discovery
- Agent 1
- Agent 2

## المرحلة 2 — Design
- Agent 3
- Agent 4
- Agent 5
- Agent 11

## المرحلة 3 — Core Foundation
- Agent 4
- Agent 5
- Agent 12

## المرحلة 4 — Master Data & Inventory
- Agent 6
- Agent 12

## المرحلة 5 — Sales / Purchasing / Accounting / Tax
- Agent 7
- Agent 8
- Agent 9
- Agent 10
- Agent 12

## المرحلة 6 — AI Layer
- Agent 11
- Agent 12
- Agent 5
- Agent 13

## المرحلة 7 — QA / UAT / Docs
- Agent 13
- Agent 14

## المرحلة 8 — Go Live
- Agent 4
- Agent 13
- Agent 14

---

# 13. خطة التسريع

## 13.1 العمل المتوازي
التنفيذ لا يكون خطيًا بالكامل، بل:
- Agent 3 و Agent 4 و Agent 5 و Agent 11 يعملون بالتوازي بعد تثبيت المعمارية
- Agent 6 و Agent 12 يبدأان بعد أول schema ثابت
- Agent 7 و 8 و 9 و 10 يعملون بالتوازي حسب نفس core contracts
- Agent 13 يبدأ باختبارات مبكرة وليس بعد نهاية المشروع

## 13.2 أدوات التسريع
- GitHub Actions
- preview deployments on Vercel
- shared schema contracts
- redis caching for search-heavy flows
- background jobs offloading
- Sentry feedback loop
- PostHog behavior analytics

## 13.3 ما الذي يذهب إلى Redis؟
- item search cache
- rate limiting counters
- ephemeral dashboard counters
- hot lookup cache
- selected session-like runtime state

## 13.4 ما الذي يذهب إلى Trigger.dev/Inngest؟
- invoice PDF generation
- email sending
- tax report generation
- XML creation
- nightly rollups
- reminder jobs
- async AI summaries
- document indexing jobs

## 13.5 ما الذي يذهب إلى PostHog؟
- screen usage
- funnel for invoice creation
- drop-off on POS/payment
- adoption of features
- behavior analytics

---

# 14. ملفات التنفيذ المطلوبة

يجب أن ينتج عن هذه الخطة على الأقل الملفات التالية:

- architecture.md
- database-spec.md
- chart-of-accounts-seed.md
- accounting-workflows.md
- auth-and-permissions.md
- rls-policies.md
- storage-and-files.md
- zatca-and-tax.md
- openrouter-integration.md
- ai-chat-design.md
- prompts-and-tools.md
- screens-spec.md
- ci-cd.md
- env-vars.md
- release-guide.md
- qa-checklist.md
- onboarding.md

---

# 15. Environment Variables المطلوبة

## 15.1 Vercel / App
- NEXT_PUBLIC_APP_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
- SENTRY_DSN
- POSTHOG_KEY
- POSTHOG_HOST
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN
- OPENROUTER_API_KEY
- OPENROUTER_BASE_URL
- TURNSTILE_SITE_KEY
- TURNSTILE_SECRET_KEY
- TRIGGER_SECRET_KEY أو INNGEST_EVENT_KEY

## 15.2 Supabase / Functions
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- OPENROUTER_API_KEY
- RESEND_API_KEY
- SENTRY_DSN
- POSTHOG_API_KEY
- VAULT_SECRETS if used

---

# 16. معايير القبول الأساسية

## 16.1 المحاسبة
- القيود توازن دائمًا
- المبيعات تولد القيود الصحيحة
- المشتريات تولد القيود الصحيحة
- سندات القبض والصرف تترحل بشكل صحيح
- القوائم المالية صحيحة

## 16.2 المخزون
- الرصيد صحيح حسب المستودع
- الجرد والتسويات تعمل
- التحويلات صحيحة
- التكاليف صحيحة

## 16.3 POS
- البحث سريع
- الحفظ سريع
- الطباعة تعمل
- الوردية تفتح وتغلق بشكل صحيح

## 16.4 AI Chat
- لا يتجاوز الصلاحيات
- يجيب من مصادر صحيحة
- يوثق الأدوات المستخدمة داخليًا
- لا يهلوس في الأرقام الحساسة دون إظهار أنها تقديرية
- يلتزم بالسياق المالي والعملي

---

# 17. الإطلاق النهائي

## قبل الإطلاق
- schema frozen
- roles verified
- reports verified
- accounting verified
- POS tested
- tax tested
- AI guardrails tested
- backups tested
- docs ready

## يوم الإطلاق
- production deploy
- smoke test
- branch verification
- cashier verification
- accounting verification
- email verification
- AI chat verification

## بعد الإطلاق
- monitor Sentry
- monitor PostHog
- review logs
- fix high severity issues
- optimize hot paths via Redis
- move heavy async workflows to jobs if needed

---

# 18. الخلاصة

هذه الوثيقة هي الخطة الشاملة من وإلى:
- المنصات
- الموديولات
- الجداول
- شجرة الحسابات
- القيود
- المحاسبة
- الشات الذكي
- OpenRouter
- الوكلاء
- توزيع العمل
- التسريع
- الجودة
- الإطلاق

وهي مصممة بحيث يمكن إعطاؤها لفريق أو وكلاء AI ويبدأ التنفيذ المباشر.
