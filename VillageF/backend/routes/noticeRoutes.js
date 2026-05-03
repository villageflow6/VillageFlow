const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const User = require('../models/User'); 
const nodemailer = require('nodemailer');

// 1. සියලුම නිවේදන ලබා ගැනීම
router.get('/all', async (req, res) => {
    try {
        const notices = await Notice.find().sort({ postedDate: -1 }); 
        res.json(notices);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. අලුත් නිවේදනයක් ඇතුළත් කිරීම සහ Email යැවීම
router.post('/add', async (req, res) => {
    const notice = new Notice({
        title: req.body.title,
        desc_si: req.body.desc_si,
        desc_ta: req.body.desc_ta,
        desc_en: req.body.desc_en,
        category: req.body.category,
        priority: req.body.priority
    });

    try {
        const newNotice = await notice.save();

        // --- Email Logic (Using .env) ---
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, // .env එකෙන් ලබා ගනී
                pass: process.env.EMAIL_PASS  // .env එකෙන් ලබා ගනී
            }
        });

        const citizens = await User.find({ role: 'citizen' }).select('email');
        const emailList = citizens.map(u => u.email);

        if (emailList.length > 0) {
            const mailOptions = {
                from: `"Village Notice Board" <${process.env.EMAIL_USER}>`,
                to: emailList,
                subject: `නව නිවේදනයයි: ${req.body.title}`,
                html: `
                    <div style="font-family: sans-serif; border: 2px solid #800000; padding: 20px; border-radius: 10px;">
                        <h2 style="color: #800000;">${req.body.title}</h2>
                        <p><b>සිංහල:</b> ${req.body.desc_si}</p>
                        ${req.body.desc_ta ? `<p><b>දෙමළ:</b> ${req.body.desc_ta}</p>` : ''}
                        ${req.body.desc_en ? `<p><b>English:</b> ${req.body.desc_en}</p>` : ''}
                        <hr/>
                        <p style="font-size: 12px; color: #777;">ප්‍රවර්ගය: ${req.body.category} | දිනය: ${new Date().toLocaleDateString()}</p>
                    </div>
                `
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) console.log("Email Error: ", error);
                else console.log("Emails Sent: " + info.response);
            });
        }
        // --- End Email Logic ---

        res.status(201).json(newNotice);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 3. නිවේදනයක් යාවත්කාලීන කිරීම
router.put('/update/:id', async (req, res) => {
    try {
        const updatedNotice = await Notice.findByIdAndUpdate(
            req.params.id,
            req.body, // පහසුව සඳහා req.body සම්පූර්ණයෙන්ම ලබා ගත හැක
            { new: true }
        );
        res.json(updatedNotice);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 4. නිවේදනයක් ඉවත් කිරීම
router.delete('/delete/:id', async (req, res) => {
    try {
        await Notice.findByIdAndDelete(req.params.id);
        res.json({ message: "නිවේදනය සාර්ථකව මකා දැමුවා" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;