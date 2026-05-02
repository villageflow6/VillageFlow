const express = require('express');
const router = express.Router();
const multer = require('multer');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const fs = require('fs');

// Models
const Certificate = require('../models/Certificate');
const Payment = require('../models/Payment');  // Payment model එක import කරන්න
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

// Ensure uploads directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Helper function to get certificate fee
const getCertificateFee = (certificateType) => {
    const fees = {
        'Residency Certificate': 250,
        'Character Certificate': 200,
        'Income Certificate': 300,
        'Birth Certificate Copy': 150
    };
    return fees[certificateType] || 250;
};

// Generate unique transaction ID
const generateTransactionId = (prefix) => {
    return `${prefix}${Date.now()}${Math.floor(Math.random() * 10000)}`;
};

// 1. CITIZEN CHECK API
router.get('/citizens/check/:nic', async (req, res) => {
    try {
        const user = await User.findOne({ nic: req.params.nic });
        if (user) {
            res.json({ exists: true, fullName: user.fullName });
        } else {
            res.json({ exists: false });
        }
    } catch (err) {
        res.status(500).json({ error: "Server error checking citizen data" });
    }
});


// 2. ANALYTICAL DATA API
router.get('/analytics/summary', async (req, res) => {
    try {
        const total = await Certificate.countDocuments();
        const approved = await Certificate.countDocuments({ status: 'Approved' });
        const rejected = await Certificate.countDocuments({ status: 'Rejected' });
        const pending = await Certificate.countDocuments({ status: 'Pending' });
        res.json({ total, approved, rejected, pending });
    } catch (err) {
        res.status(500).json({ error: "Failed to get analytics data" });
    }
});

router.get('/audit-logs', async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(50);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: "Failed to get audit logs" });
    }
});

// 3. READ USER HISTORY (with payment info)
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "Invalid User ID format" });
        }
        
        const apps = await Certificate.find({ userId: new mongoose.Types.ObjectId(userId) })
            .sort({ appliedDate: -1 });
        
        const appsWithPayment = await Promise.all(apps.map(async (app) => {
            const appObj = app.toObject();
            const payment = await Payment.findOne({ certificateId: app._id });
            if (payment) {
                appObj.paymentStatus = payment.status;
                appObj.paymentMethod = payment.paymentMethod;
                appObj.paymentAmount = payment.amount;
                appObj.transactionId = payment.transactionId;
                appObj.paymentDate = payment.paymentDate;
            }
            return appObj;
        }));
        
        res.json(appsWithPayment);
    } catch (err) {
        console.error("Fetch User History Error:", err);
        res.status(500).json({ error: "Failed to get application history" });
    }
});

// 4. VERIFY (QR Code verification)
router.get('/verify/:id', async (req, res) => {
    try {
        const cert = await Certificate.findById(req.params.id)
            .populate('userId', 'fullName');
            
        if (!cert) {
            return res.status(404).json({ valid: false, message: "Invalid certificate" });
        }

        if (cert.status !== 'Approved') {
            return res.status(400).json({ 
                valid: false, 
                message: "Certificate exists but not yet approved" 
            });
        }

        res.json({ 
            valid: true, 
            data: {
                name: cert.memberName,
                nic: cert.nic,
                type: cert.certificateType,
                date: cert.appliedDate,
                status: cert.status
            } 
        });
    } catch (err) {
        res.status(500).json({ valid: false, message: "Verification error" });
    }
});

