const Notification = require('../models/Notification');

/**
 * Send notification to a user via DB and Socket.IO
 * @param {Object} io - Socket.IO instance
 * @param {Object} data - Notification data
 * @param {string} data.recipient - Recipient User ID
 * @param {string} data.title - Notification title
 * @param {string} data.message - Notification message
 * @param {string} data.type - info, success, warning, error
 * @param {string} [data.link] - Optional link
 * @param {string} [data.sender] - Sender User ID (optional)
 */
async function sendNotification(io, data) {
    try {
        // 1. Save to Database
        const notification = await Notification.create({
            recipient: data.recipient,
            sender: data.sender,
            title: data.title,
            message: data.message,
            type: data.type || 'info',
            link: data.link
        });

        // 2. Emit via Socket.IO
        if (io) {
            io.to(data.recipient.toString()).emit('new_notification', notification);
        }

        return notification;
    } catch (error) {
        console.error('Error sending notification:', error);
        return null; // Don't crash app if notification fails
    }
}

module.exports = sendNotification;
