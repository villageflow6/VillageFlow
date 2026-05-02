const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true },
    condition: { type: String, enum: ['Good', 'Damaged', 'Need Repair'], default: 'Good' },
    addedDate: { type: Date, default: Date.now },
    lastServiceDate: { type: Date, default: Date.now },
    
    // ========== SMART FIELDS ==========
    location: { type: String, default: 'Not Specified' },
    assignedTo: { type: String, default: 'Not Assigned' },
    assignedDate: { type: Date, default: null },
    returnDate: { type: Date, default: null },
    purchaseValue: { type: Number, default: 0 },
    currentValue: { type: Number, default: 0 },
    warrantyExpiry: { type: Date, default: null },
    category: { type: String, default: 'Office Equipment' },
    notes: { type: String, default: '' },
    lastMaintenanceReminder: { type: Date, default: null },
    qrCode: { type: String, default: '' }
});

module.exports = mongoose.models.Asset || mongoose.model('Asset', AssetSchema);