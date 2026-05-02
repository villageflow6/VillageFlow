const express = require('express');
const router = express.Router();
const User = require('../models/User'); // ඔයා දැන් එවපු Model එක

// NIC එක පද්ධතියේ තිබේදැයි පරීක්ෂා කිරීම (AI Verification සඳහා)
router.get('/check/:nic', async (req, res) => {
    try {
        const user = await User.findOne({ nic: req.params.nic });
        if (user) {
            // පරිශීලකයා ඉන්නවා නම් එයාගේ නම සහ status එක යවනවා
            res.json({ exists: true, fullName: user.fullName });
        } else {
            res.json({ exists: false });
        }
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

module.exports = router;