const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/auth');

// Get all conversations for current user
router.get('/conversations', ensureAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;

        // Get unique users the current user has chatted with
        const messages = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { sender: userId },
                        { receiver: userId }
                    ],
                    deleted: false
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$sender', userId] },
                            '$receiver',
                            '$sender'
                        ]
                    },
                    lastMessage: { $first: '$$ROOT' },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$receiver', userId] },
                                        { $eq: ['$seen', false] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // Populate user details
        const conversations = await User.populate(messages, {
            path: '_id',
            select: 'name email role profilePhoto'
        });

        res.json({
            success: true,
            conversations: conversations.map(conv => ({
                user: conv._id,
                lastMessage: conv.lastMessage,
                unreadCount: conv.unreadCount
            }))
        });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({
            success: false,
            message: res.locals.__('error_occurred')
        });
    }
});

// Get conversation with specific user
router.get('/:userId', ensureAuthenticated, async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const otherUserId = req.params.userId;

        // Get messages
        const messages = await Message.getConversation(currentUserId, otherUserId);

        // Mark messages as seen
        await Message.markAsSeen(currentUserId, otherUserId);

        // Get other user details
        const otherUser = await User.findById(otherUserId).select('name email role profilePhoto');

        res.json({
            success: true,
            user: otherUser,
            messages: messages.reverse() // Oldest first
        });
    } catch (error) {
        console.error('Error fetching chat:', error);
        res.status(500).json({
            success: false,
            message: res.locals.__('error_occurred')
        });
    }
});

// Send message
router.post('/send', ensureAuthenticated, async (req, res) => {
    try {
        const { receiverId, message } = req.body;

        if (!receiverId || !message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Receiver and message are required'
            });
        }

        // Verify receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: 'Receiver not found'
            });
        }

        // Create message
        const newMessage = await Message.create({
            sender: req.user._id,
            receiver: receiverId,
            message: message.trim()
        });

        // Populate sender and receiver
        await newMessage.populate('sender', 'name email role profilePhoto');
        await newMessage.populate('receiver', 'name email role profilePhoto');

        // Emit socket event (will be handled by Socket.IO)
        if (req.app.get('io')) {
            req.app.get('io').to(receiverId.toString()).emit('new_message', newMessage);
        }

        res.status(201).json({
            success: true,
            message: newMessage
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: res.locals.__('error_occurred')
        });
    }
});

// Edit message
router.put('/:messageId/edit', ensureAuthenticated, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Message content is required'
            });
        }

        // Find message
        const msg = await Message.findById(messageId);
        if (!msg) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        // Check if user is sender
        if (msg.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to edit this message'
            });
        }

        // Check if message is within edit time limit (5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (msg.createdAt < fiveMinutesAgo) {
            return res.status(400).json({
                success: false,
                message: 'Message can only be edited within 5 minutes'
            });
        }

        // Update message
        msg.message = message.trim();
        msg.edited = true;
        msg.editedAt = new Date();
        await msg.save();

        await msg.populate('sender', 'name email role profilePhoto');
        await msg.populate('receiver', 'name email role profilePhoto');

        // Emit socket event
        if (req.app.get('io')) {
            req.app.get('io').to(msg.receiver.toString()).emit('message_edited', msg);
        }

        res.json({
            success: true,
            message: msg
        });
    } catch (error) {
        console.error('Error editing message:', error);
        res.status(500).json({
            success: false,
            message: res.locals.__('error_occurred')
        });
    }
});

// Delete message
router.delete('/:messageId', ensureAuthenticated, async (req, res) => {
    try {
        const { messageId } = req.params;

        // Find message
        const msg = await Message.findById(messageId);
        if (!msg) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        // Check if user is sender
        if (msg.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this message'
            });
        }

        // Soft delete
        msg.deleted = true;
        await msg.save();

        // Emit socket event
        if (req.app.get('io')) {
            req.app.get('io').to(msg.receiver.toString()).emit('message_deleted', {
                messageId: msg._id
            });
        }

        res.json({
            success: true,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({
            success: false,
            message: res.locals.__('error_occurred')
        });
    }
});

// Mark messages as seen
router.put('/:userId/seen', ensureAuthenticated, async (req, res) => {
    try {
        const { userId } = req.params;

        await Message.markAsSeen(req.user._id, userId);

        res.json({
            success: true,
            message: 'Messages marked as seen'
        });
    } catch (error) {
        console.error('Error marking messages as seen:', error);
        res.status(500).json({
            success: false,
            message: res.locals.__('error_occurred')
        });
    }
});

// Get unread count
router.get('/unread/count', ensureAuthenticated, async (req, res) => {
    try {
        const count = await Message.getUnreadCount(req.user._id);

        res.json({
            success: true,
            count
        });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({
            success: false,
            message: res.locals.__('error_occurred')
        });
    }
});

module.exports = router;
