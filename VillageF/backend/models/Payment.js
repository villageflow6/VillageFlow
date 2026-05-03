const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    certificateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Certificate',
        required: true
    },
    certificateType: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'bank', 'mobile', 'offline'],
        required: true
    },
    transactionId: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['pending', 'pending_verification', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentDetails: {
        cardLastFour: { type: String, default: null },
        cardType: { type: String, default: null },
        cardholderName: { type: String, default: null },
        bankName: { type: String, default: null },
        accountLastFour: { type: String, default: null },
        accountHolderName: { type: String, default: null },
        branchCode: { type: String, default: null },
        referenceNumber: { type: String, default: null },
        mobileNumber: { type: String, default: null },
        provider: { type: String, default: null },
        receiptNumber: { type: String, default: null },
        verifiedBy: { type: String, default: null },
        verifiedAt: { type: Date, default: null },
        notes: { type: String, default: null }
    },
    paymentDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', PaymentSchema);