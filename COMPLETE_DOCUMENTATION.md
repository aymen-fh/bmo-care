# 🌐 Specialist Portal - Complete System Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technical Architecture](#technical-architecture)
3. [User Roles & Hierarchy](#user-roles--hierarchy)
4. [Database Models](#database-models)
5. [Routes & Endpoints](#routes--endpoints)
6. [Views Structure](#views-structure)
7. [Features by Role](#features-by-role)
8. [Authentication System](#authentication-system)
9. [Real-time Features](#real-time-features)
10. [File Structure](#file-structure)

---

## 🎯 Project Overview

**Specialist Portal** نظام إدارة متكامل للمراكز المتخصصة (طبية/تعليمية) يربط بين 4 أنواع مستخدمين في هيكل هرمي:

```
┌─────────────────┐
│  Super Admin    │  إدارة كل المراكز والأدمن
└────────┬────────┘
         │
    ┌────▼─────┐
    │  Admin   │  إدارة مركز واحد والمتخصصين
    └────┬─────┘
         │
   ┌─────▼──────┐
   │ Specialist │  إدارة الأطفال والتقارير
   └─────┬──────┘
         │
    ┌────▼────┐
    │ Parents │  (via Mobile App)
    └─────────┘
```

**الهدف الرئيسي**: إدارة الأطفال، تتبع التقدم، التواصل بين Specialists و Parents، إدارة المواعيد والتقارير.

---

## 🏗️ Technical Architecture

### Technology Stack

#### Backend
```javascript
{
  "runtime": "Node.js v22+",
  "framework": "Express.js v4.18",
  "database": "MongoDB + Mongoose v8.0",
  "authentication": "Passport.js + passport-local",
  "real-time": "Socket.IO v4.6",
  "templating": "EJS v3.1",
  "encryption": "bcryptjs",
  "file-upload": "Multer",
  "session": "express-session",
  "proxy": "http-proxy-middleware"
}
```

#### Development Tools
- **nodemon** - Auto-restart during development
- **dotenv** - Environment variables management

### Architecture Pattern
- **MVC (Model-View-Controller)**
- **Session-based Authentication**
- **Role-based Access Control (RBAC)**
- **RESTful API Design**
- **Server-side Rendering (EJS)**

---

## 👥 User Roles & Hierarchy

### 1. Super Admin
**الصلاحيات**:
- ✅ إنشاء وإدارة جميع المراكز (Centers)
- ✅ إنشاء وإدارة جميع الأدمن (Admins)
- ✅ عرض إحصائيات شاملة لكل النظام
- ✅ تعيين الأدمن للمراكز
- ✅ تعطيل/تنشيط المراكز والمستخدمين

**الصفحات المتاحة**:
- Dashboard: `/superadmin/dashboard`
- إدارة المراكز: `/superadmin/centers`
- إدارة الأدمن: `/superadmin/admins`

### 2. Admin
**الصلاحيات**:
- ✅ إدارة مركز واحد محدد فقط
- ✅ إنشاء وإدارة المتخصصين (Specialists) في مركزه
- ✅ عرض إحصائيات المركز
- ✅ إدارة Parents و Children في مركزه
- ✅ مراجعة سجلات النشاطات (Activity Logs)
- ✅ تصدير التقارير (PDF)

**الصفحات المتاحة**:
- Dashboard: `/admin/dashboard`
- إدارة المتخصصين: `/admin/specialists`
- إدارة الأطفال: `/admin/children`
- إدارة الأهالي: `/admin/parents`
- سجل النشاطات: `/admin/activity`
- الإعدادات: `/admin/settings`

### 3. Specialist
**الصلاحيات**:
- ✅ إدارة الأطفال المرتبطين به
- ✅ إنشاء وتحديث تقارير التقدم (Progress Reports)
- ✅ التواصل مع الأهالي عبر Chat
- ✅ عرض تحليلات الأطفال (Analytics)
- ✅ البحث عن Parents وربط الأطفال
- ✅ إدارة طلبات الربط (Link Requests)
- ✅ رفع ملفات وصور
- ✅ تحديث الملف الشخصي

**الصفحات المتاحة**:
- Dashboard: `/specialist/dashboard`
- الأطفال: `/specialist/children`
- الأهالي: `/specialist/parents`
- تفاصيل الطفل: `/specialist/child/:id`
- تحليلات الطفل: `/specialist/child/:id/analytics`
- تفاصيل الأهل: `/specialist/parent/:id`
- الدردشة: `/specialist/chat`
- طلبات الربط: `/specialist/requests`
- الملف الشخصي: `/specialist/profile`
- الحساب: `/specialist/account`

---

## 🗄️ Database Models

### 1. User Model (`models/User.js`)
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: Enum ['superadmin', 'admin', 'specialist'],
  staffId: String (custom ID: AD-XXXX, SP-XXXX),
  phone: String,
  specialization: String,
  center: ObjectId → Center,
  isActive: Boolean,
  avatar: String (file path),
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Center Model (`models/Center.js`)
```javascript
{
  name: String,
  centerId: String (custom ID: CT-XXXX),
  address: String,
  phone: String,
  email: String,
  admin: ObjectId → User,
  isActive: Boolean,
  logo: String (file path),
  createdAt: Date
}
```

### 3. Child Model (`models/Child.js`)
```javascript
{
  name: String,
  dateOfBirth: Date,
  gender: Enum ['male', 'female'],
  diagnosis: String,
  parent: ObjectId → Parent (from Backend),
  specialist: ObjectId → User (specialist),
  center: ObjectId → Center,
  avatar: String,
  notes: String,
  isActive: Boolean,
  createdAt: Date
}
```

### 4. Progress Model (`models/Progress.js`)
```javascript
{
  child: ObjectId → Child,
  specialist: ObjectId → User,
  date: Date,
  sessionType: String,
  activities: String,
  observations: String,
  goals: String,
  nextSteps: String,
  attachments: [String],
  rating: Number (1-5),
  createdAt: Date
}
```

### 5. Message Model (`models/Message.js`)
```javascript
{
  sender: ObjectId → User,
  receiver: ObjectId → User/Parent,
  content: String,
  type: Enum ['text', 'image', 'file'],
  fileUrl: String,
  isRead: Boolean,
  createdAt: Date
}
```

### 6. LinkRequest Model (`models/LinkRequest.js`)
```javascript
{
  specialist: ObjectId → User,
  parent: ObjectId → Parent,
  child: ObjectId → Child,
  status: Enum ['pending', 'accepted', 'rejected'],
  createdAt: Date
}
```

### 7. Notification Model (`models/Notification.js`)
```javascript
{
  user: ObjectId → User,
  message: String,
  type: String,
  link: String,
  isRead: Boolean,
  createdAt: Date
}
```

### 8. ActivityLog Model (`models/ActivityLog.js`)
```javascript
{
  user: ObjectId → User,
  action: String,
  details: String,
  targetId: ObjectId,
  targetModel: String,
  createdAt: Date
}
```

### 9. Setting Model (`models/Setting.js`)
```javascript
{
  user: ObjectId → User,
  language: Enum ['ar', 'en'],
  notifications: {
    email: Boolean,
    push: Boolean
  },
  theme: String
}
```

### 10. Referral Model (`models/Referral.js`)
```javascript
{
  child: ObjectId → Child,
  fromSpecialist: ObjectId → User,
  toSpecialist: ObjectId → User,
  reason: String,
  status: Enum ['pending', 'accepted', 'rejected'],
  createdAt: Date
}
```

---

## 🛣️ Routes & Endpoints

### Authentication Routes (`/auth`)
```javascript
GET  /auth/login           // صفحة تسجيل الدخول
POST /auth/login           // معالجة تسجيل الدخول
GET  /auth/logout          // تسجيل الخروج
```

### Super Admin Routes (`/superadmin`)
```javascript
GET  /superadmin/dashboard                    // لوحة التحكم
GET  /superadmin/centers                      // قائمة المراكز
GET  /superadmin/centers/create               // إنشاء مركز جديد
POST /superadmin/centers                      // حفظ المركز
GET  /superadmin/centers/:id/edit             // تعديل المركز
POST /superadmin/centers/:id                  // تحديث المركز
POST /superadmin/centers/:id/delete           // حذف المركز
GET  /superadmin/admins                       // قائمة الأدمن
GET  /superadmin/admins/create                // إنشاء أدمن جديد
POST /superadmin/admins                       // حفظ الأدمن
GET  /superadmin/admins/:id/edit              // تعديل الأدمن
POST /superadmin/admins/:id                   // تحديث الأدمن
POST /superadmin/admins/:id/toggle-status     // تفعيل/تعطيل
```

### Admin Routes (`/admin`)
```javascript
GET  /admin/dashboard                         // لوحة التحكم
GET  /admin/specialists                       // قائمة المتخصصين
GET  /admin/specialists/create                // إنشاء متخصص
POST /admin/specialists                       // حفظ المتخصص
GET  /admin/specialists/:id                   // تفاصيل المتخصص
GET  /admin/specialists/:id/edit              // تعديل المتخصص
POST /admin/specialists/:id                   // تحديث المتخصص
POST /admin/specialists/:id/toggle-status     // تفعيل/تعطيل
GET  /admin/children                          // قائمة الأطفال
GET  /admin/parents                           // قائمة الأهالي
GET  /admin/activity                          // سجل النشاطات
GET  /admin/settings                          // الإعدادات
POST /admin/settings                          // حفظ الإعدادات
```

### Specialist Routes (`/specialist`)
```javascript
GET  /specialist/dashboard                    // لوحة التحكم
GET  /specialist/children                     // قائمة الأطفال
POST /specialist/children                     // إضافة طفل
GET  /specialist/child/:id                    // تفاصيل الطفل
POST /specialist/child/:id/progress           // إضافة تقرير تقدم
GET  /specialist/child/:id/analytics          // تحليلات الطفل
GET  /specialist/parents                      // قائمة الأهالي
GET  /specialist/parent/:id                   // تفاصيل الأهل
POST /specialist/parent/search                // البحث عن أهل
POST /specialist/parent/:id/link              // ربط طفل بالأهل
GET  /specialist/requests                     // طلبات الربط
POST /specialist/requests/:id/accept          // قبول الطلب
POST /specialist/requests/:id/reject          // رفض الطلب
GET  /specialist/chat                         // الدردشة
GET  /specialist/profile                      // الملف الشخصي
POST /specialist/profile                      // تحديث الملف
GET  /specialist/account                      // إعدادات الحساب
POST /specialist/account                      // تحديث الحساب
```

### Chat Routes (`/chat`)
```javascript
GET  /chat/conversations                      // قائمة المحادثات
GET  /chat/messages/:userId                   // رسائل مع مستخدم
POST /chat/send                               // إرسال رسالة
POST /chat/read/:messageId                    // تعليم كمقروء
POST /chat/upload                             // رفع ملف
```

### Notification Routes (`/notifications`)
```javascript
GET  /notifications                           // قائمة الإشعارات
POST /notifications/:id/read                  // تعليم كمقروء
POST /notifications/read-all                  // تعليم الكل كمقروء
GET  /notifications/unread-count              // عدد غير المقروءة
```

### Export Routes (`/export`)
```javascript
GET  /export/specialists?format=pdf           // تصدير المتخصصين
```

### Settings Routes (`/settings`)
```javascript
GET  /settings                                // صفحة الإعدادات
POST /settings/language                       // تغيير اللغة
POST /settings/notifications                  // إعدادات الإشعارات
```

### Language Routes
```javascript
GET  /lang/:lang                              // تبديل اللغة (ar/en)
```

---

## 🎨 Views Structure

### Layout System
```
views/
├── partials/
│   ├── layout-start.ejs      // Header + Sidebar
│   ├── layout-end.ejs        // Footer + Scripts
│   ├── header.ejs            // Navigation bar
│   ├── sidebar.ejs           // Side menu (role-based)
│   ├── notifications.ejs     // Notifications dropdown
│   └── flash.ejs             // Flash messages
│
├── auth/
│   └── login.ejs             // صفحة تسجيل الدخول
│
├── superadmin/
│   ├── dashboard.ejs         // لوحة التحكم
│   ├── centers.ejs           // قائمة المراكز
│   ├── center-form.ejs       // نموذج المركز
│   ├── admins.ejs            // قائمة الأدمن
│   └── admin-form.ejs        // نموذج الأدمن
│
├── admin/
│   ├── dashboard.ejs         // لوحة التحكم
│   ├── specialists.ejs       // قائمة المتخصصين
│   ├── specialist-form.ejs   // نموذج المتخصص
│   ├── specialist-details.ejs // تفاصيل المتخصص
│   ├── children.ejs          // قائمة الأطفال
│   ├── parents.ejs           // قائمة الأهالي
│   ├── activity-log.ejs      // سجل النشاطات
│   └── settings.ejs          // الإعدادات
│
├── specialist/
│   ├── dashboard.ejs         // لوحة التحكم
│   ├── children.ejs          // قائمة الأطفال
│   ├── child-details.ejs     // تفاصيل الطفل
│   ├── child-analytics.ejs   // تحليلات الطفل
│   ├── parents.ejs           // قائمة الأهالي
│   ├── parent-details.ejs    // تفاصيل الأهل
│   ├── chat.ejs              // الدردشة
│   ├── requests.ejs          // طلبات الربط
│   ├── profile.ejs           // الملف الشخصي
│   └── account.ejs           // إعدادات الحساب
│
└── errors/
    ├── 404.ejs               // صفحة غير موجودة
    └── 500.ejs               // خطأ في الخادم
```

---

## 🔐 Authentication System

### Passport.js Configuration
```javascript
// config/passport.js
- استراتيجية LocalStrategy
- التحقق من email + password
- تشفير كلمات المرور بـ bcryptjs
- Session serialization/deserialization
```

### Middleware للحماية
```javascript
// middleware/auth.js
- ensureAuthenticated     // يجب تسجيل الدخول
- ensureSuperAdmin        // فقط Super Admin
- ensureAdmin             // فقط Admin
- ensureSpecialist        // فقط Specialist
- ensureAdminOrSpecialist // Admin أو Specialist
```

### Session Management
```javascript
{
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000  // 1 يوم
  }
}
```

---

## 🔴 Real-time Features (Socket.IO)

### Chat System
```javascript
// Real-time messaging بين Specialists و Parents
- غرف خاصة لكل مستخدم
- إشارة الكتابة (typing indicator)
- إشعارات فورية للرسائل الجديدة
- دعم النصوص والصور والملفات
```

### Notifications System
```javascript
// إشعارات فورية
- عند إضافة طفل جديد
- عند إرسال تقرير تقدم
- عند طلب ربط جديد
- عند قبول/رفض طلب
```

### Socket.IO Events
```javascript
// Client → Server
- 'typing': إشعار الكتابة
- 'send_message': إرسال رسالة

// Server → Client
- 'new_message': رسالة جديدة
- 'user_typing': المستخدم يكتب
- 'new_notification': إشعار جديد
```

---

## 📁 File Upload System

### Multer Configuration
```javascript
// utils/uploadConfig.js
- الصور: avatars, child photos, progress attachments
- الملفات: chat files, documents
- التخزين: /uploads directory
- مشاركة الملفات مع Backend
```

### Upload Paths
```javascript
/uploads/
├── avatars/          // صور المستخدمين
├── children/         // صور الأطفال
├── progress/         // مرفقات التقارير
└── chat/             // ملفات الدردشة
```

---

## 🌐 Multilingual Support

### Supported Languages
- **Arabic (ar)** - default, RTL
- **English (en)** - LTR

### Translation System
```javascript
// config/translations.js
{
  ar: { ... },  // كل المفاتيح بالعربية
  en: { ... }   // كل المفاتيح بالإنجليزية
}

// Usage in views
<%= __('dashboard') %>
```

### Language Switching
```javascript
// Cookie-based
GET /lang/ar  // → Arabic
GET /lang/en  // → English
```

---

## 🔧 Utilities

### 1. Notification Sender (`utils/notificationSender.js`)
```javascript
sendNotification(io, {
  userId,
  message,
  type,
  link
})
```

### 2. Activity Logger (`utils/logger.js`)
```javascript
logActivity(req, action, details, targetId, targetModel)
```

### 3. PDF Exporter (`utils/pdfExporter.js`)
```javascript
exportToPDF(data, columns, title, res)
```

### 4. ID Generator (`utils/idGenerator.js`)
```javascript
generateStaffId('AD')  // → 'AD-0001'
generateStaffId('SP')  // → 'SP-0001'
generateCenterId()     // → 'CT-0001'
```

---

## 🚀 Environment Variables

```bash
# .env file
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/specialist-portal

# Session
SESSION_SECRET=your-secret-key

# Backend Integration
BACKEND_URL=http://localhost:5000
CLIENT_URL=http://localhost:3000
```

---

## 🎯 Key Features Summary

### For Super Admin
- ✅ إدارة مركزية لجميع المراكز
- ✅ إنشاء وتعيين الأدمن
- ✅ إحصائيات شاملة
- ✅ تفعيل/تعطيل المراكز

### For Admin
- ✅ إدارة المتخصصين في مركزه
- ✅ مراجعة الأطفال والأهالي
- ✅ سجلات النشاطات
- ✅ تصدير التقارير (PDF)

### For Specialist
- ✅ إدارة الأطفال المرتبطين
- ✅ إنشاء تقارير التقدم
- ✅ دردشة مع الأهالي (real-time)
- ✅ تحليلات وإحصائيات
- ✅ البحث وربط الأطفال
- ✅ إدارة الملف الشخصي

---

## 📊 Dashboard Features

### Super Admin Dashboard
- عدد المراكز
- عدد الأدمن
- عدد المتخصصين
- عدد الأهالي
- قائمة المراكز الحديثة
- إجراءات سريعة

### Admin Dashboard
- عدد المتخصصين في المركز
- عدد الأطفال
- عدد الأهالي
- نشاطات حديثة
- إحصائيات توزيع المستخدمين
- إجراءات سريعة

### Specialist Dashboard
- عدد الأطفال المرتبطين
- عدد الأهالي
- قائمة الأطفال
- طلبات الربط المعلقة
- آخر التقارير
- رسائل غير مقروءة

---

## 🔗 Integration with Backend

### API Proxy
```javascript
// كل طلبات /api/* تُحوَّل للـ Backend
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true
}));
```

### Shared Resources
- `/uploads` - ملفات مشتركة
- Database - نفس MongoDB
- Models - نفس الـ schemas

---

## 💾 Database Seeding

```javascript
// Auto-seed في development mode
if (process.env.NODE_ENV === 'development') {
  const seedDatabase = require('../backend/seed');
  await seedDatabase();
}
```

---

## 🛠️ Development Workflow

### Start Development Server
```bash
cd specialist-portal
npm install
npm run dev  # nodemon
```

### Environment Setup
```bash
1. نسخ .env.example إلى .env
2. تعديل MONGODB_URI
3. تعديل SESSION_SECRET
4. تشغيل MongoDB
5. npm run dev
```

---

## 📝 Notes

### Important Points
1. **Session-based Authentication** - استخدام cookies فقط
2. **Role-based Access** - كل دور له صلاحيات محددة
3. **Real-time Chat** - Socket.IO للدردشة
4. **Bilingual** - عربي/إنجليزي
5. **File Uploads** - دعم الصور والملفات
6. **Activity Logging** - تسجيل كل الأنشطة
7. **Custom IDs** - معرّفات مخصصة (AD-XXXX, SP-XXXX, CT-XXXX)

### Security Features
- ✅ Password hashing (bcryptjs)
- ✅ Session management
- ✅ Role-based access control
- ✅ Input validation
- ✅ CSRF protection
- ✅ Secure file uploads

---

## 📞 API Integration

التطبيق يستخدم **Backend API منفصل** لـ:
- تسجيل دخول Parent
- إدارة بيانات Parent
- Mobile App integration
- Push notifications

---

## 🎨 UI/UX Features

### Design System
- **Colors**: Modern glassmorphism
- **Typography**: Clean Arabic/English fonts
- **Layout**: Responsive grid system
- **Components**: Reusable cards, tables, forms
- **Icons**: Font Awesome
- **Animations**: Smooth transitions

### Responsive Design
- ✅ Desktop-first
- ✅ Tables responsive
- ✅ Mobile-friendly forms
- ✅ Adaptive navigation

---

## 🔍 Search & Filter

### Specialist Features
- 🔎 البحث عن الأهالي بالـ Email
- 🔎 فلترة الأطفال حسب الحالة
- 🔎 فلترة التقارير حسب التاريخ

### Admin Features
- 🔎 البحث عن المتخصصين
- 🔎 فلترة الأطفال حسب المتخصص
- 🔎 فلترة النشاطات

---

## 📈 Analytics & Reports

### Child Analytics
- 📊 تقدم الطفل عبر الوقت
- 📊 معدل الحضور
- 📊 تقييمات الجلسات
- 📊 مخططات التقدم

### Progress Reports
- 📄 تفاصيل الجلسة
- 📄 الأنشطة المنجزة
- 📄 الملاحظات
- 📄 الأهداف القادمة
- 📄 المرفقات

---

## 🏁 Conclusion

**Specialist Portal** هو نظام إدارة شامل ومتكامل للمراكز المتخصصة، يوفر:
- إدارة هرمية للمستخدمين
- تتبع دقيق للأطفال وتقدمهم
- تواصل real-time
- تقارير وتحليلات
- واجهة سهلة الاستخدام
- دعم متعدد اللغات

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Author**: BEST Team
