# automotive-erp-execution-task-sheet.md

هذا الملف هو **خطة التنفيذ التفصيلية جداً** لبناء نظام ERP كامل خطوة بخطوة.
يمكن إعطاؤه مباشرة لفريق تطوير أو لوكلاء AI لتنفيذ النظام بدون تخمين.

كل وكيل لديه:
- المهام
- المخرجات
- ترتيب التنفيذ
- متطلبات الاعتماد

---

# المرحلة 1 — تأسيس المشروع

## Agent D — DevOps / Platform

### المهام

1. إنشاء GitHub Repository
2. إعداد الفروع:

```
main
develop
feature/*
hotfix/*
```

3. إعداد GitHub Actions

Pipeline:

- install dependencies
- lint
- typecheck
- test
- build
- deploy preview
- deploy production

4. إعداد Vercel

Environments:

```
development
preview
production
```

5. إعداد Supabase

إنشاء:

- database
- auth
- storage
- edge functions

6. إعداد Cloudflare

- DNS
- SSL
- WAF
- Turnstile

7. إعداد Resend

- email templates
- sender domain

8. إعداد Sentry

- frontend monitoring
- backend monitoring

9. إعداد Upstash Redis

- cache
- rate limiting

10. إعداد Trigger.dev أو Inngest

- job worker
- event routing

11. إعداد PostHog

- analytics
- feature flags

12. إعداد Secrets

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENROUTER_API_KEY
RESEND_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
SENTRY_DSN
POSTHOG_KEY
TURNSTILE_SECRET
```

---

# المرحلة 2 — قاعدة البيانات

## Agent C — Database Architect

### بناء Schema

إنشاء الجداول الأساسية:

### الإدارة

```
companies
branches
warehouses
warehouse_bins
settings
```

### المستخدمون

```
users
roles
permissions
user_roles
role_permissions
user_branch_access
user_warehouse_access
```

### الأصناف

```
items
item_categories
brands
manufacturers
units
item_barcodes
item_prices
item_alternatives
```

### السيارات

```
vehicle_makes
vehicle_models
vehicle_engines
item_vehicle_compatibility
```

### العملاء

```
customers
customer_groups
customer_addresses
```

### الموردون

```
suppliers
supplier_addresses
```

### المخزون

```
stock_balances
inventory_transactions
inventory_transaction_lines
stock_transfers
stock_adjustments
stock_counts
```

### المبيعات

```
sales_quotes
sales_orders
sales_invoices
sales_invoice_lines
sales_returns
sales_payments
```

### POS

```
pos_terminals
pos_shifts
pos_sessions
```

### المشتريات

```
purchase_orders
purchase_invoices
purchase_returns
landed_costs
```

### المحاسبة

```
accounts
journal_entries
journal_entry_lines
receipts
payments
bank_accounts
cashboxes
```

### الضرائب

```
tax_codes
invoice_tax_summary
zatca_documents
```

### AI

```
ai_agents
ai_conversations
ai_messages
ai_usage_logs
```

### سلة

```
salla_connections
salla_tokens
salla_sync_jobs
salla_sync_logs
salla_order_mappings
```

---

# المرحلة 3 — نظام الصلاحيات

## Agent E — Auth / Permissions

### بناء النظام

1. تعريف Roles

```
admin
branch_manager
accountant
cashier
warehouse_manager
sales
viewer
```

2. تعريف Permissions

```
view_sales
create_sales
edit_sales
view_inventory
edit_inventory
view_accounting
post_journal
```

3. ربط

```
roles → permissions
users → roles
users → branch access
users → warehouse access
```

4. تطبيق RLS على الجداول الحساسة.

---

# المرحلة 4 — إدارة الأصناف والمخزون

## Agent F — Inventory

### بناء الموديول

Features:

- إنشاء صنف
- تصنيفات
- باركود
- أسعار
- بدائل
- توافق سيارات

### المخزون

- stock balance
- transfers
- adjustments
- stock count

### قواعد

كل حركة يجب أن تسجل في:

```
inventory_transactions
inventory_transaction_lines
```

---

# المرحلة 5 — المبيعات و POS

## Agent G — Sales / POS

### المبيعات

إنشاء:

```
quotation
sales order
sales invoice
sales return
payment
```

### POS

شاشة:

- barcode scan
- item search
- quick add
- multi payment
- hold sale
- return
- thermal print

### قواعد

كل فاتورة:

- تحدث المخزون
- تنشئ قيد محاسبي

---

# المرحلة 6 — المشتريات

## Agent H — Purchasing

### تدفق الشراء

```
purchase request
purchase order
goods receipt
purchase invoice
purchase return
```

### القواعد

الشراء:

- يزيد المخزون
- ينشئ قيد محاسبي

---

# المرحلة 7 — المحاسبة

## Agent I — Accounting

### إنشاء شجرة الحسابات

مثال:

```
111001 Cash
112001 Bank
113001 Accounts Receivable
114001 Inventory
211001 Accounts Payable
311001 Capital
411001 Sales
511001 Cost of Sales
611001 Expenses
```

### محرك القيود

إنشاء:

```
posting_rules
posting_rule_lines
posting_logs
```

كل مستند يولد قيد تلقائي.

---

# المرحلة 8 — التقارير

## Agent O — Reporting

إنشاء تقارير:

### المبيعات

- sales by day
- sales by branch
- top items

### المخزون

- stock valuation
- low stock
- slow moving

### المحاسبة

- trial balance
- income statement
- balance sheet
- ledger
- aging

---

# المرحلة 9 — AI Copilot

## Agent K — AI

### بناء الشات

شاشة:

```
AI Chat
conversation history
prompt suggestions
```

### أدوات AI

```
get_sales_summary
get_inventory_status
get_customer_balance
get_supplier_balance
get_profit_report
get_top_items
```

### OpenRouter Integration

Flow:

```
user question
↓
agent selection
↓
data context
↓
tool calls
↓
OpenRouter request
↓
response
```

### تسجيل الاستخدام

```
ai_usage_logs
```

---

# المرحلة 10 — تكامل سلة

## Agent L — Salla

### OAuth

ربط متجر سلة.

### Webhooks

استقبال:

```
order.created
order.updated
product.updated
```

### Sync

الطلب:

```
create sales invoice
update stock
create accounting entry
```

### logs

```
salla_sync_logs
```

---

# المرحلة 11 — الوظائف الخلفية

## Agent D + Agent K

Jobs:

```
generate invoice pdf
send email
generate XML
sync salla
run reports
AI indexing
low stock alerts
```

---

# المرحلة 12 — QA

## Agent P

اختبار:

- المبيعات
- POS
- المخزون
- المحاسبة
- الضرائب
- سلة
- AI
- الصلاحيات

---

# المرحلة 13 — الإطلاق

## DevOps

Steps:

1. deploy production
2. migrate database
3. seed data
4. create admin user
5. enable monitoring
6. enable backups

---

# النتيجة

بعد تنفيذ هذه الخطة سيكون لديك:

- ERP كامل
- POS
- محاسبة
- مخزون
- مشتريات
- تقارير
- AI Chat
- OpenRouter
- تكامل سلة
- نظام SaaS جاهز للتوسع
