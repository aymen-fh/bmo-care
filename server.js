const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

// Initialize app
const app = express();

// API Proxy Configuration - Forward all /api/* requests to backend
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
app.use('/api', createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
        // Forward cookies for authentication
        if (req.headers.cookie) {
            proxyReq.setHeader('cookie', req.headers.cookie);
        }
        console.log(`🔀 [PROXY] ${req.method} ${req.url} → ${BACKEND_URL}${req.url}`);
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`✅ [PROXY] Response ${proxyRes.statusCode} for ${req.url}`);
    },
    onError: (err, req, res) => {
        console.error(`❌ [PROXY ERROR] ${err.message}`);
        res.status(500).json({ success: false, message: 'Backend service unavailable' });
    }
}));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
    socketTimeoutMS: 45000, // Socket timeout
})
    .then(async () => {
        console.log('✅ متصل بقاعدة البيانات');

        // Ensure connection is fully ready
        if (mongoose.connection.readyState !== 1) {
            console.log('⏳ في انتظار اكتمال الاتصال بقاعدة البيانات...');
            await new Promise(resolve => {
                mongoose.connection.once('connected', resolve);
            });
        }

        console.log('✅ قاعدة البيانات جاهزة تماماً');

        // Auto-seed database (Updated)
        if (process.env.NODE_ENV === 'development') {
            try {
                const seedDatabase = require('../backend/seed');
                await seedDatabase();
                console.log('✅ تم ملء قاعدة البيانات بنجاح');
            } catch (error) {
                console.error('❌ Error seeding database:', error);
                console.log('⚠️ سيتم متابعة تشغيل الخادم على أي حال...');
            }
        }
    })
    .catch(err => {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err);
        process.exit(1);
    });

// Models
require('./models/Center');
require('./models/User');
require('./models/Child');
require('./models/LinkRequest');
require('./models/Progress');
require('./models/Message');

// Passport config
require('./config/passport')(passport);

// EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Static folder
app.use(express.static(path.join(__dirname, 'public')));
// Access Backend Uploads (Shared Storage)
app.use('/uploads', express.static(path.join(__dirname, '../backend/uploads')));

// Express session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    res.locals.lang = req.cookies.lang || 'ar';
    next();
});

// Translations middleware
const translations = require('./config/translations');
app.use((req, res, next) => {
    const lang = req.cookies.lang || 'ar';
    res.locals.__ = (key) => translations[lang][key] || translations['ar'][key] || key;
    res.locals.currentLang = lang;
    res.locals.isRTL = lang === 'ar';
    next();
});

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/superadmin', require('./routes/superadmin'));
app.use('/admin', require('./routes/admin'));
app.use('/specialist/words', require('./routes/words'));
app.use('/specialist', require('./routes/specialist'));

// Language switch route
app.get('/lang/:lang', (req, res) => {
    const lang = req.params.lang === 'en' ? 'en' : 'ar';
    res.cookie('lang', lang, { maxAge: 365 * 24 * 60 * 60 * 1000 }); // 1 year
    res.redirect('back');
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('errors/404');
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    // Ensure translation function and locals exist even if middleware failed
    const __ = res.locals.__ || ((key) => key);
    const currentLang = res.locals.currentLang || 'ar';
    const isRTL = res.locals.isRTL !== undefined ? res.locals.isRTL : true;

    if (process.env.NODE_ENV === 'development') {
        // Show detailed error in development
        res.status(err.status || 500).render('error', {
            title: __('error'),
            message: err.message,
            error: err,
            __, currentLang, isRTL
        });
    } else {
        // Show friendly error in production
        res.status(500).render('errors/500');
    }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`🚀 البوابة تعمل على المنفذ ${PORT}`);
    console.log(`   افتح http://localhost:${PORT} في المتصفح`);
});

// Socket.IO setup
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || '*',
        credentials: true
    }
});

// Store IO instance in app for use in routes
app.set('io', io);

// Socket.IO authentication middleware
io.use((socket, next) => {
    const userId = socket.handshake.auth.userId;
    if (!userId) {
        return next(new Error('Invalid user'));
    }
    socket.userId = userId;
    next();
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user to their own room for receiving messages
    socket.join(socket.userId);

    // Handle typing indicator
    socket.on('typing', (data) => {
        socket.to(data.receiverId).emit('user_typing', {
            userId: socket.userId,
            isTyping: data.isTyping
        });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.userId}`);
    });
});

// Notification & Logging utilities
const sendNotification = require('./utils/notificationSender');
const { logActivity } = require('./utils/logger');

// Make utilities available in requests
app.use((req, res, next) => {
    req.sendNotification = (data) => sendNotification(io, data);
    req.logActivity = (action, details, targetId, targetModel) => logActivity(req, action, details, targetId, targetModel);
    next();
});

// Routes setup
const chatRouter = require('./routes/chat');
const notificationsRouter = require('./routes/notifications');
const exportRouter = require('./routes/export');
const activityRouter = require('./routes/activity');
const settingsRouter = require('./routes/settings');

app.use('/chat', chatRouter);
app.use('/notifications', notificationsRouter);
app.use('/export', exportRouter);
app.use('/admin/activity', activityRouter);
app.use('/settings', settingsRouter);

