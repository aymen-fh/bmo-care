// Ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'يجب تسجيل الدخول أولاً');
    res.redirect('/auth/login');
};

// Ensure user is NOT authenticated (for login page)
const ensureGuest = (req, res, next) => {
    if (req.isAuthenticated()) {
        // Redirect based on role
        return redirectByRole(req, res);
    }
    next();
};

// Ensure user has required role
const ensureRole = (...roles) => {
    return (req, res, next) => {
        if (!req.isAuthenticated()) {
            req.flash('error_msg', 'يجب تسجيل الدخول أولاً');
            return res.redirect('/auth/login');
        }

        if (!roles.includes(req.user.role)) {
            req.flash('error_msg', 'ليس لديك صلاحية للوصول إلى هذه الصفحة');
            return redirectByRole(req, res);
        }

        next();
    };
};

// Ensure user is superadmin
const ensureSuperAdmin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash('error_msg', 'يجب تسجيل الدخول أولاً');
        return res.redirect('/auth/login');
    }

    if (req.user.role !== 'superadmin') {
        req.flash('error_msg', 'ليس لديك صلاحية للوصول إلى هذه الصفحة');
        return redirectByRole(req, res);
    }

    next();
};

// Ensure user is admin or superadmin
const ensureAdmin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash('error_msg', 'يجب تسجيل الدخول أولاً');
        return res.redirect('/auth/login');
    }

    if (!['admin', 'superadmin'].includes(req.user.role)) {
        req.flash('error_msg', 'ليس لديك صلاحية للوصول إلى هذه الصفحة');
        return redirectByRole(req, res);
    }

    next();
};

// Ensure user is specialist, admin, or superadmin
const ensureSpecialist = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash('error_msg', 'يجب تسجيل الدخول أولاً');
        return res.redirect('/auth/login');
    }

    if (!['specialist', 'admin', 'superadmin'].includes(req.user.role)) {
        req.flash('error_msg', 'ليس لديك صلاحية للوصول إلى هذه الصفحة');
        return redirectByRole(req, res);
    }

    next();
};

// Redirect user based on role
const redirectByRole = (req, res) => {
    const role = req.user?.role;

    switch (role) {
        case 'superadmin':
            return res.redirect('/superadmin');
        case 'admin':
            return res.redirect('/admin');
        case 'specialist':
            return res.redirect('/specialist');
        default:
            return res.redirect('/auth/login');
    }
};

module.exports = {
    ensureAuthenticated,
    ensureGuest,
    ensureRole,
    ensureSuperAdmin,
    ensureAdmin,
    ensureSpecialist,
    redirectByRole
};
