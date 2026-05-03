const mongoose = require('mongoose');

const AssetRequestSchema = new mongoose.Schema({
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    assetName: { type: String, required: true },
    requestedBy: { type: String, required: true },
    requestedByNic: { type: String, required: true },
    requestDate: { type: Date, default: Date.now },
    expectedReturnDate: { type: Date, required: true },
    actualReturnDate: { type: Date, default: null },
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Rejected', 'Returned', 'Overdue'], 
        default: 'Pending' 
    },
    approvedBy: { type: String, default: '' },
    approvedDate: { type: Date, default: null },
    rejectedBy: { type: String, default: '' },
    rejectedDate: { type: Date, default: null },
    rejectedReason: { type: String, default: '' },
    purpose: { type: String, default: '' },
    quantityRequested: { type: Number, default: 1 },
    notes: { type: String, default: '' }
}, { timestamps: true });

// NO pre middleware - completely removed to avoid the error
// If you need overdue status, update it manually in your routes

module.exports = mongoose.models.AssetRequest || mongoose.model('AssetRequest', AssetRequestSchema);