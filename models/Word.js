const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        type: String, // Filename of the uploaded image
        default: 'default-word.png'
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'easy'
    },
    category: {
        type: String,
        default: 'general'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    child: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Child',
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Word', wordSchema);
