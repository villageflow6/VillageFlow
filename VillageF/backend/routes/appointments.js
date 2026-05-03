const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const nodemailer = require('nodemailer');

// --- Nodemailer Configuration ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'villageflow6@gmail.com',
        pass: 'jcpwnzwionobbeey' //App Password එක
    }
});

// 1. පත්වීමක් වෙන් කරවා ගැනීම - System Config එක සමඟ
router.post('/book', async (req, res) => {
    try {
        const { userId, userName, nic, reason, date, time, userEmail } = req.body;

        // System Config check කරන්න - දවසට ගත හැකි උපරිම පත්වීම් ගණන
        // Middleware එක හරහා req.systemConfig ලැබෙන නිසා මෙය දැන් Database එකෙන් දත්ත ගනී
        if (req.systemConfig && req.systemConfig.appointment) {
            const dailyCount = await Appointment.countDocuments({ 
                date,
                status: { $ne: 'Rejected' }
            });
            
            const maxAllowed = req.systemConfig.appointment.maxAppointmentsPerDay;
            
            if (dailyCount >= maxAllowed) {
                return res.status(400).json({ 
                    message: `මෙම දිනය සඳහා ගත හැකි උපරිම පත්වීම් ගණන ${maxAllowed} කි` 
                });
            }
        }

        const newAppointment = new Appointment({
            userId,
            userName,
            nic,
            reason,
            date,
            time,
            userEmail // Frontend එකෙන් එවන Email එක මෙතන Save වෙනවා
        });

        await newAppointment.save();
        res.status(201).json(newAppointment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 2. සියලුම පත්වීම් ලබා ගැනීම
router.get('/all', async (req, res) => {
    try {
        const apps = await Appointment.find().sort({ createdAt: -1 });
        res.json(apps);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 3. ලබා ගත හැකි වේලාවන් ලබා ගැනීම (System Config එකෙන්)
router.get('/available-slots', async (req, res) => {
    try {
        // System Config එකෙන් වේලාවන් ගන්න, නැත්නම් default එකක් දෙන්න
        const slots = req.systemConfig?.appointment?.availableTimeSlots || [
            '9.00 AM - 10.00 AM',
            '10.00 AM - 11.00 AM',
            '11.00 AM - 12.00 PM',
            '1.00 PM - 2.00 PM',
            '2.00 PM - 3.00 PM'
        ];
        
        // එක් එක් වේලාව සඳහා පවතින ස්ථාන ගණන ගණනය කරන්න
        const { date } = req.query;
        let slotsWithAvailability = slots;
        
        if (date) {
            const bookedAppointments = await Appointment.find({
                date,
                status: { $ne: 'Rejected' }
            });
            
            slotsWithAvailability = slots.map(slot => {
                const bookedCount = bookedAppointments.filter(
                    app => app.time === slot
                ).length;
                
                return {
                    time: slot,
                    available: bookedCount < 1, // එක වේලාවකට එක appointment
                    bookedCount
                };
            });
        }
        
        res.json(slotsWithAvailability);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 4. තත්ත්වය වෙනස් කිරීම සහ Email යැවීම 
router.put('/status/:id', async (req, res) => {
    try {
        const { status } = req.body;
        
        // 'new: true' වෙනුවට 'returnDocument: "after"' භාවිතා කර ඇත
        const updated = await Appointment.findByIdAndUpdate(
            req.params.id, 
            { status: status }, 
            { 
                returnDocument: 'after', // මෙය new: true වෙනුවට
                runValidators: true 
            }
        );

        if (updated && updated.userEmail) {
            const mailOptions = {
                from: '"Village Forum System" <itprojectgroup6kandyuni@gmail.com>',
                to: updated.userEmail,
                subject: `Appointment Status: ${status}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                        <h2 style="color: ${status === 'Approved' ? '#22c55e' : '#ef4444'}; text-align: center;">
                            Appointment ${status}
                        </h2>
                        <p>Dear <b>${updated.userName}</b>,</p>
                        <p>Your appointment request has been reviewed. Here are the details:</p>
                        <table style="width: 100%; background: #f9f9f9; padding: 10px; border-radius: 5px;">
                            <tr><td><b>Date:</b></td><td>${updated.date}</td></tr>
                            <tr><td><b>Time:</b></td><td>${updated.time}</td></tr>
                            <tr><td><b>Reason:</b></td><td>${updated.reason}</td></tr>
                            <tr><td><b>Status:</b></td><td><b style="color: ${status === 'Approved' ? '#22c55e' : '#ef4444'};">${status}</b></td></tr>
                        </table>
                        <p style="margin-top: 20px;">Thank you for using our system!</p>
                        <hr>
                        <small style="color: #777;">This is an automated message. Please do not reply.</small>
                    </div>
                `
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) console.log("Email Send Error:", error);
                else console.log("Email Sent Successfully: " + info.response);
            });
        }

        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 5. පත්වීමක් මකා දැමීම
router.delete('/:id', async (req, res) => {
    try {
        await Appointment.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 6. පත්වීමක් යාවත්කාලීන කිරීම (UPDATE) 
router.put('/update/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nic, reason, date, time } = req.body;

        // Appointment එක හොයාගෙන තියෙනවද කියලා check කරන්න
        const appointment = await Appointment.findById(id);
        
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
        
        // Pending status එකේ පමණක් update කරන්න ඉඩ දෙන්න
        if (appointment.status !== 'Pending') {
            return res.status(400).json({ message: 'Can only update pending appointments' });
        }
        
        // Appointment එක update කරන්න 
        const updatedAppointment = await Appointment.findByIdAndUpdate(
            id,
            {
                nic: nic || appointment.nic,
                reason: reason || appointment.reason,
                date: date || appointment.date,
                time: time || appointment.time
            },
            { 
                returnDocument: 'after', 
                runValidators: true 
            }
        );
        
        // Update සාර්ථක වුණාම user ට email එකක් යවන්න 
        if (updatedAppointment && updatedAppointment.userEmail) {
            const mailOptions = {
                from: '"Village Forum System" <itprojectgroup6kandyuni@gmail.com>',
                to: updatedAppointment.userEmail,
                subject: 'Your Appointment Has Been Updated',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                        <h2 style="color: #3b82f6; text-align: center;">Appointment Updated</h2>
                        <p>Dear <b>${updatedAppointment.userName}</b>,</p>
                        <p>Your appointment details have been successfully updated. Here are the new details:</p>
                        <table style="width: 100%; background: #f9f9f9; padding: 10px; border-radius: 5px;">
                            <tr><td><b>NIC:</b></td><td>${updatedAppointment.nic}</td></tr>
                            <tr><td><b>Date:</b></td><td>${updatedAppointment.date}</td></tr>
                            <tr><td><b>Time:</b></td><td>${updatedAppointment.time}</td></tr>
                            <tr><td><b>Reason:</b></td><td>${updatedAppointment.reason}</td></tr>
                            <tr><td><b>Status:</b></td><td><b style="color: #f59e0b;">${updatedAppointment.status}</b></td></tr>
                        </table>
                        <p style="margin-top: 20px;">Your appointment is still pending approval from an officer.</p>
                        <hr>
                        <small style="color: #777;">This is an automated message. Please do not reply.</small>
                    </div>
                `
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) console.log("Update Email Send Error:", error);
                else console.log("Update Email Sent Successfully: " + info.response);
            });
        }
        
        res.status(200).json({ 
            message: 'Appointment updated successfully', 
            appointment: updatedAppointment 
        });
        
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ message: 'Error updating appointment', error: error.message });
    }
});

// 7. කලින් වෙන්කරවා ගත හැකි දින ගණන ලබා ගැනීම (System Config එකෙන්)
router.get('/advance-days', async (req, res) => {
    try {
        const advanceDays = req.systemConfig?.appointment?.advanceBookingDays || 14;
        res.json({ advanceDays });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 8. එක් පත්වීමක් විස්තර ලබා ගැනීම
router.get('/:id', async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
        res.json(appointment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;