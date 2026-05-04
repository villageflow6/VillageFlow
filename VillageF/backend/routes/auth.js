const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 🔐 JWT Secret & Official Key
const JWT_SECRET = process.env.JWT_SECRET || "SL_GOV_VILLAGE_FLOW_2026";
const OFFICIAL_KEY = "SL-GOV-2026";

// ✅ Helper: Age calculation from Date of Birth
const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// ✅ Helper: NIC validation (old & new)
const validateNIC = (nic) => {
    const oldNicPattern = /^[0-9]{9}[VXvx]$/;
    const newNicPattern = /^[0-9]{12}$/;
    return oldNicPattern.test(nic) || newNicPattern.test(nic);
};

// ✅ Helper: Mobile number validation (Sri Lanka)
const validateMobile = (mobile) => {
    const mobilePattern = /^(\+94|0)?[0-9]{9,10}$/;
    return mobilePattern.test(mobile);
};

// 🔍 Validation Function (Updated for Proxy support)
const validateUserData = (data, isProxy = false) => {
    const { 
        fullName, nic, password, district, divisionalSecretariat, gnDivision,
        mobileNumber, dateOfBirth, email, agreeToTerms, role,
        village, city, householdNo, occupation
    } = data;
    let errors = {};

    // Common required fields
    if (!fullName) errors.fullName = "සම්පූර්ණ නම ඇතුළත් කරන්න.";
    if (!nic) errors.nic = "NIC අංකය ඇතුළත් කරන්න.";
    else if (!validateNIC(nic)) errors.nic = "අවලංගු NIC අංකයකි.";
    
    if (!password) errors.password = "මුරපදයක් ඇතුළත් කරන්න.";
    else if (password.length < 4) errors.password = "මුරපදය කෙටියි.";

    if (!mobileNumber) errors.mobileNumber = "ජංගම දුරකථන අංකය ඇතුළත් කරන්න.";
    else if (!validateMobile(mobileNumber)) errors.mobileNumber = "අවලංගු දුරකථන අංකයකි.";

    if (!dateOfBirth) errors.dateOfBirth = "උපන් දිනය ඇතුළත් කරන්න.";
    else {
        const age = calculateAge(dateOfBirth);
        if (age < 18) errors.dateOfBirth = "අවම වයස අවුරුදු 18 ක් විය යුතුයි.";
    }

    // Email validation
    if (!email && !isProxy) errors.email = "විද්‍යුත් තැපෑල ඇතුළත් කරන්න.";
    else if (email && !/\S+@\S+\.\S+/.test(email)) errors.email = "වලංගු විද්‍යුත් තැපෑලක් නොවේ.";

    // Terms check - Only for direct signup
    if (!isProxy && !agreeToTerms) errors.agreeToTerms = "නියමයන් හා කොන්දේසි වලට එකඟ විය යුතුයි.";

    // Location restrictions (only for non-proxy self-registration)
    if (!isProxy) {
        if (!district || district.toLowerCase() !== "monaragala") 
            errors.district = "මොනරාගල දිස්ත්‍රික්කයට පමණක් සීමා වේ.";
        if (!divisionalSecretariat || divisionalSecretariat.toLowerCase() !== "bibile") 
            errors.divisionalSecretariat = "බිබිලේ ප්‍රා.ලේ. කොට්ඨාසයට පමණක් සීමා වේ.";
        if (!gnDivision || gnDivision.toLowerCase() !== "kotagama") 
            errors.gnDivision = "කොටගම වසමට පමණක් සීමා වේ.";
    }

    // Citizen-specific fields (Required only for non-proxy)
    if (role === 'citizen' && !isProxy) {
        if (!village) errors.village = "ගම/වීදිය ඇතුළත් කරන්න.";
        if (!city) errors.city = "නගරය ඇතුළත් කරන්න.";
        if (!householdNo) errors.householdNo = "ගෘහ මූලික අංකය ඇතුළත් කරන්න.";
        if (!occupation) errors.occupation = "රැකියාව ඇතුළත් කරන්න.";
    }
    
    return errors;
};