// 5. CREATE APPLICATION (WITH PAYMENT)
router.post('/apply', upload.fields([
    { name: 'utilityBill', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log("📝 Received application data:", req.body);
        
        const { 
            nic, 
            certificateType, 
            userId, 
            memberName, 
            relationship, 
            applyFor, 
            paymentStatus,
            paymentMethod, 
            transactionId, 
            paymentAmount
        } = req.body;

        const utilityBillFile = req.files && req.files['utilityBill'] ? req.files['utilityBill'][0] : null;

        if (!utilityBillFile) {
            return res.status(400).json({ error: "Required document (Utility Bill) missing" });
        }

        // Check for duplicate pending application
        const existingPending = await Certificate.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            certificateType,
            nic,
            status: 'Pending'
        });

        if (existingPending) {
            return res.status(400).json({ error: "You already have a pending application for this certificate type" });
        }

        // Create certificate
        const newApp = new Certificate({
            userId: new mongoose.Types.ObjectId(userId),
            nic, 
            certificateType,
            memberName: memberName || "Self",
            relationship: relationship || "Self",
            applyFor: applyFor || "Self",
            utilityBill: utilityBillFile.path,
            paymentStatus: paymentStatus === 'completed' ? 'completed' : 'pending',
            paymentMethod: paymentMethod || null,
            transactionId: transactionId || null,
            paymentAmount: paymentAmount ? Number(paymentAmount) : null,
            paymentDate: paymentStatus === 'completed' ? new Date() : null,
            status: 'Pending'
        });

        await newApp.save();
        console.log("✅ Certificate created:", newApp._id);
        
    
        // CRITICAL: CREATE PAYMENT RECORD
        if (paymentStatus === 'completed' && transactionId) {
            // Card or Mobile payment - immediately completed
            const payment = new Payment({
                userId: new mongoose.Types.ObjectId(userId),
                certificateId: newApp._id,
                certificateType: certificateType,
                amount: paymentAmount ? Number(paymentAmount) : getCertificateFee(certificateType),
                paymentMethod: paymentMethod || 'card',
                transactionId: transactionId,
                status: 'completed',
                paymentDate: new Date(),
                paymentDetails: {
                    paymentDate: new Date()
                }
            });
            await payment.save();
            console.log("✅ Payment record created (completed):", payment);
            
            // Update certificate with payment ID
            await Certificate.findByIdAndUpdate(newApp._id, {
                paymentStatus: 'completed'
            });
            
        } else if (paymentMethod === 'bank' || paymentMethod === 'offline') {
            // Bank or Offline payment - needs verification
            const newTransactionId = transactionId || generateTransactionId(paymentMethod === 'bank' ? 'BNK' : 'OFF');
            
            const payment = new Payment({
                userId: new mongoose.Types.ObjectId(userId),
                certificateId: newApp._id,
                certificateType: certificateType,
                amount: paymentAmount ? Number(paymentAmount) : getCertificateFee(certificateType),
                paymentMethod: paymentMethod,
                transactionId: newTransactionId,
                status: 'pending_verification',
                paymentDate: new Date(),
                paymentDetails: {
                    paymentDate: new Date()
                }
            });
            await payment.save();
            console.log("✅ Payment record created (pending_verification):", payment);
            
            // Update certificate with transaction ID
            if (!transactionId) {
                await Certificate.findByIdAndUpdate(newApp._id, {
                    transactionId: newTransactionId
                });
            }
        } else {
            console.log("⚠️ No payment data received - payment will be required later");
        }
        
        res.status(201).json({ 
            msg: "Application submitted successfully!", 
            appId: newApp._id 
        });
    } catch (err) {
        console.error("Apply Error:", err);
        res.status(500).json({ error: "Failed to submit application: " + err.message });
    }
});

// 6. UPDATE APPLICATION STATUS (WITH PAYMENT UPDATE)
router.put('/update/:id', upload.fields([
    { name: 'utilityBill', maxCount: 1 }
]), async (req, res) => {
    try {
        const { id } = req.params;
        const existingApp = await Certificate.findById(id);
        
        if (!existingApp) {
            return res.status(404).json({ error: "Application not found" });
        }

        const updateData = { ...req.body };

        if (req.files && req.files['utilityBill']) {
            updateData.utilityBill = req.files['utilityBill'][0].path;
        }

        if (updateData.status && updateData.status !== 'Rejected') {
            updateData.rejectionReason = "";
        }

        // Handle payment when approving
        if (req.body.status === 'Approved') {
            updateData.reviewedDate = new Date();
            
            // Check if payment needs to be completed
            const existingPayment = await Payment.findOne({ certificateId: id });
            
            if (existingPayment && existingPayment.status === 'pending_verification') {
                // Update payment to completed
                await Payment.findByIdAndUpdate(existingPayment._id, {
                    status: 'completed',
                    'paymentDetails.verifiedAt': new Date(),
                    'paymentDetails.verifiedBy': req.body.officerName || 'Grama Niladhari'
                });
                updateData.paymentStatus = 'completed';
                console.log("✅ Payment verified and completed on approval");
            } else if (!existingPayment) {
                // No payment record - create one as completed
                const newPayment = new Payment({
                    userId: existingApp.userId,
                    certificateId: id,
                    certificateType: existingApp.certificateType,
                    amount: getCertificateFee(existingApp.certificateType),
                    paymentMethod: 'offline',
                    transactionId: generateTransactionId('OFF'),
                    status: 'completed',
                    paymentDate: new Date(),
                    paymentDetails: {
                        verifiedBy: req.body.officerName || 'Grama Niladhari',
                        verifiedAt: new Date(),
                        notes: 'Payment processed by GN Officer'
                    }
                });
                await newPayment.save();
                updateData.paymentStatus = 'completed';
                updateData.paymentMethod = 'offline';
                updateData.transactionId = newPayment.transactionId;
                updateData.paymentAmount = newPayment.amount;
                console.log("✅ Payment record created on approval");
            }
        }

        // Handle refund when rejecting
        if (req.body.status === 'Rejected') {
            const existingPayment = await Payment.findOne({ certificateId: id });
            if (existingPayment && existingPayment.status === 'completed') {
                await Payment.findByIdAndUpdate(existingPayment._id, {
                    status: 'refunded',
                    'paymentDetails.notes': `Refunded due to rejection: ${req.body.rejectionReason || 'No reason provided'}`
                });
                updateData.paymentStatus = 'refunded';
                console.log("💰 Payment refunded due to rejection");
            }
        }

        // FIXED: Changed from { new: true } to { returnDocument: 'after' }
        const updatedApp = await Certificate.findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
            .populate('userId', 'email fullName');

        // Log the action
        if (req.body.status && req.body.status !== existingApp.status) {
            const newLog = new AuditLog({
                action: `${updatedApp.certificateType} certificate was ${req.body.status}`,
                officerName: req.body.officerName || "Grama Niladhari",
                targetNic: updatedApp.nic
            });
            await newLog.save();

            // Send email notification
            if (updatedApp.userId && updatedApp.userId.email) {
                try {
                    let mailOptions = {
                        from: `"VillageFlow Portal" <${process.env.EMAIL_USER}>`,
                        to: updatedApp.userId.email,
                        subject: req.body.status === 'Approved' ? 'VillageFlow - Certificate Approved' : 'VillageFlow - Application Rejected',
                        html: `<h3>VillageFlow Notification</h3>
                               <p>Dear ${updatedApp.userId.fullName},</p>
                               <p>Your <b>${updatedApp.certificateType}</b> application status: <b>${req.body.status}</b></p>
                               ${req.body.status === 'Rejected' ? 
                                `<p style="color:red">Reason: ${req.body.rejectionReason || 'Incomplete data'}</p>
                                 <p><b>Note:</b> Your payment will be refunded.</p>` : 
                                '<p>You can now download your certificate from the portal.</p>'}`
                    };
                    await transporter.sendMail(mailOptions);
                } catch (e) { 
                    console.log("Email notification failed:", e); 
                }
            }
        }

        res.json({ msg: "Update successful!", updatedApp });
    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).json({ error: "Update failed: " + err.message });
    }
});

