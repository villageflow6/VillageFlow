const mongoose = require('mongoose');

const WelfareSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    nic: { type: String, required: true },
    householdNo: { type: String, required: true },
    type: { type: String, enum: ['Aswasuma', 'Samurdhi', 'Elderly Allowance'], required: true },
    amount: { type: Number, default: 0 },
    income: { type: Number, required: true, default: 0 },
    status: { 
        type: String, 
        enum: ['Active', 'Suspended', 'Pending'], 
        default: 'Pending' 
    },
    paySlip: { type: String, default: null },
    nicImage: { type: String, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    userEmail: { type: String, default: null },
    editHistory: [{
        editedAt: { type: Date, default: Date.now },
        editedBy: { type: String },
        changes: { type: Object }
    }]
}, { timestamps: true });

WelfareSchema.index({ nic: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Welfare', WelfareSchema);
