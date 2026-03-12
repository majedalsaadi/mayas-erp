# Mayas ERP - 24/7 Worker Setup

## 🚀 خيارات التشغيل 24 ساعة

### الخيار 1: Windows Task Scheduler (موصى به) ✅

**التشغيل:**
```powershell
# كـ Administrator
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
.\install-service.ps1
```

**المميزات:**
- ✅ يعمل عند بدء التشغيل
- ✅ لا يتوقف في وضع السبات
- ✅ يعيد التشغيل تلقائياً
- ✅ يعمل حتى لو أُغلق المستخدم

---

### الخيار 2: PM2 (للمحترفين)

**التثبيت:**
```bash
npm install -g pm2
pm2 start worker.js --name mayas-worker
pm2 save
pm2-startup install
```

**المميزات:**
- ✅ إدارة احترافية
- ✅ مراقبة الأداء
- ✅ سجلات منظمة
- ✅ إعادة تشغيل تلقائية

---

### الخيار 3: Batch File (بسيط)

**التشغيل:**
```bash
# انقر مرتين على start-worker.bat
# أو شغله من Terminal
start-worker.bat
```

**المميزات:**
- ✅ سهل التشغيل
- ✅ لا يحتاج صلاحيات
- ⚠️ يتوقف إذا أُغلق المستخدم

---

## 📊 مراقبة العامل

### فحص الحالة:
```bash
# فحص إذا كان يعمل
tasklist | findstr node

# فحص ملف heartbeat
type .heartbeat

# فحص السجلات
type worker.log
```

### إيقاف العامل:
```bash
# إيقاف
taskkill /F /IM node.exe

# أو حذف المهمة المجدولة
Unregister-ScheduledTask -TaskName "MayasERP-Worker"
```

---

## 🔧 إعداد المهام

يمكنك إضافة مهام في `worker.js`:

```javascript
// كل ساعة
if (minute === 0) {
  await this.customTask();
}

// كل 6 ساعات
if (hour % 6 === 0 && minute === 0) {
  await this.cleanupTask();
}
```

---

## 📱 التكامل مع OpenClaw

### Webhook Integration:
```javascript
// في worker.js
async sendNotification(message) {
  const webhook = 'YOUR_WEBHOOK_URL';
  await fetch(webhook, {
    method: 'POST',
    body: JSON.stringify({ message })
  });
}
```

---

## ⚡ الأداء

- **الذاكرة**: ~50MB
- **CPU**: < 1%
- **القرص**: ~1MB/يوم (سجلات)

---

## 🛡️ الأمان

- ✅ يعمل كـ SYSTEM
- ✅ لا يحتاج تسجيل دخول
- ✅ محمي من الإيقاف العرضي
- ✅ سجلات كاملة

---

## 📞 الدعم

- **السجلات**: `worker.log`
- **Heartbeat**: `.heartbeat`
- **PID**: `worker.pid`

---

**للتشغيل الآن:**
```powershell
# كـ Administrator
.\install-service.ps1
```

أو ببساطة:
```bash
node worker.js
```
