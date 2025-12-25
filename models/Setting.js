const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    group: {
        type: String, // 'general', 'mail', 'security', etc.
        default: 'general'
    },
    description: String,
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Helper to get setting by key
settingSchema.statics.get = async function (key, defaultValue = null) {
    const setting = await this.findOne({ key });
    return setting ? setting.value : defaultValue;
};

// Helper to set setting
settingSchema.statics.set = async function (key, value, group = 'general') {
    return await this.findOneAndUpdate(
        { key },
        { value, group, updatedAt: Date.now() },
        { upsert: true, new: true }
    );
};

module.exports = mongoose.model('Setting', settingSchema);
