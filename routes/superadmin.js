const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Center = require('../models/Center');
const { ensureSuperAdmin } = require('../middleware/auth');

// Apply superadmin middleware to all routes
router.use(ensureSuperAdmin);

// Dashboard
router.get('/', async (req, res) => {
    try {
        const [centersCount, adminsCount, specialistsCount, parentsCount] = await Promise.all([
            Center.countDocuments(),
            User.countDocuments({ role: 'admin' }),
            User.countDocuments({ role: 'specialist' }),
            User.countDocuments({ role: 'parent' })
        ]);

        // Get monthly growth stats (last 6 months)
        const months = [];
        const parentsGrowth = [];
        const specialistsGrowth = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            date.setDate(1);
            date.setHours(0, 0, 0, 0);

            const nextMonth = new Date(date);
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            months.push(date.toLocaleString('ar-SA', { month: 'short' }));

            const pCount = await User.countDocuments({
                role: 'parent',
                createdAt: { $lt: nextMonth }
            });
            parentsGrowth.push(pCount);

            const sCount = await User.countDocuments({
                role: 'specialist',
                createdAt: { $lt: nextMonth }
            });
            specialistsGrowth.push(sCount);
        }

        const recentCenters = await Center.find()
            .populate('admin', 'name')
            .sort('-createdAt')
            .limit(5);

        res.render('superadmin/dashboard', {
            title: res.locals.__('dashboard'),
            stats: {
                centers: centersCount,
                admins: adminsCount,
                specialists: specialistsCount,
                parents: parentsCount
            },
            chartData: {
                months,
                parentsGrowth,
                childrenGrowth: specialistsGrowth,
                specialistsCount,
                parentsCount,
                adminsCount
            },
            recentCenters
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'حدث خطأ في تحميل البيانات');
        res.redirect('/');
    }
});

// ========================================
// CENTERS
// ========================================

// List all centers
router.get('/centers', async (req, res) => {
    try {
        const centers = await Center.find()
            .populate('admin', 'name email')
            .sort('-createdAt');

        res.render('superadmin/centers', {
            title: res.locals.__('centers'),
            centers
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'حدث خطأ في تحميل المراكز');
        res.redirect('/superadmin');
    }
});

// Create center form
router.get('/centers/create', (req, res) => {
    res.render('superadmin/center-form', {
        title: res.locals.__('createCenter'),
        center: null,
        isEdit: false
    });
});

// Create center POST
router.post('/centers', async (req, res) => {
    try {
        const { name, nameEn, address, phone, email, description, adminName, adminEmail, adminPassword, adminPhone } = req.body;

        if (!name) {
            req.flash('error_msg', 'اسم المركز مطلوب');
            return res.redirect('/superadmin/centers/create');
        }

        // 1. Check if Admin Email is already taken (if provided)
        if (adminEmail) {
            const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
            if (existingUser) {
                req.flash('error_msg', 'البريد الإلكتروني للمدير مستخدم بالفعل');
                return res.redirect('/superadmin/centers/create');
            }
        }

        // 2. Create Center
        const center = await Center.create({
            name,
            nameEn,
            address,
            phone,
            email,
            description,
            createdBy: req.user.id
        });

        // 3. Create Admin User (if details provided)
        if (adminName && adminEmail && adminPassword) {
            // User model pre-save hook will hash the password
            const admin = await User.create({
                name: adminName,
                email: adminEmail.toLowerCase(),
                password: adminPassword,
                phone: adminPhone,
                role: 'admin',
                center: center._id,
                createdBy: req.user.id,
                emailVerified: true
            });

            // 4. Link Admin to Center
            center.admin = admin._id;
            await center.save();
        }

        req.flash('success_msg', 'تم إنشاء المركز والمدير بنجاح');
        res.redirect('/superadmin/centers');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'حدث خطأ في إنشاء المركز: ' + error.message);
        res.redirect('/superadmin/centers/create');
    }
});

