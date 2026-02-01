const express = require('express');
const router = express.Router();
const apiClient = require('../utils/apiClient');
const { ensureAdmin } = require('../middleware/auth');

// View Activity Log
router.get('/', ensureAdmin, async (req, res) => {
    try {
        const searchQuery = req.query.search ? req.query.search.toLowerCase() : '';

        const [specialistsRes, requestsRes] = await Promise.all([
            apiClient.authGet(req, '/admin/specialists'),
            apiClient.authGet(req, '/admin/link-requests')
        ]);

        let specialists = specialistsRes.data.success ? specialistsRes.data.specialists : [];
        const requests = requestsRes.data.success ? requestsRes.data.requests : [];

        if (searchQuery) {
            specialists = specialists.filter(s =>
                (s.name || '').toLowerCase().includes(searchQuery) ||
                (s.email || '').toLowerCase().includes(searchQuery)
            );
        }

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
            title: res.locals.__('activityLog') || 'سجل النشاطات',
            specialists: specialistsWithLogs,
            searchQuery: req.query.search || ''
        });
    } catch (error) {
        console.error('Activity Log Error:', error.message);
        req.flash('error_msg', 'Error loading activity log');
        res.redirect('/admin');
    }
});

module.exports = router;

