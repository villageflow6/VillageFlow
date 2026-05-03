const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true 
    },
    // භාෂා 3 සඳහා වෙන් වෙන් වශයෙන් fields
    desc_si: { 
        type: String, 
        required: true  
    },
    desc_ta: { 
        type: String, 
        default: '' 
    },
    desc_en: { 
        type: String, 
        default: '' 
    },
    // පැරණි data තිබේ නම් ඒවා පෙන්වීමට මෙය තබා ගත හැක
    description: { 
        type: String 
    },
    category: { 
        type: String, 
        enum: ['General', 'Welfare', 'Meeting', 'Emergency'], 
        default: 'General' 
    },
    postedDate: { 
        type: Date, 
        default: Date.now 
    },
    priority: { 
        type: String, 
        enum: ['Low', 'Medium', 'High'], 
        default: 'Medium' 
    }
});

module.exports = mongoose.model('Notice', noticeSchema);