// 1️⃣ සාමාන්‍ය Register (Self Signup)
router.post('/register', async (req, res) => {
    const errors = validateUserData(req.body);
    if (Object.keys(errors).length > 0) return res.status(400).json({ errors });

    try {
        const { 
            fullName, nic, email, password, role, 
            district, divisionalSecretariat, gnDivision, securityKey,
            age, address, householdNo, gender, mobileNumber, dateOfBirth,
            village, city, occupation, emergencyContact, agreeToTerms
        } = req.body;
        
        let user = await User.findOne({ nic });
        if (user) return res.status(400).json({ errors: { nic: "මෙම NIC අංකය දැනටමත් ඇත." } });

        if (role === 'officer' && securityKey !== OFFICIAL_KEY) {
            return res.status(400).json({ errors: { securityKey: "වැරදි ආරක්ෂිත කේතයකි!" } });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const finalAge = age || calculateAge(dateOfBirth);

        const newUser = new User({ 
            fullName, nic, email, password: hashedPassword, role, 
            district, divisionalSecretariat, gnDivision,
            age: finalAge, address, householdNo, gender, mobileNumber,
            dateOfBirth, village, city, occupation,
            emergencyContact: emergencyContact || null,
            agreedToTerms: agreeToTerms || false
        });

        await newUser.save();
        res.status(201).json({ msg: 'ලියාපදිංචිය සාර්ථකයි!' });
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// 2️⃣ Proxy Register (නිලධාරියා විසින් ලියාපදිංචි කිරීම)
router.post('/proxy-register', async (req, res) => {
    console.log('[PROXY] Register attempt for NIC:', req.body?.nic);
    const errors = validateUserData(req.body, true);
    if (Object.keys(errors).length > 0) return res.status(400).json({ errors });

    try {
        const { 
            fullName, nic, password, officerId, relationship, 
            age, address, householdNo, gender, mobileNumber, dateOfBirth,
            village, city, occupation, emergencyContact, district, divisionalSecretariat, gnDivision
        } = req.body;

        const normalizedNic = (nic || '').trim().toUpperCase();
        const normalizedMobile = (mobileNumber || '').trim();
        const normalizedName = (fullName || '').trim();

        let user = await User.findOne({ nic: normalizedNic });
        if (user) return res.status(400).json({ errors: { nic: "මෙම පුද්ගලයා දැනටමත් ලියාපදිංචි කර ඇත." } });

        const creator = await User.findById(officerId);
        if (!creator) return res.status(404).json({ msg: "ලියාපදිංචි කරන්නා හඳුනාගත නොහැක." });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            fullName: normalizedName,
            nic: normalizedNic,
            email: `proxy_${normalizedNic}@villageflow.lk`, 
            password: hashedPassword, 
            role: 'citizen',
            relationship: relationship || null, 
            age: age || calculateAge(dateOfBirth), 
            address: address || null,
            householdNo: householdNo || null,
            gender: gender || null,
            mobileNumber: normalizedMobile,
            dateOfBirth,
            village: village || null,
            city: city || null,
            occupation: occupation || null,
            emergencyContact: emergencyContact || null,
            agreedToTerms: true, // Proxy registers are pre-agreed by officer
            // Prefer request values; fallback to creator values for compatibility
            district: district || creator.district || 'Monaragala',
            divisionalSecretariat: divisionalSecretariat || creator.divisionalSecretariat || 'Bibile',
            gnDivision: gnDivision || creator.gnDivision || 'Kotagama',
            createdBy: officerId 
        });

        await newUser.save();
        console.log('[PROXY] Register success for NIC:', normalizedNic);
        res.json({ msg: 'ලියාපදිංචිය සාර්ථකයි!' });
    } catch (err) {
        console.error("Proxy Register Error:", err);
        if (err.name === 'ValidationError') {
            const validationErrors = {};
            Object.keys(err.errors || {}).forEach((key) => {
                validationErrors[key] = err.errors[key].message || 'Invalid value';
            });
            return res.status(400).json({ errors: validationErrors });
        }
        if (err.code === 11000) {
            if (err.keyPattern?.nic) return res.status(400).json({ errors: { nic: "මෙම NIC අංකය දැනටමත් ඇත." } });
            if (err.keyPattern?.email) return res.status(400).json({ errors: { email: "මෙම විද්‍යුත් තැපෑල දැනටමත් ඇත." } });
        }
        res.status(500).json({ msg: 'දෝෂයක් සිදුවිය.', error: err.message });
    }
});

// 3️⃣ සියලුම වැසියන්ගේ ලැයිස්තුව ලබා ගැනීම
router.get('/citizens', async (req, res) => {
    try {
        const citizens = await User.find({ role: 'citizen' }).select('-password').sort({ createdAt: -1 });
        res.json(citizens);
    } catch (err) {
        console.error("Fetch Citizens Error:", err);
        res.status(500).json({ msg: "දත්ත ලබාගැනීම අසාර්ථකයි." });
    }
});

// 4️⃣ Login (Fully Synced with Frontend)
router.post('/login', async (req, res) => {
    const { nic, password } = req.body;
    try {
        let user = await User.findOne({ nic });
        if (!user) return res.status(400).json({ errors: { nic: "NIC අංකය වැරදියි!" } });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ errors: { password: "මුරපදය වැරදියි!" } });

        const payload = {
            user: { id: user.id, role: user.role }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) throw err;
                res.json({ 
                    token, 
                    user: {
                        _id: user.id,
                        fullName: user.fullName,
                        nic: user.nic,
                        email: user.email,
                        role: user.role,
                        mobileNumber: user.mobileNumber,
                        dateOfBirth: user.dateOfBirth,
                        village: user.village,
                        city: user.city,
                        householdNo: user.householdNo,
                        occupation: user.occupation,
                        emergencyContact: user.emergencyContact,
                        address: user.address,
                        gender: user.gender,
                        age: user.age,
                        district: user.district,
                        divisionalSecretariat: user.divisionalSecretariat,
                        gnDivision: user.gnDivision
                    }
                });
            }
        );
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// 5️⃣ Update Profile
router.put('/update/:id', async (req, res) => {
    try {
        const { 
            fullName, age, address, householdNo, gender, mobileNumber,
            dateOfBirth, village, city, occupation, emergencyContact
        } = req.body;
        
        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (age) updateData.age = age;
        if (address) updateData.address = address;
        if (householdNo) updateData.householdNo = householdNo;
        if (gender) updateData.gender = gender;
        if (mobileNumber) updateData.mobileNumber = mobileNumber;
        if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
        if (village) updateData.village = village;
        if (city) updateData.city = city;
        if (occupation) updateData.occupation = occupation;
        if (emergencyContact) updateData.emergencyContact = emergencyContact;
        
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updateData }, 
            { returnDocument: 'after', runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ msg: "පරිශීලකයා හමු නොවීය." });
        }

        res.json({ user: updatedUser });
    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).json({ msg: "Update failed" });
    }
});

