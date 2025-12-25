const express = require('express');
const router = express.Router();
const passport = require('passport');
const { ensureGuest, redirectByRole } = require('../middleware/auth');

// Login page
router.get('/login', ensureGuest, (req, res) => {
    res.render('auth/login', {
        title: res.locals.__('loginTitle'),
        layout: false
    });
});

// Login POST
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/auth/login',
        failureFlash: true
    })(req, res, next);
});

// Logout
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success_msg', 'تم تسجيل الخروج بنجاح');
        res.redirect('/auth/login');
    });
});

module.exports = router;
