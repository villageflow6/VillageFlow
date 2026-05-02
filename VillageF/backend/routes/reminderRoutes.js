const express = require('express');
const router = express.Router();
const MaintenanceReminder = require('../models/MaintenanceReminder');
const Asset = require('../models/Asset');

router.get('/all', async (req, res) => {
    try {
        const reminders = await MaintenanceReminder.find().sort({ reminderDate: 1 });
        res.json(reminders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/pending', async (req, res) => {
    try {
        const pending = await MaintenanceReminder.find({ isSent: false }).sort({ reminderDate: 1 });
        res.json(pending);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/mark-sent/:id', async (req, res) => {
    try {
        const reminder = await MaintenanceReminder.findByIdAndUpdate(req.params.id, { isSent: true, sentDate: new Date() }, { returnDocument: 'after' });
        res.json(reminder);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/auto-check', async (req, res) => {
    try {
        const assets = await Asset.find();
        const today = new Date();
        const newReminders = [];
        for (const asset of assets) {
            const lastService = new Date(asset.lastServiceDate || asset.addedDate);
            const daysSinceService = Math.ceil((today - lastService) / (1000 * 60 * 60 * 24));
            if (daysSinceService > 180 && asset.condition !== 'Damaged') {
                const existingReminder = await MaintenanceReminder.findOne({ assetId: asset._id, reminderType: 'Service Due', isSent: false });
                if (!existingReminder) {
                    const reminder = new MaintenanceReminder({ assetId: asset._id, assetName: asset.itemName, reminderDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), reminderType: 'Service Due', notes: `Last service was on ${(asset.lastServiceDate || asset.addedDate).toLocaleDateString()} (${daysSinceService} days ago)` });
                    await reminder.save();
                    newReminders.push(reminder);
                }
            }
        }
        res.json({ message: `${newReminders.length} new reminders created`, reminders: newReminders });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
