const express = require('express');
const router = express.Router();
const apiClient = require('../utils/apiClient');
const { ensureAdmin } = require('../middleware/auth');

// Apply admin middleware to all routes
router.use(ensureAdmin);

// Dashboard
router.get('/', async (req, res) => {
    try {
        let center = null;
        let stats = { specialists: 0, parents: 0, children: 0 };
        let recentSpecialists = [];

        if (req.user.center) {
            // Get Center details with stats
            const centerRes = await apiClient.authGet(req, `/centers/${req.user.center}`);
            if (centerRes.data.success) {
                center = centerRes.data.center;
            }

            // Get Stats
            const statsRes = await apiClient.authGet(req, '/admin/stats');
            if (statsRes.data.success) {
                const rawStats = statsRes.data.stats || {};
                stats = {
                    specialists: rawStats.centerSpecialists ?? rawStats.specialists ?? 0,
                    parents: rawStats.myParents ?? rawStats.parents ?? 0,
                    children: rawStats.centerChildren ?? rawStats.children ?? rawStats.myChildren ?? 0
                };
                recentSpecialists = statsRes.data.recentSpecialists || [];
            }
        }

        res.render('admin/dashboard', {
            title: res.locals.__('dashboard'),
            center,
            stats,
            recentSpecialists
        });
    } catch (error) {
        console.error('Dashboard Error:', error.message);
        res.render('admin/dashboard', {
            title: res.locals.__('dashboard'),
            center: null,
            stats: { specialists: 0, parents: 0, children: 0 },
            recentSpecialists: []
        });
    }
});

// ========================================
// SPECIALISTS
// ========================================

// List all specialists in center
router.get('/specialists', async (req, res) => {
    try {
        if (!req.user.center) {
            req.flash('error_msg', 'لا يوجد مركز مرتبط بحسابك');
            return res.redirect('/admin');
        }

        const response = await apiClient.authGet(req, '/admin/specialists', {
            params: req.query
        });

        const specialists = response.data.success ? response.data.specialists : [];

        res.render('admin/specialists', {
            title: 'إدارة الأخصائيين',
            specialists,
            searchQuery: req.query.search || '',
            filters: {
                status: req.query.status || '',
                sort: req.query.sort || '-createdAt',
                period: req.query.period || ''
            }
        });
    } catch (error) {
        console.error('List Specialists Error:', error.message);
        req.flash('error_msg', 'حدث خطأ في جلب قائمة الأخصائيين');
        res.redirect('/admin');
    }
});

// Create specialist form
router.get('/specialists/create', (req, res) => {
    if (!req.user.center) {
        req.flash('error_msg', 'لا يوجد مركز مرتبط بحسابك');
        return res.redirect('/admin');
    }

    res.render('admin/specialist-form', {
        title: res.locals.__('createSpecialist'),
        specialist: null,
        isEdit: false
    });
});

// Create specialist POST
router.post('/specialists', async (req, res) => {
    try {
        if (!req.user.center) {
            req.flash('error_msg', 'لا يوجد مركز مرتبط بحسابك');
            return res.redirect('/admin');
        }

        const response = await apiClient.authPost(req, '/admin/create-specialist', req.body);

        if (response.data.success) {
            req.flash('success_msg', 'تم إنشاء حساب الأخصائي بنجاح');
            res.redirect('/admin/specialists');
        } else {
            req.flash('error_msg', response.data.message || 'فشل إنشاء الحساب');
            res.redirect('/admin/specialists/create');
        }

    } catch (error) {
        console.error('Create Specialist Error:', error.message);
        const msg = error.response?.data?.message || 'حدث خطأ في إنشاء الأخصائي';
        req.flash('error_msg', msg);
        res.redirect('/admin/specialists/create');
    }
});

