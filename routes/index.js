const express = require('express');
const router = express.Router();
const { ensureAuthenticated, redirectByRole } = require('../middleware/auth');

// Home page - redirect based on auth status
router.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        return redirectByRole(req, res);
    }
    res.redirect('/auth/login');
});

module.exports = router;
