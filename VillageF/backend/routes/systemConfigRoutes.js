const express = require('express');
const router = express.Router();
const SystemConfig = require('../models/SystemConfig');
const User = require('../models/User'); 
const auth = require('../middleware/auth');

const DEFAULT_CONFIG = {
    appointment: {
        maxAppointmentsPerDay: 20,
        availableTimeSlots: ['9.00 AM - 10.00 AM', '10.00 AM - 11.00 AM', '11.00 AM - 12.00 PM', '1.00 PM - 2.00 PM', '2.00 PM - 3.00 PM'],
        advanceBookingDays: 14,
        cancellationPolicy: 'අවම වශයෙන් පැය 2කට පෙර දැනුම් දිය යුතුය'
    },
    services: [
        { name: 'පදිංචි සහතිකය', duration: 15 },
        { name: 'ආදායම් සහතිකය', duration: 20 }
    ],
    holidays: [],
    emergency: { active: false, message: '' },
    general: { 
        officeHours: '8.30 AM - 4.15 PM', 
        contactNumber: 'තොරතුරු ලබා දී නැත', 
        gramaNiladhariName: 'සඳහන් කර නැත', 
        gramaNiladhariDivision: 'සඳහන් කර නැත', 
        gnDivision: 'සඳහන් කර නැත',
        officeAddress: 'සඳහන් කර නැත'
    },
    welfare: { incomeVerificationRequired: true, requiredDocuments: ['nic', 'paySlip'], maxApplicationsPerMonth: 50 },
    ui: { theme: { primaryColor: '#800000', secondaryColor: '#f2b713' }, language: 'si' }
};

// 1. Public config
router.get('/public-config', async (req, res) => {
    try {
        let config = await SystemConfig.findOne().sort({ updatedAt: -1 });
        if (!config) return res.json(DEFAULT_CONFIG);
        res.json(config);
    } catch (err) {
        res.json(DEFAULT_CONFIG);
    }
});

// 2. Protected Config (නිවැරදි කළ Role check එක සමඟ)
router.get('/config', auth, async (req, res) => {
    try {
        const userId = req.user.id; 
        const userRole = req.user.role ? req.user.role.toLowerCase() : '';

        // නිලධාරීන්ට පමණක් අවසර ලබා දීම
        if (userRole !== 'officer' && userRole !== 'gramaniladhari') {
            console.warn(`🚫 Access denied for role: ${userRole}`);
            return res.status(403).json({ error: "ඔබට මෙම සැකසුම් වෙනස් කිරීමට අවසර නැත." });
        }

        let config = await SystemConfig.findOne({ gramaNiladhariId: userId });
        
        if (!config) {
            config = new SystemConfig({
                gramaNiladhariId: userId,
                ...DEFAULT_CONFIG
            });
            await config.save();
        }
        
        res.json(config);
    } catch (err) {
        console.error('❌ [CONFIG ERROR]:', err);
        res.status(500).json({ error: 'දත්ත ලබාගැනීමේ දෝෂයකි' });
    }
});

// 3. Update Config
router.put('/config', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role ? req.user.role.toLowerCase() : '';

        if (userRole !== 'officer' && userRole !== 'gramaniladhari') {
            return res.status(403).json({ error: "අවසර නැත" });
        }

        const config = await SystemConfig.findOneAndUpdate(
            { gramaNiladhariId: userId },
            { $set: { ...req.body, updatedAt: new Date() } },
            { returnDocument: 'after', upsert: true }
        );
        
        res.json({ message: '✅ සාර්ථකව සුරකින ලදී', config });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Reset, Check routes... (ඉතිරි කෝඩ් එක එලෙසම පවතී)
router.get('/check', (req, res) => res.status(200).json({ success: true }));

module.exports = router;