const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true
    },
    details: {
        type: String
    },
    ipAddress: {
        type: String
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId // Optional reference to affected object
    },
    targetModel: {
        type: String // 'User', 'Center', etc.
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 90 * 24 * 60 * 60 // Auto delete after 90 days
    }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
