// --- 0. DNS සහ Environment Configuration (මුලින්ම තිබිය යුතුයි) ---
require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);
const path = require("path");
const fs = require('fs');
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Enable trust proxy for Render/Cloud environments (required for rate-limiting)
app.set('trust proxy', 1);

// පද්ධතිය පණගැන්වීමේදී Environment Variables පරීක්ෂා කිරීම
console.log("MONGO_URI →", process.env.MONGO_URI);
console.log("PORT →", process.env.PORT);

if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing. Check .env file + variable name.");
  process.exit(1);
}

// 1. Security Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
})); 
app.use(cors()); 
// app.use(mongoSanitize()); // Disabled due to Express 5 compatibility issue (req.query is read-only)

// PDF සහ විශාල දත්ත (Base64) සඳහා Body Limit එක වැඩි කිරීම
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 2. Static Folder & Uploads Check
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("📁 'uploads' folder එක අලුතින් නිර්මාණය කරන ලදී.");
}

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || "SL_GOV_VILLAGE_FLOW_2026";

app.use('/uploads', (req, res, next) => {
    // Secret bypass for public images if any (none currently identified as non-sensitive)
    const token = req.query.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);
    
    if (!token) {
        return res.status(403).json({ msg: "Access Denied: Authentication required for documents" });
    }

    try {
        jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ msg: "Invalid or expired token" });
    }
}, express.static(uploadDir));

// නව: System Config Middleware අවශ්‍ය Models
const SystemConfig = require('./models/SystemConfig');
const User = require('./models/User'); // User model එක අත්‍යවශ්‍යයි

// Config Middleware - හැම request එකකටම config එක attach කරන්න
const configMiddleware = async (req, res, next) => {
    try {
        let config = null;

        // 1. පද්ධතියේ සිටින පළමු ග්‍රාම නිලධාරීවරයාව සොයාගන්න (Public දත්ත සඳහා)
        const gramaniladhari = await User.findOne({ 
            role: { $in: ['officer', 'gramaniladhari'] } 
        });

        // 2. User ලොග් වී සිටී නම් ඔහුගේ ID එකෙන් හෝ නැතිනම් පද්ධතියේ සිටින නිලධාරියාගේ ID එකෙන් සොයන්න
        const searchId = req.user ? req.user._id : (gramaniladhari ? gramaniladhari._id : null);

        if (searchId) {
            config = await SystemConfig.findOne({ gramaNiladhariId: searchId });
        }

        if (config) {
            req.systemConfig = config;
        } else {
            // Default config එකක් (Database එකේ settings නැති අවස්ථාවකදී)
            req.systemConfig = {
                appointment: {
                    maxAppointmentsPerDay: 20,
                    availableTimeSlots: ['9.00 AM - 10.00 AM', '10.00 AM - 11.00 AM', '11.00 AM - 12.00 PM', '1.00 PM - 2.00 PM', '2.00 PM - 3.00 PM'],
                    advanceBookingDays: 14
                },
                welfare: {
                    incomeVerificationRequired: true,
                    requiredDocuments: ['nic', 'paySlip'],
                    maxApplicationsPerMonth: 50
                },
                general: {
                    officeHours: '8.30 AM - 4.15 PM'
                }
            };
        }
        
        next();
    } catch (err) {
        console.error('❌ Config middleware error:', err);
        next();
    }
};

// ========== නව: HEALTH CHECK ENDPOINT එක ==========
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Server is running successfully!',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Rate Limiting (Brute Force Protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many attempts, please try again after 15 minutes."
});

// 3. Routes (පිළිවෙළට අදාළව - එක වතාවක් පමණයි!)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', require('./routes/auth')); 

// Config Middleware මෙතනදී use කළ හැකියි - එවිට සියලුම පහළ routes වලට settings ලැබේ
app.use(configMiddleware); 

app.use('/api/users', require('./routes/userRoutes')); 

// ========== IMPORTANT: Certificate Routes - එක වතාවක් පමණයි! ==========
const certificateRoutes = require('./routes/certificateRoutes');
app.use('/api/certificates', certificateRoutes); 

app.use('/api/citizens', require('./routes/citizenRoutes')); 

// ASSET ROUTES - එක වතාවක් පමණයි
app.use('/api/assets', require('./routes/assets')); 

app.use('/api/welfare', require('./routes/welfareRoutes'));
app.use('/api/notices', require('./routes/noticeRoutes'));
app.use('/api/appointments', require('./routes/appointments'));

// AUDIT ROUTES
const auditRoutes = require('./routes/auditRoutes');
app.use('/api/audit', auditRoutes);

// SYSTEM CONFIG ROUTES
const systemConfigRoutes = require('./routes/systemConfigRoutes');
app.use('/api/system', systemConfigRoutes);

// REMINDER ROUTES - එක වතාවක් පමණයි
app.use('/api/reminders', require('./routes/reminderRoutes'));

// server.js හි
const chatbotRoutes = require('./server/chatbot');

// After body-parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add chatbot route
app.use('/api/chatbot', chatbotRoutes);


// ========== නව: 404 ERROR HANDLER ==========
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: `Route ${req.originalUrl} not found`,
        availableEndpoints: {
            test: '/api/test',
            health: '/api/health',
            welfare: '/api/welfare',
            auth: '/api/auth',
            users: '/api/users',
            certificates: '/api/certificates',
            citizens: '/api/citizens',
            assets: '/api/assets',
            notices: '/api/notices',
            appointments: '/api/appointments',
            audit: '/api/audit',
            system: '/api/system',
            reminders: '/api/reminders'
        }
    });
});

// 4. Database Connection & Server Start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Atlas connected");
    
    // Root endpoint (Database connect වූ පසු පමණක්)
    app.get('/', (req, res) => res.json({ 
        message: "VillageFlow Backend Running Successfully with Atlas!",
        version: "1.0.0",
        endpoints: {
            health: "/api/health",
            test: "/api/test",
            assets: "/api/assets",
            certificates: "/api/certificates"
        }
    }));

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server started on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📍 Test endpoint: http://localhost:${PORT}/api/test`);
      console.log(`📍 Assets endpoint: http://localhost:${PORT}/api/assets/all`);
      console.log(`📍 Certificates endpoint: http://localhost:${PORT}/api/certificates/all`);
      console.log(`📍 Reminders endpoint: http://localhost:${PORT}/api/reminders/pending`);
    });
  })
  .catch((err) => {
    console.error("❌ DB error:", err);
    process.exit(1);
  });
