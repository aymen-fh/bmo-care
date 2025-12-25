const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = function (passport) {
    passport.use(
        new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
            try {
                // Find user by email
                const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

                if (!user) {
                    return done(null, false, { message: 'البريد الإلكتروني غير مسجل' });
                }

                // Check if user has valid role for portal
                const validRoles = ['superadmin', 'admin', 'specialist'];
                if (!validRoles.includes(user.role)) {
                    return done(null, false, { message: 'ليس لديك صلاحية للدخول إلى هذه البوابة' });
                }

                // Match password
                const isMatch = await bcrypt.compare(password, user.password);

                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'كلمة المرور غير صحيحة' });
                }
            } catch (err) {
                return done(err);
            }
        })
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id)
                .populate('center', 'name nameEn');
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
};
