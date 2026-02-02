const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const { ensureSpecialist } = require('../middleware/auth');
const apiClient = require('../utils/apiClient');

// Setup multer for memory storage (to forward to backend)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// ==========================================
// SPECIALIST ROUTES (Protected)
// ==========================================

// Apply middleware
router.use(ensureSpecialist);

// Child Sessions List
router.get('/child/:childId/sessions', async (req, res) => {
    try {
        const { childId } = req.params;

        const childrenResponse = await apiClient.authGet(req, '/specialists/my-children');
        const children = childrenResponse.data.success ? childrenResponse.data.children : [];
        const selectedChild = children.find(c => c._id === childId || c.id === childId);

        if (!selectedChild) {
            req.flash('error_msg', 'Child not found or not assigned to you');
            return res.redirect('/specialist/words');
        }

        let sessions = [];
        try {
            const plansRes = await apiClient.authGet(req, `/exercises/child/${childId}?includeInactive=1`);
            sessions = (plansRes.data.success && Array.isArray(plansRes.data.exercises))
                ? plansRes.data.exercises
                    .filter(plan => (plan?.kind || 'plan') === 'plan')
                    .map(plan => ({
                        _id: plan._id,
                        sessionName: plan.sessionName || `Session ${plan.sessionIndex || ''}`,
                        sessionIndex: plan.sessionIndex,
                        targetDuration: plan.targetDuration,
                        active: plan.active !== false,
                        createdAt: plan.createdAt,
                        letters: plan.letters || [],
                        words: plan.words || []
                    }))
                : [];
        } catch (planError) {
            console.warn('Plans fetch failed in child sessions view:', planError?.response?.status || planError?.message);
        }

        // Fetch progress data to determine actual completion status
        let progressSessions = [];
        try {
            const progressRes = await apiClient.authGet(req, `/progress/child/${childId}`);
            if (progressRes.data.success && progressRes.data.progress) {
                progressSessions = Array.isArray(progressRes.data.progress.sessions) ? progressRes.data.progress.sessions : [];
            }
        } catch (progressError) {
            console.warn('Progress fetch failed (sessions will show without completion data):', progressError?.message);
        }

        // Enrich sessions with completion status from progress
        sessions = sessions.map(session => {
            // Find matching progress sessions by planExerciseId or sessionIndex
            const completed = progressSessions.some(ps =>
                (ps.planExerciseId && ps.planExerciseId.toString() === session._id.toString()) ||
                (ps.status === 'completed' && ps.planExerciseId && ps.planExerciseId.toString() === session._id.toString())
            );
            return { ...session, isCompleted: completed };
        });

        return res.render('specialist/child-sessions', {
            title: `جلسات الطفل - ${selectedChild.name}`,
            activePage: 'words',
            child: selectedChild,
            sessions
        });
    } catch (error) {
        console.error('Child Sessions View Error:', error.message);
        req.flash('error_msg', 'Error loading sessions');
        res.redirect('/specialist/words');
    }
});

// New Session Form
router.get('/child/:childId/sessions/new', async (req, res) => {
    try {
        const { childId } = req.params;
        const childrenResponse = await apiClient.authGet(req, '/specialists/my-children');
        const children = childrenResponse.data.success ? childrenResponse.data.children : [];
        const selectedChild = children.find(c => c._id === childId || c.id === childId);

        if (!selectedChild) {
            req.flash('error_msg', 'Child not found or not assigned to you');
            return res.redirect('/specialist/words');
        }

        return res.render('specialist/child-session-new', {
            title: `إنشاء جلسة جديدة - ${selectedChild.name}`,
            activePage: 'words',
            child: selectedChild
        });
    } catch (error) {
        console.error('New Session View Error:', error.message);
        req.flash('error_msg', 'Error loading page');
        res.redirect('/specialist/words');
    }
});

