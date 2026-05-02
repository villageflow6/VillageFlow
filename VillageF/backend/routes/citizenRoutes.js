const express = require('express');
const router = express.Router();
const User = require('../models/User'); 

// NIC එක පද්ධතියේ තිබේදැයි පරීක්ෂා කිරීම
router.get('/check/:nic', async (req, res) => {
    try {
        const user = await User.findOne({ nic: req.params.nic });
        if (user) {
            res.json({ exists: true, fullName: user.fullName });
        } else {
            res.json({ exists: false });
        }
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

module.exports = router;