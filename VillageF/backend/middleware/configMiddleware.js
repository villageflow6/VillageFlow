// backend/middleware/configMiddleware.js
const SystemConfig = require('../models/SystemConfig');
const User = require('../models/User');

const configMiddleware = async (req, res, next) => {
    try {
        // පළමුව ග්‍රාම නිලධාරී කෙනෙක් ඉන්නවාදැයි බලන්න
        const gramaniladhari = await User.findOne({ 
            role: { $in: ['officer', 'gramaniladhari'] } 
        });

        if (gramaniladhari) {
            const config = await SystemConfig.findOne({ gramaNiladhariId: gramaniladhari._id });
            if (config) {
                req.systemConfig = config; // Database එකේ settings request එකට දානවා
            }
        }
        next();
    } catch (err) {
        console.error("Config Middleware Error:", err);
        next();
    }
};

module.exports = configMiddleware;