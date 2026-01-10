const LocalStrategy = require('passport-local').Strategy;
const apiClient = require('../utils/apiClient');

module.exports = function (passport) {
    passport.use(
        new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
            try {
                // Call Backend Login API
                const response = await apiClient.post('/auth/login', {
                    email,
                    password
                });

                const data = response.data || {};
                const token = data.token;
                const user = data.user;
                const loginOk = (data.success === true) || (typeof token === 'string' && token.length > 10);

                if (loginOk && user) {
                    // Check role locally as a safeguard, although backend login usually handles this
                    const validRoles = ['superadmin', 'admin', 'specialist'];
                    if (!validRoles.includes(user.role)) {
                        return done(null, false, { message: 'ليس لديك صلاحية للدخول إلى هذه البوابة' });
                    }

                    // Attach token to user object so we can use it on subsequent requests
                    user.token = token;
                    return done(null, user);
                } else {
                    return done(null, false, { message: data.message || 'فشل تسجيل الدخول' });
                }
            } catch (err) {
                // Distinguish between invalid credentials and backend/network failures
                const status = err.response?.status;
                const backendMessage = err.response?.data?.message;
                const code = err.code;

                // Wrong credentials
                if (status === 401) {
                    return done(null, false, { message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
                }

                // Backend temporarily unavailable (Railway/edge 502, timeouts, DNS issues, etc.)
                const looksLikeNetworkIssue =
                    status === 502 || status === 503 || status === 504 ||
                    code === 'ECONNABORTED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND' ||
                    code === 'ECONNREFUSED' || code === 'EAI_AGAIN';

                if (looksLikeNetworkIssue) {
                    return done(null, false, { message: 'الخادم غير متاح حالياً. حاول مرة أخرى بعد دقيقة.' });
                }

                // Fallback to backend message if present, otherwise a safe generic
                const msg = backendMessage || 'حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.';
                return done(null, false, { message: msg });
            }
        })
    );

    passport.serializeUser((user, done) => {
        // We only serialize the ID. In a stricter API-only setup, 
        // we might store the token in the session instead.
        // For now, we'll assume we can fetch user by ID or store the whole user in session.
        // Storing the whole user avoids needing to fetch on every request if we don't want to.
        // But the standard way is ID. Let's stick to ID but we need a way to get the user data back.
        // Since we removed DB access, we MUST use API to fetch user 'me' or by ID.
        // However, fetching 'me' requires the token!

        // Solution: Store basic user info + token in session.
        done(null, user);
    });

    passport.deserializeUser(async (userFromSession, done) => {
        try {
            // Case 1: userFromSession is just an ID (Old way) -> This breaks without DB
            // Case 2: userFromSession is the full object we serialized (New way)

            // To ensure fresh data, we SHOULD fetch from API. 
            // But we need the token. Fortunately, we attached it to userFromSession in LocalStrategy.

            const token = userFromSession?.token;
            if (!token) {
                return done(null, false);
            }

            const response = await apiClient.get('/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = response.data || {};
            const freshUser = data.user;
            const ok = (data.success === true) || (freshUser && typeof freshUser === 'object');

            if (ok && freshUser) {
                freshUser.token = token; // Keep the token
                return done(null, freshUser);
            }

            // Fallback: use session data if API fails or token missing?
            // If API fails, we probably shouldn't let them proceed authenticated with stale data
            // but for resilience 'server down' middleware handles that.
            // If we can't verify headers, we fail.

            // If we couldn't refresh, return what we have (not recommended) or log out.
            // Let's assume successful refresh for now.
            return done(null, false);

        } catch (err) {
            const status = err.response?.status;

            // Token invalid/expired: treat as logged out so routes redirect to /auth/login.
            if (status === 401 || status === 403) {
                return done(null, false);
            }

            // Backend/network issues: keep session user so the portal can render a "server down" page.
            console.error('Deserialize Error:', err.message);
            return done(null, userFromSession);
        }
    });
};