// List Words/Letters (or Select Child)
router.get('/', async (req, res) => {
    try {
        const { childId, difficulty, contentType, sessionId } = req.query;

        // DEBUG: Log user details
        // console.log('DEBUG WORDS: User Role:', req.user?.role);
        // console.log('DEBUG WORDS: Token exists:', !!req.user?.token);

        // Fetch children list first (needed for both views)
        const childrenResponse = await apiClient.authGet(req, '/specialists/my-children');
        const children = childrenResponse.data.success ? childrenResponse.data.children : [];

        // If childId is provided, show content for that child
        if (childId) {
            // Validate child exists in my list
            const selectedChild = children.find(c => c._id === childId || c.id === childId);

            if (!selectedChild) {
                req.flash('error_msg', 'Child not found or not assigned to you');
                return res.redirect('/specialist/words');
            }

            // جلب قائمة الجلسات (خطط الطفل)
            let sessions = [];
            try {
                const plansRes = await apiClient.authGet(req, `/exercises/child/${childId}?includeInactive=1`);
                sessions = (plansRes.data.success && Array.isArray(plansRes.data.exercises))
                    ? plansRes.data.exercises
                        .filter(plan => (plan?.kind || 'plan') === 'plan')
                        .map(plan => ({
                            _id: plan._id,
                            sessionName: plan.sessionName || `Session ${plan.sessionIndex || ''}`,
                            sessionIndex: plan.sessionIndex,
                            active: plan.active !== false,
                            targetDuration: plan.targetDuration,
                            // Ensure structure matches view expectations
                            sessionStructure: {
                                playDuration: plan.playDuration,
                                breakDuration: plan.breakDuration,
                                maxAttempts: plan.maxAttempts
                            },
                            playSchedule: {
                                allowedDays: plan.allowedDays || (plan.playSchedule ? plan.playSchedule.allowedDays : []) || []
                            },
                            breakDuration: plan.breakDuration, // Fallback
                            maxAttempts: plan.maxAttempts // Fallback
                        }))
                    : [];
            } catch (planError) {
                console.warn('Plans fetch failed in words view:', planError?.response?.status || planError?.message);
            }

            // Fetch words/letters for this child, مع sessionId إذا وُجد
            const response = await apiClient.authGet(req, `/words/child/${childId}`, {
                params: { difficulty, contentType, sessionId }
            });

            const { words, letters } = response.data.success ? response.data : { words: [], letters: [] };

            console.log('DEBUG BACKEND: ChildId:', childId);
            console.log('DEBUG BACKEND: SessionId:', sessionId);
            console.log('DEBUG BACKEND: Words Count:', words ? words.length : 'null');
            console.log('DEBUG BACKEND: Letters Count:', letters ? letters.length : 'null');

            return res.render('specialist/words', {
                title: `${res.locals.__('wordsManagement') || 'إدارة المحتوى'} - ${selectedChild.name}`,
                activePage: 'words',
                mode: 'manage_child',
                child: selectedChild,
                words: words || [],
                letters: letters || [],
                contentType: contentType || 'word',
                difficulty: difficulty || '',
                sessions,
                selectedSessionId: sessionId || ''
            });
        }

        // If NO childId, show list of children to select
        res.render('specialist/words', {
            title: res.locals.__('wordsManagement') || 'إدارة المحتوى',
            activePage: 'words',
            mode: 'select_child',
            children: children || [],
            words: [],
            letters: []
        });

    } catch (error) {
        console.error('Words View Error:', error.message);
        if (error.response) {
            console.error('Backend Error Details:', JSON.stringify(error.response.data, null, 2));
            console.error('Backend Status:', error.response.status);
        }
        req.flash('error_msg', 'Error loading page');
        res.redirect('/specialist');
    }
});

