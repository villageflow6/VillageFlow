const express = require('express');
const router = express.Router();
const Welfare = require('../models/Welfare');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

// --- EMAIL CONFIGURATION (Credentials from .env file) ---
// EMAIL_USER and EMAIL_PASS are stored in .env file (not committed to GitHub)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendStatusEmail = async (userEmail, userName, type, status) => {
    try {
        const statusText = status === 'Active' ? 'අනුමත කර (Active) ඇත ✅' : 'තාවකාලිකව අත්හිටුවා (Suspended) ඇත ❌';
        
        const mailOptions = {
            from: `"VillageFlow Welfare Service" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `Welfare Application Status Update - ${type}`,
            html: `
                <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #800000;">VillageFlow සුභසාධන සේවාව</h2>
                    <p>ආයුබෝවන් <b>${userName}</b>,</p>
                    <p>ඔබගේ <b>${type}</b> සහනාධාර අයදුම්පත සම්බන්ධව නවතම පුවතක් ඇත.</p>
                    <p style="font-size: 16px;">වත්මන් තත්ත්වය: <b style="color: ${status === 'Active' ? 'green' : 'red'};">${statusText}</b></p>
                    <hr/>
                    <p style="font-size: 12px; color: #666;">මෙය පද්ධතියෙන් ස්වයංක්‍රීයව එවන ලද පණිවිඩයකි.</p>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log("✅ Status Email Sent Successfully to:", userEmail);
        return true;
    } catch (error) {
        console.error("❌ Email Sending Failed:", error);
        return false;
    }
};
// ---------------------------

// Multer Configuration for file uploads
const uploadDir = 'uploads/welfare';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'welfare-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and PDF files are allowed'));
        }
    }
});

// GET all beneficiaries
router.get('/all', async (req, res) => {
    try {
        const beneficiaries = await Welfare.find().populate('userId', 'email');
        res.json(beneficiaries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST add new
router.post('/add', async (req, res) => {
    try {
        const newEntry = new Welfare(req.body);
        await newEntry.save();
        res.status(201).json(newEntry);
    } catch (err) {
        res.status(500).json({ error: "ඇතුළත් කිරීම අසාර්ථකයි" });
    }
});

// PUT update
router.put('/update/:id', async (req, res) => {
    try {
        const updated = await Welfare.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "යාවත්කාලීන කිරීම අසාර්ථකයි" });
    }
});

// DELETE
router.delete('/delete/:id', async (req, res) => {
    try {
        const welfare = await Welfare.findById(req.params.id);
        
        if (welfare && welfare.paySlip) {
            const filePath = path.join(__dirname, '..', welfare.paySlip);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        await Welfare.findByIdAndDelete(req.params.id);
        res.json({ message: "සාර්ථකව ඉවත් කළා" });
    } catch (err) {
        res.status(500).json({ error: "ඉවත් කිරීම අසාර්ථකයි" });
    }
});

// Apply for welfare
router.post('/apply', upload.fields([
    { name: 'paySlip', maxCount: 1 },
    { name: 'nicImage', maxCount: 1 }
]), async (req, res) => {
    try {
        const { fullName, nic, householdNo, type, monthlyIncome, userId } = req.body;
        
        const paySlipFile = req.files && req.files['paySlip'] ? req.files['paySlip'][0] : null;
        const nicImageFile = req.files && req.files['nicImage'] ? req.files['nicImage'][0] : null;
        
        if (!monthlyIncome) {
            return res.status(400).json({ error: "මාසික ආදායම ඇතුළත් කිරීම අනිවාර්යයි" });
        }

        const existingApplication = await Welfare.findOne({ nic, type });
        if (existingApplication) {
            return res.status(400).json({ 
                error: "ඔබ දැනටමත් මෙම සහනාධාර වර්ගයට අයදුම් කර ඇත" 
            });
        }

        // Get user email if userId is provided
        let userEmail = null;
        if (userId) {
            const user = await User.findById(userId);
            if (user && user.email) {
                userEmail = user.email;
            }
        }

        const newApplication = new Welfare({
            fullName,
            nic,
            householdNo,
            type,
            income: monthlyIncome,
            amount: 0,
            paySlip: paySlipFile ? paySlipFile.path : null,
            nicImage: nicImageFile ? nicImageFile.path : null,
            userId: userId || null,
            userEmail: userEmail,
            status: 'Pending',
            editHistory: [{
                editedAt: new Date(),
                editedBy: userId || 'user',
                changes: { action: 'created' }
            }]
        });
        
        await newApplication.save();
        res.status(201).json({ 
            message: "ඉල්ලුම්පත සාර්ථකව යොමු කළා",
            application: newApplication 
        });
        
    } catch (err) {
        console.error('Welfare application error:', err);
        res.status(500).json({ error: "දත්ත ඇතුළත් කිරීමේ දෝෂයකි" });
    }
});

// Get settings
router.get('/settings', async (req, res) => {
    try {
        const settings = {
            incomeVerificationRequired: req.systemConfig?.welfare?.incomeVerificationRequired || true,
            requiredDocuments: req.systemConfig?.welfare?.requiredDocuments || ['nic', 'paySlip'],
            maxApplicationsPerMonth: req.systemConfig?.welfare?.maxApplicationsPerMonth || 50
        };
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get user applications
router.get('/user-applications/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const applications = await Welfare.find({ 
            $or: [{ userId: userId }, { nic: userId }]
        }).sort({ createdAt: -1 });
        res.json(applications);
    } catch (err) {
        res.status(500).json({ error: "දත්ත ලබා ගැනීමේ දෝෂයකි" });
    }
});

// User Edit route
router.put('/user-edit/:id', upload.single('paySlip'), async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, householdNo, monthlyIncome, userId } = req.body;
        
        const application = await Welfare.findById(id);
        if (!application) return res.status(404).json({ error: "අයදුම්පත හමු නොවීය" });
        
        if (application.status !== 'Pending') {
            return res.status(400).json({ error: "අනුමත වූ හෝ අත්හිටුවන ලද අයදුම්පත් සංස්කරණය කළ නොහැක" });
        }
        
        const updateData = {
            fullName: fullName || application.fullName,
            householdNo: householdNo || application.householdNo,
            income: monthlyIncome || application.income
        };
        
        if (req.file) {
            if (application.paySlip) {
                const oldFilePath = path.join(__dirname, '..', application.paySlip);
                if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
            }
            updateData.paySlip = req.file.path;
        }
        
        const updated = await Welfare.findByIdAndUpdate(
            id, 
            { $set: updateData, $push: { editHistory: { editedAt: new Date(), editedBy: userId, changes: updateData } } }, 
            { new: true }
        );
        res.json({ message: "අයදුම්පත සාර්ථකව යාවත්කාලීන කළා", application: updated });
    } catch (err) {
        res.status(500).json({ error: "යාවත්කාලීන කිරීම අසාර්ථකයි" });
    }
});

