const mongoose = require('mongoose');

const MaintenanceReminderSchema = new mongoose.Schema({
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    assetName: { type: String, required: true },
    reminderDate: { type: Date, required: true },
    reminderType: { 
        type: String, 
        enum: ['Service Due', 'Warranty Expiry', 'Inspection Needed', 'Insurance Renewal'], 
        default: 'Service Due' 
    },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['pending', 'resolved', 'snoozed'], default: 'pending' },
    resolvedDate: { type: Date, default: null },
    snoozeCount: { type: Number, default: 0 },
    notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.models.MaintenanceReminder || mongoose.model('MaintenanceReminder', MaintenanceReminderSchema);