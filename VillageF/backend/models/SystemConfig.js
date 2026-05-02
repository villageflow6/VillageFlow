const mongoose = require('mongoose');

const SystemConfigSchema = new mongoose.Schema({
    gramaNiladhariId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    general: {
        gramaNiladhariName: { type: String, default: '' },
        gramaNiladhariDivision: { type: String, default: '' },
        gnDivision: { type: String, default: '' },
        contactNumber: { type: String, default: '' },
        officeAddress: { type: String, default: '' },
        officeHours: { type: String, default: '8.30 AM - 4.15 PM' },
        workingDays: { 
            type: [String], 
            default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] 
        }
    },
    appointment: {
        maxAppointmentsPerDay: { type: Number, default: 20 },
        appointmentDuration: { type: Number, default: 30 },
        availableTimeSlots: {
            type: [String],
            default: [
                '9.00 AM - 10.00 AM',
                '10.00 AM - 11.00 AM',
                '11.00 AM - 12.00 PM',
                '1.00 PM - 2.00 PM',
                '2.00 PM - 3.00 PM'
            ]
        },
        bufferTime: { type: Number, default: 15 },
        advanceBookingDays: { type: Number, default: 14 },
        cancellationPolicy: { type: String, default: 'අවම වශයෙන් පැය 2කට පෙර දැනුම් දිය යුතුය' }
    },
    // --- සේවාවන් (Services) ---
    services: [{
        name: { type: String, required: true },
        duration: { type: Number, default: 15 } // මිනිත්තු වලින්
    }],
    // --- විශේෂ නිවාඩු දින (Holidays) ---
    holidays: {
        type: [String], // "YYYY-MM-DD" format එකෙන් save වේ
        default: []
    },
    // --- හදිසි නිවේදන (Emergency Alerts) ---
    emergency: {
        active: { type: Boolean, default: false },
        message: { type: String, default: '' }
    },
    welfare: {
        types: [{
            name: String,
            description: String,
            eligibility: String,
            maxIncome: Number,
            minAge: Number,
            defaultAmount: Number
        }],
        incomeVerificationRequired: { type: Boolean, default: true },
        requiredDocuments: { type: [String], default: ['nic', 'paySlip'] },
        maxApplicationsPerMonth: { type: Number, default: 50 }
    },
    notifications: {
        email: {
            newAppointment: { type: Boolean, default: true },
            appointmentStatus: { type: Boolean, default: true },
            welfareApplication: { type: Boolean, default: true },
            welfareStatus: { type: Boolean, default: true },
            reminders: { type: Boolean, default: true }
        },
        sms: {
            enabled: { type: Boolean, default: false },
            provider: { type: String, default: '' },
            apiKey: { type: String, default: '' }
        },
        reminderTiming: { type: Number, default: 24 }
    },
    reports: {
        autoGenerate: { type: Boolean, default: true },
        frequency: { type: String, default: 'monthly' },
        types: { type: [String], default: ['appointmentSummary', 'welfareSummary'] },
        defaultFormat: { type: String, default: 'pdf' },
        emailReports: { type: Boolean, default: true },
        recipients: { type: [String], default: [] }
    },
    security: {
        twoFactorAuth: {
            enabled: { type: Boolean, default: false },
            method: { type: String, default: 'email' }
        },
        sessionTimeout: { type: Number, default: 30 },
        maxLoginAttempts: { type: Number, default: 5 },
        passwordPolicy: {
            minLength: { type: Number, default: 8 },
            requireNumbers: { type: Boolean, default: true },
            requireSymbols: { type: Boolean, default: true },
            expiryDays: { type: Number, default: 90 }
        },
        auditLog: {
            enabled: { type: Boolean, default: true },
            retentionDays: { type: Number, default: 365 }
        }
    },
    ui: {
        theme: {
            primaryColor: { type: String, default: '#800000' },
            secondaryColor: { type: String, default: '#f2b713' },
            logo: { type: String, default: '' },
            headerTitle: { type: String, default: '' }
        },
        language: { type: String, default: 'si' },
        dateFormat: { type: String, default: 'YYYY-MM-DD' },
        timeFormat: { type: String, default: '24h' }
    },
    updatedAt: { type: Date, default: Date.now }
});

/**
 * මාරු කළ යුතු ප්‍රධාන කොටස මෙන්න. 
 * 'next' ඉවත් කර ඇති අතර එය Mongoose හි අලුත් Middleware 
 * standards වලට අනුකූල වේ.
 */
SystemConfigSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

module.exports = mongoose.model('SystemConfig', SystemConfigSchema);