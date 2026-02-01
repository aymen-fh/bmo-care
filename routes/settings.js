const express = require('express');
const router = express.Router();
const apiClient = require('../utils/apiClient');
const { ensureAdmin } = require('../middleware/auth');

// Get Settings Page
router.get('/', ensureAdmin, async (req, res) => {
    try {
        // Backend no longer exposes /admin/settings. Use safe defaults.
        const defaults = {
            appName: 'Portal',
            appEmail: 'admin@portal.com',
            maintenanceMode: false,
            maxUploadSize: 5,
            themeColor: '#3b82f6'
        };

        res.render('admin/settings', {
            title: 'Settings',
            settings: { ...defaults },
            activePage: 'settings'
        });
    } catch (error) {
        console.error('Settings View Error:', error.message);
        req.flash('error_msg', 'Error loading settings');
        res.redirect('/admin');
    }
});

// Update Settings
router.post('/', ensureAdmin, async (req, res) => {
    try {
        // Backend no longer supports settings updates.
        req.flash('error_msg', 'Settings updates are not supported in the current backend.');
        res.redirect('/settings');
    } catch (error) {
        console.error('Settings Update Error:', error.message);
        req.flash('error_msg', 'Error updating settings');
        res.redirect('/settings');
    }
});

module.exports = router;

