const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Child = require('../models/Child');
const LinkRequest = require('../models/LinkRequest');
const Progress = require('../models/Progress');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { ensureSpecialist } = require('../middleware/auth');

// Apply specialist middleware to all routes
router.use(ensureSpecialist);

// Dashboard
router.get('/', async (req, res) => {
    try {
        const [parentsCount, childrenCount, pendingRequestsCount] = await Promise.all([
            User.countDocuments({ linkedSpecialist: req.user.id }),
            Child.countDocuments({ assignedSpecialist: req.user.id }),
            LinkRequest.countDocuments({ to: req.user.id, status: 'pending' })
        ]);

        const recentChildren = await Child.find({ assignedSpecialist: req.user.id })
            .populate('parent', 'name profilePhoto')
            .sort('-updatedAt')
            .limit(5);

        res.render('specialist/dashboard', {
            title: res.locals.__('dashboard'),
            stats: {
                parents: parentsCount,
                children: childrenCount,
                pendingRequests: pendingRequestsCount
            },
            recentChildren
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', res.locals.__('errorOccurred'));
        res.redirect('/');
    }
});

// Chat Page
router.get('/chat', async (req, res) => {
    try {
        res.render('specialist/chat', {
            title: 'الدردشة',
            activePage: 'chat'
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', res.locals.__('errorOccurred'));
        res.redirect('/specialist');
    }
});

// ========================================
// PARENTS
// ========================================

// List ALL KEY parents (User requested "All parents")
router.get('/parents', async (req, res) => {
    try {
        const specialist = await User.findById(req.user.id);
        // Fetch ONLY linked parents
        const linkedParentIds = specialist.linkedParents || [];

        const parents = await User.find({
            _id: { $in: linkedParentIds },
            role: 'parent'
        }).sort('-createdAt');

        // Add isLinked flag (always true for this view, but keeping structure if needed)
        const parentsWithStatus = parents.map(p => ({
            ...p.toObject(),
            isLinked: true
        }));

        res.render('specialist/parents', {
            title: res.locals.__('parentsList'),
            parents: parentsWithStatus
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', res.locals.__('errorOccurred'));
        res.redirect('/specialist');
    }
});

// API endpoint to fetch parents as JSON (Used by children.ejs modal)
// BYPASSES BACKEND PROXY
router.get('/api/parents', async (req, res) => {
    try {
        console.log('API /parents requested by:', req.user.id);
        const specialist = await User.findById(req.user.id)
            .populate({
                path: 'linkedParents',
                select: 'name email phone profilePhoto'
            });

        console.log('Specialist found:', specialist ? specialist.name : 'NOT FOUND');
        console.log('Linked Parents:', specialist ? (specialist.linkedParents ? specialist.linkedParents.length : 'undefined') : 'N/A');

        res.json({
            success: true,
            parents: specialist.linkedParents || []
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// API endpoint to create child locally (Used by children.ejs modal)
// BYPASSES BACKEND PROXY
router.post('/api/create-child', async (req, res) => {
    try {
        const { parentId, name, age, gender, difficultyLevel } = req.body;

        // Validate required fields
        if (!parentId || !name || !age || !gender) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Verify parent is linked to specialist
        const specialist = await User.findById(req.user.id);
        const linkedParents = (specialist.linkedParents || []).map(id => id.toString());

        if (!linkedParents.includes(parentId)) {
            return res.status(403).json({
                success: false,
                message: 'Parent is not linked to this specialist'
            });
        }

        // Create the child
        const child = await Child.create({
            name,
            age,
            gender,
            parent: parentId,
            assignedSpecialist: req.user.id,
            specialistRequestStatus: 'approved',
            targetLetters: [],
            targetWords: [],
            difficultyLevel: difficultyLevel || 'beginner'
        });

        // Add child to specialist's assignedChildren
        await User.findByIdAndUpdate(req.user.id, {
            $addToSet: { assignedChildren: child._id }
        });

        // Create referral record
        const Referral = require('../models/Referral');
        try {
            await Referral.create({
                parent: parentId,
                specialist: req.user.id,
                referralType: 'specialist_created',
                status: 'active',
                notes: `Child ${child.name} created by specialist`
            });
        } catch (err) {
            console.error('Referral creation failed:', err);
        }

        res.json({
            success: true,
            message: 'Child created successfully',
            child
        });

    } catch (error) {
        console.error('Create Child Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// API endpoint to create child locally (Used by children.ejs modal)
// BYPASSES BACKEND PROXY
router.post('/api/create-child', async (req, res) => {
    try {
        const { parentId, name, age, gender, difficultyLevel } = req.body;

        // Validate required fields
        if (!parentId || !name || !age || !gender) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Verify parent is linked to specialist
        const specialist = await User.findById(req.user.id);
        const linkedParents = (specialist.linkedParents || []).map(id => id.toString());

        if (!linkedParents.includes(parentId)) {
            return res.status(403).json({
                success: false,
                message: 'Parent is not linked to this specialist'
            });
        }

        // Create the child
        const child = await Child.create({
            name,
            age,
            gender,
            parent: parentId,
            assignedSpecialist: req.user.id,
            specialistRequestStatus: 'approved',
            targetLetters: [],
            targetWords: [],
            difficultyLevel: difficultyLevel || 'beginner'
        });

        // Add child to specialist's assignedChildren
        await User.findByIdAndUpdate(req.user.id, {
            $addToSet: { assignedChildren: child._id }
        });

        // Create referral record
        const Referral = require('../models/Referral');
        try {
            await Referral.create({
                parent: parentId,
                specialist: req.user.id,
                referralType: 'specialist_created',
                status: 'active',
                notes: `Child ${child.name} created by specialist`
            });
        } catch (err) {
            console.error('Referral creation failed:', err);
        }

        res.json({
            success: true,
            message: 'Child created successfully',
            child
        });

    } catch (error) {
        console.error('Create Child Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// View parent details with their children
router.get('/parents/:id', async (req, res) => {
    try {
        const parent = await User.findById(req.params.id);

        if (!parent || parent.role !== 'parent') {
            req.flash('error_msg', res.locals.__('pageNotFound'));
            return res.redirect('/specialist/parents');
        }

        // Verify parent is linked to specialist
        const specialist = await User.findById(req.user.id);
        if (!specialist.linkedParents || !specialist.linkedParents.includes(req.params.id)) {
            req.flash('error_msg', res.locals.__('accessDenied'));
            return res.redirect('/specialist/parents');
        }

        const children = await Child.find({ parent: req.params.id, assignedSpecialist: req.user.id });

        res.render('specialist/parent-details', {
            title: parent.name,
            parent,
            children
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', res.locals.__('errorOccurred'));
        res.redirect('/specialist/parents');
    }
});

// Unlink parent
router.post('/parents/:id/unlink', async (req, res) => {
    try {
        // Remove parent from specialist's linkedParents
        await User.findByIdAndUpdate(req.user.id, {
            $pull: { linkedParents: req.params.id }
        });

        // Remove specialist from parent's linkedSpecialist
        await User.findByIdAndUpdate(req.params.id, {
            linkedSpecialist: null
        });

        req.flash('success_msg', res.locals.__('deletedSuccessfully'));
        res.redirect('/specialist/parents');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', res.locals.__('errorOccurred'));
        res.redirect('/specialist/parents');
    }
});

// ========================================
// CHILDREN
// ========================================

// List my children
router.get('/children', async (req, res) => {
    try {
        const children = await Child.find({ assignedSpecialist: req.user.id })
            .populate('parent', 'name email staffId');

        res.render('specialist/children', {
            title: res.locals.__('myChildren'),
            children
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', res.locals.__('errorOccurred'));
        res.redirect('/specialist');
    }
});

// View child details and progress - REDIRECT TO ANALYTICS (Unified View)
router.get('/children/:id', async (req, res) => {
    res.redirect(`/specialist/child/${req.params.id}/analytics`);
});

// ========================================
// LINK REQUESTS
// ========================================

// List link requests
router.get('/requests', async (req, res) => {
    try {
        const requests = await LinkRequest.find({ to: req.user.id })
            .populate('from', 'name email phone')
            .sort('-createdAt');

        const pendingRequests = requests.filter(r => r.status === 'pending');
        const historyRequests = requests.filter(r => r.status !== 'pending');

        res.render('specialist/requests', {
            title: res.locals.__('linkRequests'),
            pendingRequests,
            historyRequests
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', res.locals.__('errorOccurred'));
        res.redirect('/specialist');
    }
});

// Accept request
router.post('/requests/:id/accept', async (req, res) => {
    try {
        const request = await LinkRequest.findById(req.params.id);

        if (!request || request.to.toString() !== req.user.id) {
            req.flash('error_msg', res.locals.__('pageNotFound'));
            return res.redirect('/specialist/requests');
        }

        if (request.status !== 'pending') {
            req.flash('error_msg', res.locals.__('errorOccurred')); // Request already processed
            return res.redirect('/specialist/requests');
        }

        // Update request status
        request.status = 'accepted';
        await request.save();

        // Link parent to specialist
        await User.findByIdAndUpdate(req.user.id, {
            $addToSet: { linkedParents: request.from }
        });

        await User.findByIdAndUpdate(request.from, {
            linkedSpecialist: req.user.id
        });

        // Reject other pending requests from this parent
        await LinkRequest.updateMany(
            { from: request.from, status: 'pending', _id: { $ne: request._id } },
            { status: 'rejected' }
        );

        req.flash('success_msg', res.locals.__('updatedSuccessfully'));
        res.redirect('/specialist/requests');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', res.locals.__('errorOccurred'));
        res.redirect('/specialist/requests');
    }
});

// Reject request
router.post('/requests/:id/reject', async (req, res) => {
    try {
        const request = await LinkRequest.findById(req.params.id);

        if (!request || request.to.toString() !== req.user.id) {
            req.flash('error_msg', res.locals.__('pageNotFound'));
            return res.redirect('/specialist/requests');
        }

        if (request.status !== 'pending') {
            req.flash('error_msg', res.locals.__('errorOccurred'));
            return res.redirect('/specialist/requests');
        }

        request.status = 'rejected';
        await request.save();

        req.flash('success_msg', res.locals.__('updatedSuccessfully'));
        res.redirect('/specialist/requests');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', res.locals.__('errorOccurred'));
        res.redirect('/specialist/requests');
    }
});

// ========================================
// ACCOUNT MANAGEMENT
// ========================================

// Account management page
router.get('/account', async (req, res) => {
    try {
        // Fetch ALL parents with their linked specialist info
        const allParents = await User.find({ role: 'parent' })
            .populate('linkedSpecialist', 'name')
            .sort('-createdAt');

        res.render('specialist/account', {
            title: res.locals.__('accountManagement'),
            allParents: allParents,
            currentSpecialistId: req.user.id
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', res.locals.__('errorOccurred'));
        res.redirect('/specialist');
    }
});

// Search for parents
router.get('/account/search', async (req, res) => {
    try {
        const { query } = req.query;
        const specialist = await User.findById(req.user.id)
            .populate({
                path: 'linkedParents',
                select: 'name email phone'
            });

        let searchResults = [];

        if (query && query.trim()) {
            // Search for parents by name or email
            const parents = await User.find({
                role: 'parent',
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { email: { $regex: query, $options: 'i' } }
                ]
            }).select('name email phone').limit(20);

            // Mark which ones are already linked
            const linkedIds = (specialist.linkedParents || []).map(p => p._id.toString());
            searchResults = parents.map(p => ({
                ...p.toObject(),
                isLinked: linkedIds.includes(p._id.toString())
            }));
        }

        res.render('specialist/account', {
            title: res.locals.__('accountManagement'),
            linkedParents: specialist.linkedParents || [],
            searchQuery: query || '',
            searchResults
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', res.locals.__('errorOccurred'));
        res.redirect('/specialist/account');
    }
});

// Link a parent
router.post('/account/link/:parentId', async (req, res) => {
    try {
        const { parentId } = req.params;

        // Check if parent exists
        const parent = await User.findById(parentId);
        if (!parent || parent.role !== 'parent') {
            req.flash('error_msg', res.locals.__('pageNotFound'));
            return res.redirect('/specialist/account');
        }

        // Check if already linked to another specialist
        if (parent.linkedSpecialist && parent.linkedSpecialist.toString() !== req.user.id) {
            req.flash('error_msg', res.locals.__('errorOccurred')); // Already linked
            return res.redirect('/specialist/account');
        }

        // Link parent to specialist
        await User.findByIdAndUpdate(req.user.id, {
            $addToSet: { linkedParents: parentId }
        });

        await User.findByIdAndUpdate(parentId, {
            linkedSpecialist: req.user.id
        });

        req.flash('success_msg', res.locals.__('updatedSuccessfully'));
        res.redirect('/specialist/account');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', res.locals.__('errorOccurred'));
        res.redirect('/specialist/account');
    }
});

// ===== PROFILE ROUTES =====

// Configure multer for profile photo upload
// Configure multer for profile photo upload (Memory Storage for Relay)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// View Profile
router.get('/profile', async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('center', 'name_ar name_en');

        // Get stats
        const [childrenCount, parentsCount, sessionsCount] = await Promise.all([
            Child.countDocuments({ assignedSpecialist: req.user.id }),
            User.countDocuments({ linkedSpecialist: req.user.id }),
            Progress.countDocuments({ createdBy: req.user.id })
        ]);

        res.render('specialist/profile', {
            title: res.locals.__('profile'),
            user,
            stats: {
                children: childrenCount,
                parents: parentsCount,
                sessions: sessionsCount
            }
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', res.locals.__('errorOccurred'));
        res.redirect('/specialist');
    }
});

// Update Profile
router.post('/profile/update', async (req, res) => {
    try {
        const { name, email, phone, specialization, bio } = req.body;

        // Check if email is already taken by another user
        if (email !== req.user.email) {
            const existingUser = await User.findOne({ email, _id: { $ne: req.user.id } });
            if (existingUser) {
                req.flash('error_msg', 'البريد الإلكتروني مستخدم بالفعل');
                return res.redirect('/specialist/profile');
            }
        }

        await User.findByIdAndUpdate(req.user.id, {
            name,
            email,
            phone,
            specialization,
            bio
        });

        req.flash('success_msg', res.locals.__('updatedSuccessfully'));
        res.redirect('/specialist/profile');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', res.locals.__('errorOccurred'));
        res.redirect('/specialist/profile');
    }
});

// Upload Profile Photo
// Upload Profile Photo (Relay to Backend)
router.post('/profile/upload-photo', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error_msg', 'الرجاء اختيار صورة');
            return res.redirect('/specialist/profile');
        }

        // Create form data to send to backend
        const form = new FormData();
        form.append('photo', req.file.buffer, req.file.originalname);

        // Get Backend URL
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';

        // Log for debugging
        console.log(`Uploading photo to: ${backendUrl}/api/upload`);

        // Send to backend
        const response = await axios.post(`${backendUrl}/api/upload`, form, {
            headers: {
                ...form.getHeaders()
            }
        });

        if (response.data && response.data.success) {
            const photoPath = response.data.path;

            // Update user in DB with the path returned by backend
            await User.findByIdAndUpdate(req.user.id, {
                profilePhoto: photoPath
            });

            req.flash('success_msg', 'تم تحديث الصورة بنجاح');
        } else {
            console.error('Backend upload failed:', response.data);
            req.flash('error_msg', 'فشل تحميل الصورة على الخادم');
        }
        res.redirect('/specialist/profile');

    } catch (error) {
        console.error('Upload Relay Error:', error.message);
        if (error.response) {
            console.error('Backend Response:', error.response.data);
        }
        req.flash('error_msg', res.locals.__('errorOccurred'));
        res.redirect('/specialist/profile');
    }
});

// Change Password
router.post('/profile/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validate
        if (!currentPassword || !newPassword || !confirmPassword) {
            req.flash('error_msg', 'جميع الحقول مطلوبة');
            return res.redirect('/specialist/profile');
        }

        if (newPassword !== confirmPassword) {
            req.flash('error_msg', 'كلمات المرور الجديدة غير متطابقة');
            return res.redirect('/specialist/profile');
        }

        if (newPassword.length < 6) {
            req.flash('error_msg', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return res.redirect('/specialist/profile');
        }

        // Get user with password
        const user = await User.findById(req.user.id).select('+password');

        // Check current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            req.flash('error_msg', 'كلمة المرور الحالية غير صحيحة');
            return res.redirect('/specialist/profile');
        }

        // Update password
        user.password = newPassword;
        await user.save();

        req.flash('success_msg', 'تم تغيير كلمة المرور بنجاح');
        res.redirect('/specialist/profile');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', res.locals.__('errorOccurred'));
        res.redirect('/specialist/profile');
    }
});

// ===== CHILD ANALYTICS ROUTES =====

// Child Analytics Page (The Unified View)
router.get('/child/:id/analytics', async (req, res) => {
    try {
        const child = await Child.findById(req.params.id)
            .populate('parent', 'name email profilePhoto'); // Added profilePhoto for header

        if (!child) {
            req.flash('error_msg', res.locals.__('not_found'));
            return res.redirect('/specialist/children');
        }

        // Verify specialist has access
        if (child.assignedSpecialist.toString() !== req.user.id) {
            req.flash('error_msg', res.locals.__('unauthorized'));
            return res.redirect('/specialist/children');
        }

        const progress = await Progress.findOne({ child: req.params.id });

        res.render('specialist/child-analytics', {
            title: `تحليلات ${child.name}`,
            child,
            progress
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', res.locals.__('errorOccurred'));
        res.redirect('/specialist/children');
    }
});

// Child Analytics Data API
router.get('/child/:id/analytics/data', async (req, res) => {
    try {
        const child = await Child.findById(req.params.id);

        if (!child || child.assignedSpecialist.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        // Get progress records
        const progressRecords = await Progress.find({ child: child._id })
            .sort('createdAt')
            .limit(100);

        // Calculate statistics
        const stats = {
            totalSessions: progressRecords.length,
            averageScore: 0,
            successRate: 0,
            skillsProgress: {}
        };

        if (progressRecords.length > 0) {
            // Calculate average score
            const totalScore = progressRecords.reduce((sum, record) => {
                return sum + (record.score || 0);
            }, 0);
            stats.averageScore = Math.round(totalScore / progressRecords.length);

            // Calculate success rate (score >= 70)
            const successfulSessions = progressRecords.filter(r => (r.score || 0) >= 70).length;
            stats.successRate = Math.round((successfulSessions / progressRecords.length) * 100);

            // Group by skill
            const skillGroups = {};
            progressRecords.forEach(record => {
                const skill = record.activityId || 'general';
                if (!skillGroups[skill]) {
                    skillGroups[skill] = {
                        sessions: [],
                        totalScore: 0
                    };
                }
                skillGroups[skill].sessions.push(record);
                skillGroups[skill].totalScore += (record.score || 0);
            });

            // Calculate skill averages
            for (const [skill, data] of Object.entries(skillGroups)) {
                stats.skillsProgress[skill] = {
                    averageScore: Math.round(data.totalScore / data.sessions.length),
                    sessionsCount: data.sessions.length,
                    latestScore: data.sessions[data.sessions.length - 1].score || 0
                };
            }
        }

        // Prepare chart data
        const chartData = {
            // Line chart: Progress over time
            timeline: {
                labels: progressRecords.slice(-20).map(r =>
                    new Date(r.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })
                ),
                data: progressRecords.slice(-20).map(r => r.score || 0)
            },
            // Bar chart: Skills comparison
            skills: {
                labels: Object.keys(stats.skillsProgress).map(skill =>
                    skill === 'general' ? 'عام' : `نشاط ${skill}`
                ),
                data: Object.values(stats.skillsProgress).map(skill => skill.averageScore)
            },
            // Pie chart: Success vs Failure
            successRate: {
                labels: ['النجاح', 'التحسين المطلوب'],
                data: [
                    stats.successRate,
                    100 - stats.successRate
                ]
            },
            // Difficulty distribution
            difficulty: {
                easy: progressRecords.filter(r => r.difficulty === 'easy').length,
                medium: progressRecords.filter(r => r.difficulty === 'medium').length,
                hard: progressRecords.filter(r => r.difficulty === 'hard').length
            }
        };

        res.json({
            success: true,
            stats,
            chartData
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error fetching analytics'
        });
    }
});


// ========================================
// CHAT REDIRECT (Feature Stub)
// ========================================
router.get('/chat/init/:userId', async (req, res) => {
    // In the future, this will check for existing conversation or create one.
    // For now, redirect to the chat page (which will be built next).
    res.redirect('/specialist/chat?target=' + req.params.userId);
});





// ========================================
// SESSIONS LOG (Progress Reports)
// ========================================
router.get('/sessions', async (req, res) => {
    try {
        const { child, childId, dateFrom, dateTo } = req.query;

        // Build filter
        // Note: Progress model likely references the specialist via 'specialist' or 'createdBy'
        // Let's assume 'specialist' based on previous code, but check if it needs to match query
        const filter = { specialist: req.user._id };

        // Handle filter by Child (Dropdown or Manual ID)
        if (childId) {
            filter.child = childId; // Manual ID input takes precedence
        } else if (child) {
            filter.child = child; // Dropdown value
        }

        if (dateFrom || dateTo) {
            filter.date = {};
            if (dateFrom) filter.date.$gte = new Date(dateFrom);
            if (dateTo) filter.date.$lte = new Date(dateTo);
        }

        // Get all children for filter dropdown
        // Updated to use 'assignedSpecialist' based on other routes, assuming that's the correct schema field
        const children = await Child.find({ assignedSpecialist: req.user._id })
            .select('name')
            .sort('name');

        // Get sessions
        const sessions = await Progress.find(filter)
            .populate('child', 'name avatar')
            .sort('-date')
            .limit(100);

        res.render('specialist/sessions', {
            title: res.locals.__('sessionsLog') || 'سجل الجلسات',
            sessions,
            children,
            selectedChild: child || '',
            childIdInput: childId || '', // Pass back the manual input
            dateFrom: dateFrom || '',
            dateTo: dateTo || '',
            activePage: 'sessions'
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Error loading sessions');
        res.redirect('/specialist');
    }
});

module.exports = router;
