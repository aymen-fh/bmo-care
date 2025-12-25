const ActivityLog = require('../models/ActivityLog');

/**
 * Log user activity
 * @param {Object} req - Express request object (to get user/ip)
 * @param {string} action - Short description of action
 * @param {string} details - Detailed description
 * @param {string} [targetId] - ID of affected object
 * @param {string} [targetModel] - Model name of affected object
 */
async function logActivity(req, action, details, targetId = null, targetModel = null) {
    try {
        if (!req.user) return; // Don't log if no user

        await ActivityLog.create({
            user: req.user._id,
            action,
            details,
            ipAddress: req.ip || req.connection.remoteAddress,
            targetId,
            targetModel
        });
    } catch (error) {
        console.error('Logging Error:', error);
        // Don't crash app on logging error
    }
}

module.exports = { logActivity };