// 7. GET ALL APPLICATIONS
router.get('/all', async (req, res) => {
    try {
        const apps = await Certificate.find()
            .populate('userId', 'fullName email')
            .sort({ appliedDate: -1 });
        res.json(apps);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// 8. DELETE APPLICATION
router.delete('/delete/:id', async (req, res) => {
    try {
        // Also delete associated payment
        await Payment.deleteOne({ certificateId: req.params.id });
        await Certificate.findByIdAndDelete(req.params.id);
        res.json({ msg: "Application deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// 9. SEND PDF VIA EMAIL
router.post('/send-pdf-email', async (req, res) => {
    const { email, pdfBase64, nic, certType } = req.body;
    try {
        const base64Data = pdfBase64.includes("base64,") ? pdfBase64.split("base64,")[1] : pdfBase64;
        const mailOptions = {
            from: `"VillageFlow Portal" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Your ${certType} Certificate - VillageFlow`,
            attachments: [{ filename: `${certType}_${nic}.pdf`, content: base64Data, encoding: 'base64' }]
        };
        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (err) { 
        console.error("PDF Email Error:", err);
        res.status(500).json({ error: "Email sending failed" }); 
    }
});

// 10. GET CERTIFICATE BY ID (WITH PAYMENT INFO)

router.get('/certificate/:id', async (req, res) => {
    try {
        const certificate = await Certificate.findById(req.params.id).populate('userId', 'fullName email phone');
        if (!certificate) return res.status(404).json({ message: 'Certificate not found' });
        
        const payment = await Payment.findOne({ certificateId: certificate._id });
        const result = certificate.toObject();
        
        if (payment) {
            result.paymentInfo = {
                id: payment._id,
                status: payment.status,
                method: payment.paymentMethod,
                amount: payment.amount,
                transactionId: payment.transactionId,
                date: payment.paymentDate
            };
        }
        
        res.json(result);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: 'Server error' }); 
    }
});

// 11. GET PAYMENT BY CERTIFICATE ID
router.get('/payment/:certificateId', async (req, res) => {
    try {
        const payment = await Payment.findOne({ certificateId: req.params.certificateId });
        if (!payment) {
            return res.json({ exists: false, message: 'No payment found' });
        }
        res.json(payment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// 12. VERIFY OFFLINE PAYMENT (GN OFFICER)
router.post('/verify-payment', async (req, res) => {
    try {
        const { certificateId, receiptNumber, verifiedBy } = req.body;
        
        const payment = await Payment.findOne({ certificateId: certificateId });
        
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        
        payment.status = 'completed';
        payment.paymentDetails.receiptNumber = receiptNumber;
        payment.paymentDetails.verifiedBy = verifiedBy;
        payment.paymentDetails.verifiedAt = new Date();
        await payment.save();
        
        // Update certificate payment status
        await Certificate.findByIdAndUpdate(certificateId, {
            paymentStatus: 'completed'
        });
        
        res.json({ success: true, message: 'Payment verified successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// 13. GET PENDING PAYMENTS (GN OFFICER)
router.get('/pending-payments', async (req, res) => {
    try {
        const payments = await Payment.find({ 
            status: 'pending_verification' 
        }).populate('userId', 'fullName nic email');
        res.json(payments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;