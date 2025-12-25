const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { ensureAdmin } = require('../middleware/auth');

// View Activity Log
router.get('/', ensureAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const total = await ActivityLog.countDocuments();

        const logs = await ActivityLog.find()
            .populate('user', 'name role')
            .sort('-createdAt')
            .skip(skip)
            .limit(limit);

        const pages = Math.ceil(total / limit);

        res.render('admin/activity-log', {
            title: res.locals.__('activityLog') || 'سجل النشاطات',
            logs,
            currentPage: page,
            pages,
            activePage: 'activity'
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Error loading activity log');
        res.redirect('/admin');
    }
});

module.exports = router;
