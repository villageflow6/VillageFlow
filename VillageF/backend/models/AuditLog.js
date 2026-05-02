const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    // සිදුකළ ක්‍රියාව 
    action: { 
        type: String, 
        required: true 
    }, 
    
    // ක්‍රියාව සිදුකළ නිලධාරියාගේ නම
    officerName: { 
        type: String, 
        required: true 
    },
    
    // අදාළ සහතිකයට අයිති පුද්ගලයාගේ NIC අංකය
    targetNic: { 
        type: String 
    },
    
    // සිදුවීම සිදුවූ දිනය සහ වේලාව
    timestamp: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);