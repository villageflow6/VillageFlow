const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const AuditLog = require('../models/AuditLog');
const MaintenanceReminder = require('../models/MaintenanceReminder');
const AssetRequest = require('../models/AssetRequest');

// ========== HELPER FUNCTIONS ==========
const calculateDepreciation = (purchaseValue, addedDate) => {
    if (!purchaseValue || !addedDate) return purchaseValue || 0;
    const ageInYears = Math.max(0, (new Date() - new Date(addedDate)) / (1000 * 60 * 60 * 24 * 365));
    return Math.max(0, purchaseValue * (1 - ageInYears * 0.1));
};

const checkAndCreateMaintenanceReminder = async (asset) => {
    const today = new Date();
    const reminders = [];
    
    const lastService = new Date(asset.lastServiceDate || asset.addedDate);
    const monthsSinceService = (today.getFullYear() - lastService.getFullYear()) * 12 + (today.getMonth() - lastService.getMonth());
    
    if (monthsSinceService >= 6 && asset.condition !== 'Damaged') {
        const existing = await MaintenanceReminder.findOne({ 
            assetId: asset._id, 
            reminderType: 'Service Due',
            status: 'pending'
        });
        if (!existing) {
            const reminder = new MaintenanceReminder({
                assetId: asset._id,
                assetName: asset.itemName,
                reminderDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
                reminderType: 'Service Due',
                priority: monthsSinceService >= 12 ? 'high' : 'medium',
                notes: `Last service was on ${lastService.toLocaleDateString()} (${monthsSinceService} months ago)`
            });
            await reminder.save();
            reminders.push(reminder);
        }
    }
    
    if (asset.warrantyExpiry) {
        const warrantyDate = new Date(asset.warrantyExpiry);
        const daysLeft = Math.ceil((warrantyDate - today) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 30 && daysLeft > 0) {
            const existing = await MaintenanceReminder.findOne({
                assetId: asset._id,
                reminderType: 'Warranty Expiry',
                status: 'pending'
            });
            if (!existing) {
                const reminder = new MaintenanceReminder({
                    assetId: asset._id,
                    assetName: asset.itemName,
                    reminderDate: warrantyDate,
                    reminderType: 'Warranty Expiry',
                    priority: daysLeft <= 7 ? 'high' : 'medium',
                    notes: `Warranty expires on ${warrantyDate.toLocaleDateString()} (${daysLeft} days left)`
                });
                await reminder.save();
                reminders.push(reminder);
            }
        }
    }
    
    return reminders;
};

