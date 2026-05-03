// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    fullName: { 
        type: String, 
        required: true 
    },
    nic: { 
        type: String, 
        required: true, 
        unique: true 
    },
    email: { 
        type: String, 
        required: false, 
        sparse: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['citizen', 'officer', 'admin'], 
        default: 'citizen' 
    },

    // --- මූලික විස්තර (Basic Details) ---
    gender: { 
        type: String, 
        enum: ['Male', 'Female', 'Other', null], 
        default: null 
    },
    dateOfBirth: { 
        type: Date, 
        default: null 
    },
    age: { 
        type: Number, 
        default: null 
    },
    mobileNumber: { 
        type: String, 
        default: null 
    },

    // --- ලිපිනය සහ පදිංචිය (Address & Residence) ---
    address: { 
        type: String, 
        default: null 
    },
    village: { 
        type: String, 
        default: null 
    },
    city: { 
        type: String, 
        default: null 
    },
    householdNo: { 
        type: String, 
        default: null 
    },

    // --- වෘත්තීය සහ අනෙකුත් (Occupation & Others) ---
    occupation: { 
        type: String, 
        default: null 
    },
    emergencyContact: { 
        type: String, 
        default: null 
    },
    agreedToTerms: { 
        type: Boolean, 
        default: false 
    },

    // --- පවුලේ සම්බන්ධතාවය (Proxy Registration සඳහා) ---
    // ✅ Frontend Dropdown එකේ ඇති English values වලට ගැලපෙන සේ enum එක යාවත්කාලීන කර ඇත
    relationship: {
        type: String,
        enum: [
            "Mother",
            "Father",
            "Son",
            "Daughter",
            "Brother",
            "Sister",
            "Spouse",
            "Relative",
            "Grandfather",
            "Grandmother",
            "Other",
            null
        ],
        default: null
    },

    // --- ප්‍රදේශය (Location) ---
    district: { 
        type: String, 
        required: true 
    },
    divisionalSecretariat: { 
        type: String, 
        required: true 
    },
    gnDivision: { 
        type: String, 
        required: true 
    },

    // --- පාලන දත්ත (Administrative) ---
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        default: null 
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);