// User Delete route
router.delete('/user-delete/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const application = await Welfare.findById(id);
        if (!application) return res.status(404).json({ error: "අයදුම්පත හමු නොවීය" });
        if (application.status !== 'Pending') return res.status(400).json({ error: "මකා දැමිය නොහැක" });
        
        if (application.paySlip) {
            const filePath = path.join(__dirname, '..', application.paySlip);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await Welfare.findByIdAndDelete(id);
        res.json({ message: "අයදුම්පත සාර්ථකව මකා දමන ලදී" });
    } catch (err) {
        res.status(500).json({ error: "මකා දැමීම අසාර්ථකයි" });
    }
});

// Officer approve/suspend route WITH EMAIL
router.put('/approve/:id', async (req, res) => {
    try {
        const { status } = req.body;
        
        // First get the application with user details
        const application = await Welfare.findById(req.params.id).populate('userId');
        
        if (!application) {
            return res.status(404).json({ error: "Application not found" });
        }
        
        // Update the status
        application.status = status;
        application.editHistory.push({
            editedAt: new Date(),
            editedBy: 'officer',
            changes: { status: status }
        });
        
        await application.save();
        
        // Send Email - Try to get email from multiple sources
        let userEmail = null;
        let userName = application.fullName;
        
        // Method 1: Check populated userId
        if (application.userId && application.userId.email) {
            userEmail = application.userId.email;
            console.log("📧 Found email from userId:", userEmail);
        }
        // Method 2: Check stored userEmail field
        else if (application.userEmail) {
            userEmail = application.userEmail;
            console.log("📧 Found email from userEmail field:", userEmail);
        }
        // Method 3: Try to find user by userId directly
        else if (application.userId) {
            const user = await User.findById(application.userId);
            if (user && user.email) {
                userEmail = user.email;
                console.log("📧 Found email from direct User lookup:", userEmail);
            }
        }
        
        // Send email if we have an email address
        if (userEmail) {
            await sendStatusEmail(userEmail, userName, application.type, status);
            console.log("✅ Email sent successfully to:", userEmail);
        } else {
            console.log("⚠️ No email address found for user. Email not sent.");
            console.log("Application ID:", req.params.id);
            console.log("UserId:", application.userId);
            console.log("UserEmail field:", application.userEmail);
        }
        
        res.json({ 
            message: `සහනාධාරය ${status === 'Active' ? 'අනුමත කළා' : 'අත්හිටුවා ඇත'}`,
            application: application 
        });
        
    } catch (err) {
        console.error('Approve error:', err);
        res.status(500).json({ error: "යාවත්කාලීන කිරීම අසාර්ථකයි" });
    }
});

// Get welfare by ID
router.get('/:id', async (req, res) => {
    try {
        const welfare = await Welfare.findById(req.params.id).populate('userId', 'email');
        if (!welfare) {
            return res.status(404).json({ error: "Not found" });
        }
        res.json(welfare);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Filter by income
router.get('/filter/income/:maxIncome', async (req, res) => {
    try {
        const maxIncome = parseInt(req.params.maxIncome);
        const beneficiaries = await Welfare.find({ income: { $lte: maxIncome } });
        res.json(beneficiaries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Check existing application
router.get('/check/:nic/:type', async (req, res) => {
    try {
        const existing = await Welfare.findOne({ nic: req.params.nic, type: req.params.type });
        res.json({ exists: !!existing });
    } catch (err) {
        res.status(500).json({ error: "පරීක්ෂා කිරීමේ දෝෂයකි" });
    }
});

// Get pay slip file
router.get('/pay-slip/:filename', (req, res) => {
    const filepath = path.join(__dirname, '..', 'uploads', 'welfare', req.params.filename);
    if (fs.existsSync(filepath)) {
        res.sendFile(filepath);
    } else {
        res.status(404).json({ error: "File not found" });
    }
});

module.exports = router;
