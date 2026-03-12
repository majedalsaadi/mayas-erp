# 🚀 Mayas ERP - 24/7 Worker Quick Start

## ⚡ الطريقة السريعة (دقيقة واحدة)

### الخطوات:

**1. افتح المجلد:**
```
C:\Users\Majed alsaadi\.openclaw\workspace\mayas-erp\
```

**2. انقر باليمين على:**
```
SETUP-24-7.bat
```

**3. اختر:**
```
Run as Administrator
```

**4. انقر "Yes" عند الطلب**

**5. انتظر...**

**6. ✅ انتهى!**

---

## 📋 أو يدوياً من PowerShell:

### افتح PowerShell كـ Administrator:
- اضغط `Win + X`
- اختر **"Windows PowerShell (Admin)"**

### شغّل الأوامر:
```powershell
cd "C:\Users\Majed alsaadi\.openclaw\workspace\mayas-erp"
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
.\setup-24-7.ps1
```

---

## ✅ بعد الإعداد:

### المهمة راح:
- ✅ تعمل عند بدء التشغيل تلقائياً
- ✅ لا تتوقف في السبات
- ✅ تعمل 24 ساعة
- ✅ تعيد التشغيل تلقائياً

---

## 📊 التحقق:

### فحص الحالة:
```powershell
Get-ScheduledTask -TaskName "MayasERP-Worker"
```

### فحص السجلات:
```powershell
Get-Content "C:\Users\Majed alsaadi\.openclaw\workspace\mayas-erp\worker.log" -Tail 20
```

### فحص نبضة القلب:
```powershell
Get-Content "C:\Users\Majed alsaadi\.openclaw\workspace\mayas-erp\.heartbeat"
```

---

## 🎮 التحكم:

### تشغيل:
```powershell
Start-ScheduledTask -TaskName "MayasERP-Worker"
```

### إيقاف:
```powershell
Stop-ScheduledTask -TaskName "MayasERP-Worker"
```

### حذف:
```powershell
Unregister-ScheduledTask -TaskName "MayasERP-Worker"
```

---

## 🎯 الخلاصة:

**الحين عندك:**
- ✅ عامل خلفي يعمل 24/7
- ✅ لا يتوقف أبداً
- ✅ سجلات كاملة
- ✅ مراقبة مستمرة

**ابدأ الآن:**
```
انقر باليمين على SETUP-24-7.bat
→ Run as Administrator
→ انتظر
→ ✅ انتهى!
```

---

**ملاحظة:** لو ما اشتغل، تأكد إن PowerShell يعمل كـ Administrator.
