# Specialist Portal - Web Application Documentation

## نظرة عامة على المشروع

**Specialist Portal** هو تطبيق ويب متكامل لإدارة المراكز الطبية/التعليمية المتخصصة، يعمل كواجهة إدارية على الويب لنظام يربط بين **Super Admins**, **Admins**, **Specialists**, و**Parents** لإدارة وتتبع الأطفال وتقدمهم.

---

## البنية التقنية (Tech Stack)

### Backend Framework
- **Node.js** + **Express.js** - Server-side framework
- **MongoDB** + **Mongoose** - Database و ORM
- **Passport.js** - نظام المصادقة والتفويض
- **Socket.IO** - Real-time chat و notifications
- **EJS** - Template engine لعرض الصفحات

### Dependencies الرئيسية
```json
{
  "express": "^4.18.2",
  "mongoose": "^8.0.0",
  "passport": "^0.7.0",
  "passport-local": "^1.0.0",
  "socket.io": "^4.6.1",
  "ejs": "^3.1.9",
  "bcryptjs": "^2.4.3",
  "express-session": "^1.17.3",
  "multer": "^1.4.5-lts.1"
}
```

### Architecture
- **MVC Pattern**: Models, Views (EJS), Controllers (Routes)
- **Session-based Authentication**: باستخدام Passport.js
- **Real-time Communication**: Socket.IO للدردشة والإشعارات
- **API Proxy**: يحول طلبات `/api/*` إلى backend منفصل

---

## هيكل المشروع (Project Structure)

```
specialist-portal/
├── server.js                 # نقطة الدخول الرئيسية
├── package.json              # Dependencies
├── .env                      # Environment variables
│
├── config/
│   ├── passport.js          # إعدادات المصادقة
│   └── translations.js      # ملفات الترجمة (العربية / الإنجليزية)
│
├── models/                   # MongoDB Schemas
│   ├── User.js              # المستخدمين (SuperAdmin, Admin, Specialist)
│   ├── Center.js            # المراكز
│   ├── Child.js             # الأطفال
│   ├── LinkRequest.js       # طلبات ربط الأطفال بالمتخصصين
│   ├── Progress.js          # تقدم الأطفال
│   ├── Message.js           # رسائل الدر<truncated>
<parameter name="Complexity">4
