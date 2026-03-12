# 🚀 دليل التشغيل السريع - 24/7 Worker

## ✅ تم إعداد كل شي! اتبع الخطوات:

---

## 📋 **الخطوة 1: تشغيل السكربت (كـ Administrator)**

### الطريقة 1: بالنقر باليمين
```
1. افتح مجلد mayas-erp
2. انقر باليمين على setup-24-7.ps1
3. اختر "Run with PowerShell"
4. انقر "Yes" عند طلب الصلاحيات
```

### الطريقة 2: من PowerShell
```powershell
# افتح PowerShell كـ Administrator
# ثم شغّل:
cd "C:\Users\Majed alsaadi\.openclaw\workspace\mayas-erp"
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
.\setup-24-7.ps1
```

---

## 🎯 **بعد التشغيل:**

### ✅ المهمة راح:
- تعمل عند بدء التشغيل تلقائياً
- لا تتوقف في السبات
- تعمل 24 ساعة حتى لو سجّلت خروج

---

## 📊 **التحقق من العمل:**

### فحص الحالة:
```powershell
Get-ScheduledTask -TaskName "MayasERP-Worker" | Get-ScheduledTaskInfo
```

### فحص السجلات:
```powershell
Get-Content "C:\Users\Majed alsaadi\.openclaw\workspace\mayas-erp\worker.log" -Tail 20
```

### فحص نبضة القلب:
```powershell
Get-Content "C:\Users\Majed alsaadi\.openclaw\workspace\mayas-erp\.heartbeat" | ConvertFrom-Json
```

---

## 🎮 **التحكم:**

### تشغيل يدوي:
```powershell
Start-ScheduledTask -TaskName "MayasERP-Worker"
```

### إيقاف:
```powershell
Stop-ScheduledTask -TaskName "MayasERP-Worker"
```

### حذف:
```powershell
Unregister-ScheduledTask -TaskName "MayasERP-Worker" -Confirm:$false
```

---

## 🔧 **ماذا يفعل العامل؟**

| المهمة | التكرار |
|--------|---------|
| 💓 Heartbeat | كل 5 دقائق |
| 🔍 Health Check | كل ساعة |
| 🧹 Cleanup | كل 6 ساعات |
| 📊 Daily Report | كل يوم |

---

## 📂 **الملفات المهمة:**

| الملف | الوصف |
|-------|-------|
| `worker.js` | العامل الخلفي |
| `worker.log` | سجلات العمل |
| `.heartbeat` | نبضة القلب |
| `setup-24-7.ps1` | سكربت الإعداد |

---

## ⚠️ **ملاحظات:**

1. **السكربت يحتاج صلاحيات Administrator** (لإنشاء المهمة المجدولة)
2. **سيعمل تلقائياً** عند كل تشغيل للجهاز
3. **لن يتوقف** حتى لو أغلقت كل النوافذ
4. **السجلات** محفوظة في `worker.log`

---

## 🎉 **بعد الإعداد:**

✅ **راح يكون عندك نظام يعمل 24 ساعة!**

✅ **حتى لو:**
- انقطع الإنترنت
- دخل الجهاز في السبات
- سجّلت خروج
- أغلقت كل البرامج

✅ **النظام يشتغل ويسجل كل شي!**

---

## 📞 **للمساعدة:**

إذا واجهت مشكلة:
1. تأكد من تشغيل PowerShell كـ Administrator
2. راجع `worker.log`
3. تحقق من المهمة في Task Scheduler

---

**🚀 ابدأ الآن:**
```powershell
# كـ Administrator
.\setup-24-7.ps1
```
