const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { ensureAuthenticated } = require('../middleware/auth');

// Get all notifications for current user
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .sort('-createdAt')
            .limit(20)
            .populate('sender', 'name');

        res.json({ success: true, notifications });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error fetching notifications' });
    }
});

// Get unread count
router.get('/unread-count', ensureAuthenticated, async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            recipient: req.user.id,
            read: false
        });
        res.json({ success: true, count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

// Mark single notification as read
router.post('/:id/read', ensureAuthenticated, async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user.id },
            { read: true }
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

// Mark all as read
router.post('/read-all', ensureAuthenticated, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id, read: false },
            { read: true }
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

module.exports = router;