// Add Content (Word or Letter)
router.post('/add', upload.single('image'), async (req, res) => {
    try {
        const { text, contentType, difficulty, childId, sessionId } = req.body;

        if (!childId) {
            req.flash('error_msg', 'Child ID is required');
            return res.redirect('/specialist/words');
        }

        const normalizedContentType = (contentType === 'letter' || contentType === 'word')
            ? contentType
            : 'word';
        const normalizedDifficulty = (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard')
            ? difficulty
            : 'easy';

        if (!text || !String(text).trim()) {
            req.flash('error_msg', 'Text is required');
            return res.redirect(`/specialist/words?childId=${childId}&contentType=${normalizedContentType}&difficulty=${normalizedDifficulty}${sessionId ? `&sessionId=${sessionId}` : ''}`);
        }

        const form = new FormData();
        form.append('text', String(text).trim());
        form.append('contentType', normalizedContentType);
        form.append('difficulty', normalizedDifficulty);
        form.append('childId', childId);
        if (sessionId) form.append('sessionId', sessionId);

        if (req.file) {
            form.append('image', req.file.buffer, req.file.originalname);
        }

        const authConfig = apiClient.withAuth(req);
        const headers = { ...authConfig.headers, ...form.getHeaders() };

        // POST /words (يدعم sessionId)
        const response = await apiClient.post('/words', form, { headers });

        if (response.data.success) {
            const successMessage = normalizedContentType === 'word'
                ? '✅ تم حفظ الكلمة وإضافتها إلى قائمة تدريب الطفل بنجاح'
                : '✅ تم حفظ الحرف وإضافته إلى قائمة تدريب الطفل بنجاح';
            req.flash('success_msg', successMessage);
        } else {
            req.flash('error_msg', response.data.message || 'Error adding content');
        }

        res.redirect(`/specialist/words?childId=${childId}&contentType=${normalizedContentType}&difficulty=${normalizedDifficulty}${sessionId ? `&sessionId=${sessionId}` : ''}`);
    } catch (error) {
        console.error('Add Word Error:', error.message);
        req.flash('error_msg', 'Error adding content');
        const childId = req.body.childId ? `?childId=${req.body.childId}` : '';
        res.redirect(`/specialist/words${childId}`);
    }
});

// Delete Content (Word or Letter)
router.post('/delete/:id', async (req, res) => {
    try {
        // CORRECTED PATH: /words/:id (DELETE)
        const response = await apiClient.authDelete(req, `/words/${req.params.id}`);

        if (response.data.success) {
            req.flash('success_msg', 'Deleted successfully');

            const rawChildId = response.data.childId;
            const childId = typeof rawChildId === 'object'
                ? (rawChildId?._id || rawChildId?.id)
                : rawChildId;

            if (childId) {
                res.redirect(`/specialist/words?childId=${childId}`);
            } else {
                res.redirect('/specialist/words');
            }
        } else {
            req.flash('error_msg', response.data.message || 'Error deleting content');
            res.redirect('/specialist/words');
        }
    } catch (error) {
        console.error('Delete Word Error:', error.message);
        req.flash('error_msg', 'Error deleting content');
        res.redirect('/specialist/words');
    }
});

// Reset Session (Clear Progress Data)
router.post('/child/:childId/sessions/:sessionId/reset', async (req, res) => {
    try {
        const { childId, sessionId } = req.params;

        // Call backend API to reset session progress
        // This will delete all progress sessions linked to this planExerciseId
        const response = await apiClient.authPost(req, `/exercises/${sessionId}/reset`, { childId });

        if (response.data.success) {
            req.flash('success_msg', 'تم إعادة تعيين الجلسة بنجاح. يمكن للطفل اللعب بها مرة أخرى.');
        } else {
            req.flash('error_msg', response.data.message || 'فشل إعادة التعيين');
        }

        res.redirect(`/specialist/words/child/${childId}/sessions`);
    } catch (error) {
        console.error('Reset Session Error:', error?.response?.data || error.message);
        req.flash('error_msg', 'حدث خطأ أثناء إعادة تعيين الجلسة');
        res.redirect(`/specialist/words/child/${req.params.childId}/sessions`);
    }
});

// Update Session (Settings + Content)
router.post('/child/:childId/sessions/:sessionId/update', async (req, res) => {
    try {
        const { childId, sessionId } = req.params;
        const {
            totalDuration, playDuration, breakDuration, maxAttempts,
            allowedDays, lettersText, wordsText
        } = req.body;

        const lettersRaw = lettersText ? JSON.parse(lettersText) : [];
        const wordsRaw = wordsText ? JSON.parse(wordsText) : [];

        const normalizeLetters = (arr) => (Array.isArray(arr) ? arr : [])
            .map(item => {
                if (typeof item === 'string') return { letter: item };
                if (item && typeof item === 'object') {
                    if (item.letter) return { letter: item.letter, difficulty: item.difficulty, image: item.image };
                    if (item.text) return { letter: item.text, difficulty: item.difficulty, image: item.image };
                }
                return null;
            })
            .filter(Boolean);

        const normalizeWords = (arr) => (Array.isArray(arr) ? arr : [])
            .map(item => {
                if (typeof item === 'string') return { word: item };
                if (item && typeof item === 'object') {
                    if (item.word) return { word: item.word, difficulty: item.difficulty, image: item.image };
                    if (item.text) return { word: item.text, difficulty: item.difficulty, image: item.image };
                }
                return null;
            })
            .filter(Boolean);

        const letters = normalizeLetters(lettersRaw);
        const words = normalizeWords(wordsRaw);

        // Helper to safely parse integers (returns undefined for empty strings/invalid)
        const safeInt = (val) => {
            if (val === '' || val === undefined || val === null) return undefined;
            const n = Number(val);
            return isNaN(n) ? undefined : n;
        };

        // Payload for Backend
        const targetDurationValue = safeInt(totalDuration)
            ?? safeInt(playDuration);

        const payload = {
            targetDuration: targetDurationValue,
            playDuration: safeInt(playDuration),
            breakDuration: safeInt(breakDuration),
            maxAttempts: safeInt(maxAttempts),
            letters,
            words,
            // Backend expects allowedDays at root
            allowedDays: Array.isArray(allowedDays) ? allowedDays.map(Number) : (allowedDays ? [Number(allowedDays)] : [])
        };

        if (typeof payload.targetDuration !== 'number'
            || typeof payload.breakDuration !== 'number'
            || typeof payload.maxAttempts !== 'number') {
            req.flash('error_msg', 'يجب تحديد مدة الجلسة ومدة الراحة وعدد المحاولات');
            return res.redirect(`/specialist/words?childId=${childId}&sessionId=${sessionId}`);
        }

        const response = await apiClient.authPut(req, `/exercises/${sessionId}`, payload);

        if (response.data.success) {
            req.flash('success_msg', 'تم تحديث الجلسة بنجاح');
        } else {
            req.flash('error_msg', response.data.message || 'فشل التحديث');
        }

        res.redirect(`/specialist/words?childId=${childId}&sessionId=${sessionId}`);
    } catch (error) {
        console.error('Update Session Error:', error.message);
        req.flash('error_msg', 'خطأ في تحديث الجلسة');
        res.redirect(`/specialist/words?childId=${req.params.childId}&sessionId=${req.params.sessionId}`);
    }
});

module.exports = router;