// ========== MAINTENANCE REMINDERS ==========
router.get('/reminders/all', async (req, res) => {
    try {
        const reminders = await MaintenanceReminder.find()
            .sort({ priority: -1, reminderDate: 1 })
            .populate('assetId', 'itemName condition location');
        res.json(reminders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/reminders/pending', async (req, res) => {
    try {
        const pending = await MaintenanceReminder.find({ status: 'pending' })
            .sort({ priority: -1, reminderDate: 1 })
            .populate('assetId', 'itemName condition location');
        res.json(pending);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/reminders/stats', async (req, res) => {
    try {
        const pending = await MaintenanceReminder.countDocuments({ status: 'pending' });
        const highPriority = await MaintenanceReminder.countDocuments({ status: 'pending', priority: 'high' });
        const dueToday = await MaintenanceReminder.countDocuments({ 
            status: 'pending', 
            reminderDate: { $lte: new Date() } 
        });
        res.json({ pending, highPriority, dueToday });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/reminders/:id/resolve', async (req, res) => {
    try {
        const reminder = await MaintenanceReminder.findByIdAndUpdate(
            req.params.id,
            { status: 'resolved', resolvedDate: new Date() },
            { returnDocument: 'after' }
        );
        res.json(reminder);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/reminders/:id/snooze', async (req, res) => {
    try {
        const { days } = req.body;
        const reminder = await MaintenanceReminder.findById(req.params.id);
        if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
        
        reminder.reminderDate = new Date(Date.now() + (days || 7) * 24 * 60 * 60 * 1000);
        reminder.snoozeCount = (reminder.snoozeCount || 0) + 1;
        reminder.status = 'snoozed';
        await reminder.save();
        res.json(reminder);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/reminders/check-all', async (req, res) => {
    try {
        const assets = await Asset.find();
        let allReminders = [];
        for (const asset of assets) {
            const newReminders = await checkAndCreateMaintenanceReminder(asset);
            allReminders = [...allReminders, ...newReminders];
        }
        res.json({ message: `Checked ${assets.length} assets`, newReminders: allReminders.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== ASSET REQUEST SYSTEM - FIXED ==========
router.post('/requests/create', async (req, res) => {
    console.log('📝 Create request endpoint called');
    console.log('Request body:', req.body);
    
    try {
        const { assetId, assetName, requestedBy, requestedByNic, expectedReturnDate, purpose, quantityRequested, notes } = req.body;
        
        // Validation
        if (!assetId || !assetName || !requestedBy || !requestedByNic || !expectedReturnDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const asset = await Asset.findById(assetId);
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        
        if (asset.quantity < quantityRequested) {
            return res.status(400).json({ error: `Only ${asset.quantity} items available` });
        }
        
        if (asset.condition === 'Damaged') {
            return res.status(400).json({ error: 'Cannot borrow damaged asset' });
        }
        
        const existingRequest = await AssetRequest.findOne({
            assetId,
            requestedByNic,
            status: { $in: ['Pending', 'Approved'] }
        });
        
        if (existingRequest) {
            return res.status(400).json({ error: 'You already have a pending/approved request for this asset' });
        }
        
        const newRequest = new AssetRequest({
            assetId,
            assetName,
            requestedBy,
            requestedByNic,
            expectedReturnDate: new Date(expectedReturnDate),
            purpose: purpose || '',
            quantityRequested: quantityRequested || 1,
            notes: notes || '',
            requestDate: new Date(),
            status: 'Pending'
        });
        
        await newRequest.save();
        console.log('✅ Request saved:', newRequest._id);
        
        // Create audit log if AuditLog model exists
        try {
            const AuditLog = require('../models/AuditLog');
            const auditLog = new AuditLog({
                action: `Asset Requested: ${assetName} (Qty: ${quantityRequested}) by ${requestedBy}`,
                officerName: requestedBy,
                targetNic: requestedByNic,
                timestamp: new Date()
            });
            await auditLog.save();
        } catch (err) {
            console.log('Audit log skipped:', err.message);
        }
        
        res.status(201).json({ success: true, request: newRequest });
    } catch (err) {
        console.error('❌ Error in /requests/create:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/requests/all', async (req, res) => {
    try {
        const requests = await AssetRequest.find()
            .sort({ requestDate: -1 })
            .populate('assetId', 'itemName quantity condition location');
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/requests/pending', async (req, res) => {
    try {
        const pending = await AssetRequest.find({ status: 'Pending' })
            .sort({ requestDate: 1 })
            .populate('assetId', 'itemName quantity condition location');
        res.json(pending);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/requests/approved', async (req, res) => {
    try {
        const approved = await AssetRequest.find({ status: 'Approved' })
            .sort({ expectedReturnDate: 1 })
            .populate('assetId', 'itemName quantity condition');
        res.json(approved);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/requests/statistics', async (req, res) => {
    try {
        const pending = await AssetRequest.countDocuments({ status: 'Pending' });
        const approved = await AssetRequest.countDocuments({ status: 'Approved' });
        const rejected = await AssetRequest.countDocuments({ status: 'Rejected' });
        const returned = await AssetRequest.countDocuments({ status: 'Returned' });
        const overdue = await AssetRequest.countDocuments({ status: 'Overdue' });
        
        res.json({ pending, approved, rejected, returned, overdue });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/requests/:id/approve', async (req, res) => {
    try {
        const { approvedBy } = req.body;
        const request = await AssetRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ error: 'Request not found' });
        
        const asset = await Asset.findById(request.assetId);
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        
        if (asset.quantity < request.quantityRequested) {
            return res.status(400).json({ error: `Only ${asset.quantity} items available now` });
        }
        
        request.status = 'Approved';
        request.approvedBy = approvedBy || 'System Admin';
        request.approvedDate = new Date();
        await request.save();
        
        asset.assignedTo = request.requestedBy;
        asset.assignedDate = new Date();
        asset.quantity -= request.quantityRequested;
        await asset.save();
        
        res.json({ success: true, request });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/requests/:id/reject', async (req, res) => {
    try {
        const { rejectedBy, rejectedReason } = req.body;
        const request = await AssetRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ error: 'Request not found' });
        
        request.status = 'Rejected';
        request.rejectedBy = rejectedBy || 'System Admin';
        request.rejectedDate = new Date();
        request.rejectedReason = rejectedReason || '';
        await request.save();
        
        res.json({ success: true, request });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/requests/:id/return', async (req, res) => {
    try {
        const request = await AssetRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ error: 'Request not found' });
        
        request.status = 'Returned';
        request.actualReturnDate = new Date();
        await request.save();
        
        const asset = await Asset.findById(request.assetId);
        if (asset) {
            asset.assignedTo = 'Not Assigned';
            asset.assignedDate = null;
            asset.returnDate = new Date();
            asset.quantity += request.quantityRequested;
            await asset.save();
        }
        
        res.json({ success: true, request });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== BASIC CRUD OPERATIONS ==========
router.get('/all', async (req, res) => {
    try {
        const assets = await Asset.find().sort({ addedDate: -1 });
        res.json(assets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        res.json(asset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/add', async (req, res) => {
    try {
        const { itemName, quantity, condition, location, assignedTo, purchaseValue, category, notes, warrantyExpiry, lastServiceDate } = req.body;
        
        const newAsset = new Asset({ 
            itemName, 
            quantity: parseInt(quantity), 
            condition, 
            location: location || 'Not Specified', 
            assignedTo: assignedTo || 'Not Assigned', 
            purchaseValue: purchaseValue || 0, 
            currentValue: purchaseValue || 0, 
            category: category || 'Office Equipment', 
            notes: notes || '', 
            warrantyExpiry: warrantyExpiry || null, 
            lastServiceDate: lastServiceDate || new Date(),
            addedDate: new Date()
        });
        await newAsset.save();
        
        await checkAndCreateMaintenanceReminder(newAsset);
        
        res.status(201).json(newAsset);
    } catch (err) {
        res.status(500).json({ error: "Failed to add asset: " + err.message });
    }
});

router.put('/update/:id', async (req, res) => {
    try {
        const updatedAsset = await Asset.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
        res.json(updatedAsset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/delete/:id', async (req, res) => {
    try {
        await MaintenanceReminder.deleteMany({ assetId: req.params.id });
        await Asset.findByIdAndDelete(req.params.id);
        res.json({ msg: "Asset deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/statistics/detailed', async (req, res) => {
    try {
        const assets = await Asset.find();
        const totalValue = assets.reduce((sum, a) => sum + (a.currentValue || a.purchaseValue || 0), 0);
        const totalPurchaseValue = assets.reduce((sum, a) => sum + (a.purchaseValue || 0), 0);
        const depreciation = totalPurchaseValue - totalValue;
        const categoryStats = {};
        
        assets.forEach(asset => {
            const cat = asset.category || 'Uncategorized';
            if (!categoryStats[cat]) categoryStats[cat] = { count: 0, value: 0 };
            categoryStats[cat].count++;
            categoryStats[cat].value += (asset.currentValue || asset.purchaseValue || 0);
        });
        
        res.json({ 
            totalAssets: assets.length, 
            totalValue, 
            totalPurchaseValue, 
            depreciation, 
            categoryStats,
            byCondition: { 
                Good: assets.filter(a => a.condition === 'Good').length, 
                Damaged: assets.filter(a => a.condition === 'Damaged').length, 
                NeedRepair: assets.filter(a => a.condition === 'Need Repair').length 
            } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