// View specialist details
router.get('/specialists/:id', async (req, res) => {
    try {
        // Backend doesn't support direct ID fetch in /admin/specialists yet, 
        // usually we list all. But let's assume standard REST endpoint logic or reuse internal fetch.
        // Wait, I didn't verify a specific "get specialist by ID" endpoint in backend admin.js.
        // But the previous implementation assumed it. Let's assume PUT /specialists/:id exists, causing a need for GET /specialists/:id?
        // Actually, the new backend uses Specialist.find() broadly.
        // Let's rely on standard practice or use admin/specialists (list) and filter manually if endpoint missing?
        // NO, clean way: I added GET /api/admin/specialists (list). I should verify if I added GET /:id.
        // Looking at my backend rewrite: only PUT, DELETE, POST create, GET list. 
        // Missing GET /:id.  
        // WORKAROUND: For view detail, we often just pass data. But if deep link needed...
        // Let's implement robustly. I'll add GET /:id support to backend next step if needed. 
        // For now, let's keep it simple or redirect if fails.
        // Actually, let's use the 'list' endpoint but filter or assume the backend supports standard resource access.
        // Wait, standard practice is to separate it.
        // If I missed GET /:id in backend, I should add it.
        // Let's check my rewrite of backend/routes/admin.js...
        // It has GET /specialists (list), POST create, PUT :id, DELETE :id.
        // IT MISSES GET /specialists/:id!
        // I will add it in next turn. For now I write this code assuming it exists or will exist shortly.

        // Actually, I can fix the backend file RIGHT NOW in the next step to include GET /:id.
        // So I'll write this portal code anticipating that fix.

        const response = await apiClient.authGet(req, `/admin/specialists/${req.params.id}`);

        if (!response.data.success) {
            req.flash('error_msg', 'الأخصائي غير موجود');
            return res.redirect('/admin/specialists');
        }

        res.render('admin/specialist-details', {
            title: response.data.specialist.name,
            specialist: response.data.specialist
        });
    } catch (error) {
        console.error('Spec Details Error:', error.message);
        req.flash('error_msg', 'حدث خطأ في عرض التفاصيل');
        res.redirect('/admin/specialists');
    }
});

// Delete specialist
router.post('/specialists/:id/delete', async (req, res) => {
    try {
        const response = await apiClient.authDelete(req, `/admin/specialists/${req.params.id}`);

        if (response.data.success) {
            req.flash('success_msg', 'تم إزالة الأخصائي من المركز');
        } else {
            req.flash('error_msg', response.data.message || 'فشل الحذف');
        }
        res.redirect('/admin/specialists');
    } catch (error) {
        console.error('Delete Specialist Error:', error.message);
        req.flash('error_msg', 'حدث خطأ في عملية الحذف');
        res.redirect('/admin/specialists');
    }
});

// Bulk delete specialists
router.post('/specialists/bulk-delete', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.json({ success: false, message: 'لا توجد عناصر محددة للحذف' });
        }

        const results = await Promise.allSettled(
            ids.map((id) => apiClient.authDelete(req, `/admin/specialists/${id}`))
        );

        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
            return res.json({
                success: false,
                message: `فشل حذف ${failed.length} عنصر(عناصر)`
            });
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('Bulk Delete Error:', error.message);
        res.json({ success: false, message: error.message });
    }
});

// Search parents for specialist (AJAX)
router.get('/specialists/:id/search-parents', async (req, res) => {
    try {
        const response = await apiClient.authGet(req, `/admin/specialists/${req.params.id}/search-parents`, {
            params: req.query
        });

        res.json(response.data);
    } catch (error) {
        console.error('Search Parents Error:', error.message);
        res.json({ success: false, message: error.message });
    }
});

// Link parent to specialist
router.post('/specialists/:id/link-parent', async (req, res) => {
    try {
        const { parentId } = req.body;
        // Call NEW endpoint
        const response = await apiClient.authPost(req, `/admin/specialists/${req.params.id}/link-parent`, { parentId });

        if (response.data.success) {
            req.flash('success_msg', 'تم ربط ولي الأمر بالأخصائي بنجاح');
        } else {
            req.flash('error_msg', response.data.message || 'فشل الربط');
        }
        res.redirect(`/admin/specialists/${req.params.id}`);
    } catch (error) {
        console.error('Link Parent Error:', error.message);
        req.flash('error_msg', 'حدث خطأ في عملية الربط');
        res.redirect(`/admin/specialists/${req.params.id}`);
    }
});

// Unlink parent from specialist
router.post('/specialists/:id/unlink-parent/:parentId', async (req, res) => {
    try {
        // Call NEW endpoint
        const response = await apiClient.authPost(req, `/admin/specialists/${req.params.id}/unlink-parent/${req.params.parentId}`);

        if (response.data.success) {
            req.flash('success_msg', 'تم إلغاء ربط ولي الأمر');
        } else {
            req.flash('error_msg', response.data.message || 'فشل إلغاء الربط');
        }
        res.redirect(`/admin/specialists/${req.params.id}`);
    } catch (error) {
        console.error('Unlink Parent Error:', error.message);
        req.flash('error_msg', 'حدث خطأ');
        res.redirect(`/admin/specialists/${req.params.id}`);
    }
});

