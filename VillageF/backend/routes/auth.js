const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 🔐 JWT Secret & Official Key
const JWT_SECRET = "villageflow_secret_key";
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

// 7️⃣ QR Verification Route
router.get('/user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password'); 
        if (!user) return res.status(404).json({ msg: "User not found" });
        res.json(user);
    } catch (err) {
        console.error("QR Verification API Error:", err);
        res.status(500).json({ msg: "Server Error" });
    }
});

module.exports = router;