// Edit center form
router.get('/centers/:id/edit', async (req, res) => {
    try {
        const center = await Center.findById(req.params.id);
        if (!center) {
            req.flash('error_msg', 'المركز غير موجود');
            return res.redirect('/superadmin/centers');
        }

        res.render('superadmin/center-form', {
            title: res.locals.__('edit') + ' ' + center.name,
            center,
            isEdit: true
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'حدث خطأ');
        res.redirect('/superadmin/centers');
    }
});

// Update center
router.post('/centers/:id', async (req, res) => {
    try {
        const { name, nameEn, address, phone, email, description, isActive } = req.body;

        await Center.findByIdAndUpdate(req.params.id, {
            name,
            nameEn,
            address,
            phone,
            email,
            description,
            isActive: isActive === 'on'
        });

        req.flash('success_msg', 'تم تحديث المركز بنجاح');
        res.redirect('/superadmin/centers');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'حدث خطأ في تحديث المركز');
        res.redirect('/superadmin/centers');
    }
});

// Delete center
router.post('/centers/:id/delete', async (req, res) => {
    try {
        const center = await Center.findById(req.params.id);
        if (!center) {
            req.flash('error_msg', 'المركز غير موجود');
            return res.redirect('/superadmin/centers');
        }

        // Remove center reference from users
        await User.updateMany(
            { center: center._id },
            { center: null }
        );

        await Center.findByIdAndDelete(req.params.id);

        req.flash('success_msg', 'تم حذف المركز بنجاح');
        res.redirect('/superadmin/centers');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'حدث خطأ في حذف المركز');
        res.redirect('/superadmin/centers');
    }
});

// ========================================
// ADMINS
// ========================================

// List all admins
router.get('/admins', async (req, res) => {
    try {
        const { search } = req.query;

        let query = { role: 'admin' };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { staffId: { $regex: search, $options: 'i' } }
            ];
        }

        const admins = await User.find(query)
            .populate('center', 'name')
            .sort('-createdAt');

        const centers = await Center.find({ admin: null }).select('name');

        res.render('superadmin/admins', {
            title: res.locals.__('admins'),
            admins,
            availableCenters: centers,
            searchQuery: search || ''
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'حدث خطأ في تحميل الإداريين');
        res.redirect('/superadmin');
    }
});

// Create admin form
router.get('/admins/create', async (req, res) => {
    try {
        const centers = await Center.find().select('name');

        res.render('superadmin/admin-form', {
            title: res.locals.__('createAdmin'),
            admin: null,
            centers,
            isEdit: false
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'حدث خطأ');
        res.redirect('/superadmin/admins');
    }
});

// Create admin POST
router.post('/admins', async (req, res) => {
    try {
        const { name, email, password, phone, centerId } = req.body;

        if (!name || !email || !password) {
            req.flash('error_msg', 'جميع الحقول المطلوبة يجب ملؤها');
            return res.redirect('/superadmin/admins/create');
        }

        // Check if email exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            req.flash('error_msg', 'البريد الإلكتروني مستخدم بالفعل');
            return res.redirect('/superadmin/admins/create');
        }

        // User model pre-save hook will hash the password
        const admin = await User.create({
            name,
            email: email.toLowerCase(),
            password,
            phone,
            role: 'admin',
            center: centerId || null,
            createdBy: req.user.id,
            emailVerified: true
        });

        // Assign admin to center
        if (centerId) {
            await Center.findByIdAndUpdate(centerId, { admin: admin._id });
        }

        req.flash('success_msg', 'تم إنشاء حساب المدير بنجاح');
        res.redirect('/superadmin/admins');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'حدث خطأ في إنشاء المدير');
        res.redirect('/superadmin/admins/create');
    }
});

// Delete admin
router.post('/admins/:id/delete', async (req, res) => {
    try {
        const admin = await User.findById(req.params.id);
        if (!admin || admin.role !== 'admin') {
            req.flash('error_msg', 'المدير غير موجود');
            return res.redirect('/superadmin/admins');
        }

        // Remove admin from center
        if (admin.center) {
            await Center.findByIdAndUpdate(admin.center, { admin: null });
        }

        await User.findByIdAndDelete(req.params.id);

        req.flash('success_msg', 'تم حذف المدير بنجاح');
        res.redirect('/superadmin/admins');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'حدث خطأ في حذف المدير');
        res.redirect('/superadmin/admins');
    }
});

module.exports = router;