// 6️⃣ Delete Account
router.delete('/delete/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ msg: "සාර්ථකව ඉවත් කරන ලදී." });
    } catch (err) {
        res.status(500).json({ msg: "Delete failed" });
    }
});

// 7️⃣ QR Verification Route (Supports JSON and HTML for Browser)
router.get('/user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password'); 
        if (!user) return res.status(404).json({ msg: "User not found" });
        
        // If the request comes from a browser (not a JSON request), return a pretty HTML page
        const acceptHeader = req.headers.accept || '';
        const isJsonRequest = acceptHeader.includes('application/json');
        const isBrowser = !isJsonRequest && (acceptHeader.includes('text/html') || acceptHeader.includes('*/*'));
        
        if (isBrowser && !req.xhr && !req.headers['x-requested-with']) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>VillageFlow - Identity Verified</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { font-family: -apple-system, system-ui, sans-serif; background: #0f172a; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; color: white; }
                        .card { background: #1e293b; padding: 2.5rem; borderRadius: 32px; boxShadow: 0 20px 50px rgba(0,0,0,0.5); width: 90%; max-width: 400px; textAlign: center; border: 1px solid rgba(255,255,255,0.1); }
                        .status-badge { display: inline-block; padding: 0.6rem 1.2rem; background: #065f46; color: #34d399; borderRadius: 50px; fontSize: 0.8rem; fontWeight: 800; marginBottom: 1.5rem; letterSpacing: 1px; }
                        .avatar { width: 100px; height: 100px; background: linear-gradient(135deg, #800000, #b91c1c); borderRadius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: white; fontSize: 2.5rem; fontWeight: bold; boxShadow: 0 10px 20px rgba(128,0,0,0.3); }
                        h1 { margin: 0; fontSize: 1.8rem; fontWeight: 800; }
                        p { color: #94a3b8; margin: 0.5rem 0; fontSize: 1.1rem; }
                        .details { marginTop: 2rem; paddingTop: 2rem; borderTop: 1px solid rgba(255,255,255,0.1); display: grid; gap: 1rem; }
                        .detail-item { display: flex; justifyContent: space-between; fontSize: 0.9rem; }
                        .label { color: #64748b; fontWeight: 600; }
                        .val { color: #f1f5f9; fontWeight: 700; }
                        .footer { marginTop: 2.5rem; fontSize: 0.75rem; color: #475569; letterSpacing: 0.5px; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="status-badge">✓ REGISTERED CITIZEN</div>
                        <div class="avatar">${user.fullName.charAt(0)}</div>
                        <h1>${user.fullName}</h1>
                        <p>${user.gnDivision} Division</p>
                        
                        <div class="details">
                            <div class="detail-item"><span class="label">NIC</span> <span class="val">${user.nic}</span></div>
                            <div class="detail-item"><span class="label">STATUS</span> <span class="val" style="color: #34d399">ACTIVE</span></div>
                        </div>
                        
                        <div class="footer">OFFICIAL VILLAGEFLOW IDENTITY PORTAL</div>
                    </div>
                </body>
                </html>
            `);
        }

        res.json(user);
    } catch (err) {
        console.error("QR Verification API Error:", err);
        res.status(500).json({ msg: "Server Error" });
    }
});

module.exports = router;
