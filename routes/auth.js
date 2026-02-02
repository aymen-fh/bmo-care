const express = require('express');
const router = express.Router();
const passport = require('passport');
const apiClient = require('../utils/apiClient');
const { ensureGuest, redirectByRole } = require('../middleware/auth');

// Login page
router.get('/login', ensureGuest, (req, res) => {
    res.render('auth/login', {
        title: res.locals.__('loginTitle'),
        layout: false
    });
});

// Forgot password page
router.get('/forgot-password', ensureGuest, (req, res) => {
    res.render('auth/forgot-password', {
        title: res.locals.__('forgotPassword') || 'نسيت كلمة المرور',
        layout: false
    });
});

// Forgot password POST (send code)
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            req.flash('error_msg', res.locals.__('emailRequired') || 'البريد الإلكتروني مطلوب');
            return res.redirect('/auth/forgot-password');
        }

        const response = await apiClient.post('/auth/forgot-password', { email });

        if (response.data.success) {
            req.flash('success_msg', res.locals.__('resetCodeSent') || 'تم إرسال رمز التحقق إلى بريدك');
            return res.redirect('/auth/verify-reset');
        }

        req.flash('error_msg', response.data.message || 'تعذر إرسال الرمز');
        res.redirect('/auth/forgot-password');
    } catch (error) {
        const msg = error.response?.data?.message || 'حدث خطأ أثناء إرسال الرمز';
        req.flash('error_msg', msg);
        res.redirect('/auth/forgot-password');
    }
});

// Verify reset code page
router.get('/verify-reset', ensureGuest, (req, res) => {
    res.render('auth/verify-reset', {
        title: res.locals.__('verifyCode') || 'تأكيد الرمز',
        layout: false
    });
});

// Verify reset code POST
router.post('/verify-reset', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            req.flash('error_msg', res.locals.__('codeRequired') || 'رمز التحقق مطلوب');
            return res.redirect('/auth/verify-reset');
        }

        const response = await apiClient.post('/auth/verify-reset-token', { token: code });

        if (response.data.success) {
            return res.redirect(`/auth/reset-password?token=${encodeURIComponent(code)}`);
        }

        req.flash('error_msg', response.data.message || 'الرمز غير صالح');
        res.redirect('/auth/verify-reset');
    } catch (error) {
        const msg = error.response?.data?.message || 'حدث خطأ أثناء التحقق من الرمز';
        req.flash('error_msg', msg);
        res.redirect('/auth/verify-reset');
    }
});

// Reset password page
router.get('/reset-password', ensureGuest, (req, res) => {
    const token = req.query.token || '';
    res.render('auth/reset-password', {
        title: res.locals.__('resetPassword') || 'إعادة تعيين كلمة المرور',
        token,
        layout: false
    });
});

// Reset password POST
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password, confirmPassword } = req.body;
        if (!token) {
            req.flash('error_msg', res.locals.__('codeRequired') || 'رمز التحقق مطلوب');
            return res.redirect('/auth/reset-password');
        }
        if (!password) {
            req.flash('error_msg', res.locals.__('passwordRequired') || 'كلمة المرور مطلوبة');
            return res.redirect(`/auth/reset-password?token=${encodeURIComponent(token)}`);
        }
        if (password !== confirmPassword) {
            req.flash('error_msg', res.locals.__('passwordMismatch') || 'كلمتا المرور غير متطابقتين');
            return res.redirect(`/auth/reset-password?token=${encodeURIComponent(token)}`);
        }

        const response = await apiClient.put('/auth/reset-password', { token, newPassword: password });

        if (response.data.success) {
            req.flash('success_msg', res.locals.__('passwordResetSuccess') || 'تم تحديث كلمة المرور بنجاح');
            return res.redirect('/auth/login');
        }

        req.flash('error_msg', response.data.message || 'تعذر تحديث كلمة المرور');
        res.redirect(`/auth/reset-password?token=${encodeURIComponent(token)}`);
    } catch (error) {
        const msg = error.response?.data?.message || 'حدث خطأ أثناء تحديث كلمة المرور';
        req.flash('error_msg', msg);
        res.redirect(`/auth/reset-password?token=${encodeURIComponent(req.body?.token || '')}`);
    }
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
