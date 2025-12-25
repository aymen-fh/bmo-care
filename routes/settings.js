const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { ensureAdmin } = require('../middleware/auth');

// Get Settings Page
router.get('/', ensureAdmin, async (req, res) => {
    try {
        const settingsList = await Setting.find();

        // Convert array to object for easier access in view
        const settings = {};
        settingsList.forEach(s => settings[s.key] = s.value);

        // Default values
        const defaults = {
            appName: 'Portal',
            appEmail: 'admin@portal.com',
            maintenanceMode: false,
            maxUploadSize: 5,
            themeColor: '#3b82f6'
        };

        res.render('admin/settings', {
            title: 'Settings',
            settings: { ...defaults, ...settings },
            activePage: 'settings'
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Error loading settings');
        res.redirect('/admin');
    }
});

// Update Settings
router.post('/', ensureAdmin, async (req, res) => {
    try {
        const updates = req.body;

        // Handle checkbox (maintenanceMode)
        if (!updates.maintenanceMode) updates.maintenanceMode = false;
        else updates.maintenanceMode = true;

        const promises = Object.keys(updates).map(key => {
            return Setting.set(key, updates[key]);
        });

        await Promise.all(promises);

        req.flash('success_msg', 'Settings updated successfully');
        res.redirect('/settings');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Error updating settings');
        res.redirect('/settings');
    }
});

module.exports = router;
