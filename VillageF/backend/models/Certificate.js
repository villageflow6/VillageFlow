const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    certificateType: {
        type: String,
        required: true,
        enum: ['Residency Certificate', 'Character Certificate', 'Income Certificate', 'Birth Certificate Copy']
    },
    applyFor: {
        type: String,
        required: true,
        enum: ['Self', 'Family']
    },
    memberName: {
        type: String,
        required: true
    },
    nic: {
        type: String,
        required: true
    },
    relationship: {
        type: String,
        default: 'Self'
    },
    utilityBill: {
        type: String,
        required: true
    },
    nicImage: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    rejectionReason: {
        type: String,
        default: null
    },
    appliedDate: {
        type: Date,
        default: Date.now
    },
    reviewedDate: {
        type: Date,
        default: null
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'bank', 'mobile', 'offline', null],
        default: null
    },
    transactionId: {
        type: String,
        default: null
    },
    paymentAmount: {
        type: Number,
        default: null
    },
    paymentDate: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Certificate', CertificateSchema);
