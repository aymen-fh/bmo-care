const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Word = require('../models/Word');
const Child = require('../models/Child');
const { ensureSpecialist } = require('../middleware/auth');

// Setup multer for word images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Shared uploads directory
        const uploadDir = path.join(__dirname, '../../backend/uploads/words');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'word-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
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
// PUBLIC API ROUTES (For Game App)
// ==========================================

router.get('/api/list', async (req, res) => {
    try {
        const { childId } = req.query;

        if (!childId) {
            return res.status(400).json({
                success: false,
                message: 'Child ID is required'
            });
        }

        const words = await Word.find({ child: childId }).sort('-createdAt');

        // Add full URL to images
        const wordsWithImages = words.map(word => {
            return {
                ...word.toObject(),
                imageUrl: word.image ? `/uploads/words/${word.image}` : null
            };
        });

        res.json({
            success: true,
            words: wordsWithImages
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ==========================================
// SPECIALIST ROUTES (Protected)
// ==========================================

// Apply middleware
router.use(ensureSpecialist);

// List Words (or Select Child)
router.get('/', async (req, res) => {
    try {
        const { childId, difficulty } = req.query;

        // If childId is provided, show words for that child
        if (childId) {
            const child = await Child.findOne({ _id: childId, assignedSpecialist: req.user._id });

            if (!child) {
                req.flash('error_msg', 'Child not found or not assigned to you');
                return res.redirect('/specialist/words');
            }

            const filter = { createdBy: req.user._id, child: childId };
            if (difficulty) filter.difficulty = difficulty;

            const words = await Word.find(filter).sort('-createdAt');

            return res.render('specialist/words', {
                title: `${res.locals.__('wordsManagement') || 'إدارة الكلمات'} - ${child.name}`,
                activePage: 'words',
                mode: 'manage', // Manage words for specific child
                child,
                words,
                difficulty: difficulty || ''
            });
        }

        // If NO childId, show list of children to select
        const children = await Child.find({ assignedSpecialist: req.user._id }).sort('-createdAt');

        res.render('specialist/words', {
            title: res.locals.__('wordsManagement') || 'إدارة الكلمات',
            activePage: 'words',
            mode: 'select_child', // Select child mode
            children,
            words: [] // No words until child selected
        });

    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Error loading page');
        res.redirect('/specialist');
    }
});

// Add Word
router.post('/add', upload.single('image'), async (req, res) => {
    try {
        const { text, difficulty, childId } = req.body;

        if (!childId) {
            req.flash('error_msg', 'Child ID is required');
            return res.redirect('/specialist/words');
        }


        // Removed mandatory file check
        let imageFilename = 'default-word.png';
        if (req.file) {
            imageFilename = req.file.filename;
        }


        const word = new Word({
            text,
            difficulty,
            image: imageFilename,
            createdBy: req.user._id,
            child: childId
        });

        await word.save();

        req.flash('success_msg', '✅ تم حفظ الكلمة وإضافتها إلى قائمة تدريب الطفل بنجاح');
        res.redirect(`/specialist/words?childId=${childId}`);
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Error adding word');
        const childId = req.body.childId ? `?childId=${req.body.childId}` : '';
        res.redirect(`/specialist/words${childId}`);
    }
});

// Delete Word
router.post('/delete/:id', async (req, res) => {
    try {
        const word = await Word.findOne({ _id: req.params.id, createdBy: req.user._id });

        if (!word) {
            req.flash('error_msg', 'Word not found');
            return res.redirect('/specialist/words');
        }

        const childId = word.child; // Save child ID for redirect

        // Try to delete image file
        try {
            const imagePath = path.join(__dirname, '../../backend/uploads/words', word.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        } catch (err) {
            console.error('Error deleting image file:', err);
        }

        await Word.findByIdAndDelete(req.params.id);

        req.flash('success_msg', 'Word deleted successfully');
        if (childId) {
            res.redirect(`/specialist/words?childId=${childId}`);
        } else {
            res.redirect('/specialist/words');
        }
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Error deleting word');
        res.redirect('/specialist/words');
    }
});

module.exports = router;
