const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    edited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date
    },
    seen: {
        type: Boolean,
        default: false
    },
    seenAt: {
        type: Date
    },
    deleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for faster queries
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, seen: 1 });

// Method to get conversation between two users
messageSchema.statics.getConversation = async function (user1Id, user2Id, limit = 50) {
    return this.find({
        $or: [
            { sender: user1Id, receiver: user2Id },
            { sender: user2Id, receiver: user1Id }
        ],
        deleted: false
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('sender', 'name email role')
        .populate('receiver', 'name email role');
};

// Method to mark messages as seen
messageSchema.statics.markAsSeen = async function (receiverId, senderId) {
    return this.updateMany(
        {
            sender: senderId,
            receiver: receiverId,
            seen: false
        },
        {
            seen: true,
            seenAt: new Date()
        }
    );
};

// Method to get unread count
messageSchema.statics.getUnreadCount = async function (userId) {
    return this.countDocuments({
        receiver: userId,
        seen: false,
        deleted: false
    });
};

module.exports = mongoose.model('Message', messageSchema);