// Link specific child to specialist
router.post('/specialists/:id/link-child', async (req, res) => {
    try {
        const { childId, parentId } = req.body;
        // Call NEW endpoint
        const response = await apiClient.authPost(req, `/admin/specialists/${req.params.id}/link-child`, { childId });

        if (response.data.success) {
            req.flash('success_msg', 'تم ربط الطفل بالأخصائي بنجاح');
        } else {
            req.flash('error_msg', response.data.message || 'فشل عملية الربط');
        }
        res.redirect(`/admin/specialists/${req.params.id}`);

    } catch (error) {
        console.error('Link Child Error:', error.message);
        req.flash('error_msg', 'حدث خطأ في ربط الطفل');
        res.redirect('/admin/specialists');
    }
});

// Unlink child from specialist
router.post('/specialists/:id/unlink-child/:childId', async (req, res) => {
    try {
        // Call NEW endpoint
        const response = await apiClient.authPost(req, `/admin/specialists/${req.params.id}/unlink-child/${req.params.childId}`);

        if (response.data.success) {
            req.flash('success_msg', 'تم إلغاء تعيين الطفل');
        } else {
            req.flash('error_msg', response.data.message || 'فشل إلغاء التعيين');
        }
        res.redirect(`/admin/specialists/${req.params.id}`);
    } catch (error) {
        console.error('Unlink Child Error:', error.message);
        req.flash('error_msg', 'حدث خطأ');
        res.redirect('/admin/specialists');
    }
});

// ========================================
// ADMIN AS SPECIALIST FUNCTIONALITY
// ========================================

// My parents
router.get('/parents', async (req, res) => {
    try {
        const response = await apiClient.authGet(req, '/admin/parents');
        const parents = response.data.success ? response.data.parents : [];

        res.render('admin/parents', {
            title: res.locals.__('myParents'),
            parents
        });
    } catch (error) {
        console.error('My Parents Error:', error.message);
        req.flash('error_msg', 'حدث خطأ');
        res.redirect('/admin');
    }
});

// My children
router.get('/children', async (req, res) => {
    try {
        const response = await apiClient.authGet(req, '/admin/my-children');
        const children = response.data.success ? response.data.children : [];

        res.render('admin/children', {
            title: res.locals.__('myChildren'),
            children
        });
    } catch (error) {
        console.error('My Children Error:', error.message);
        req.flash('error_msg', 'حدث خطأ');
        res.redirect('/admin');
    }
});

// Activity Log
router.get('/activity', async (req, res) => {
    try {
        const searchQuery = req.query.search ? req.query.search.toLowerCase() : '';

        // 1. Fetch Specialists in Center
        const specialistsRes = await apiClient.authGet(req, '/admin/specialists');
        let specialists = specialistsRes.data.success ? specialistsRes.data.specialists : [];

        // 2. Filter Specialists if search query exists
        if (searchQuery) {
            specialists = specialists.filter(s =>
                s.name.toLowerCase().includes(searchQuery) ||
                s.email.toLowerCase().includes(searchQuery)
            );
        }

        // 3. Fetch logs (Link Requests as proxy)
        const requestsRes = await apiClient.authGet(req, '/admin/link-requests');
        const requests = requestsRes.data.success ? requestsRes.data.requests : [];

        // 4. Group logs by Specialist
        const specialistsWithLogs = specialists.map(specialist => {
            const specialistLogs = requests
                .filter(r => r.from && r.from._id === specialist._id)
                .map(r => ({
                    action: `Link Request (${r.status})`,
                    createdAt: r.createdAt,
                    details: `Status: ${r.status}`,
                    type: r.status === 'pending' ? 'update' : (r.status === 'approved' ? 'create' : 'delete')
                }));

            return {
                ...specialist,
                activities: specialistLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            };
        });

        res.render('admin/activity-log', {
            title: res.locals.__('activityLog'),
            specialists: specialistsWithLogs,
            searchQuery: req.query.search || ''
        });
    } catch (error) {
        console.error('Activity Log Error:', error.message);
        res.render('admin/activity-log', {
            title: res.locals.__('activityLog'),
            specialists: [],
            searchQuery: req.query.search || ''
        });
    }
});

module.exports = router;
