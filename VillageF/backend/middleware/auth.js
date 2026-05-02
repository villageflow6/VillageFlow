const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
        return res.status(401).json({ error: 'සත්‍යාපනය අවශ්‍යයි - Token එක නැත' });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        const decoded = jwt.verify(token, 'villageflow_secret_key');
        
        // Payload එකේ තියෙන්නේ { user: { id, role } } නිසා 
        // req.user එකට කෙලින්ම user object එක ලබා දෙනවා
        req.user = decoded.user; 
        
        console.log("✅ [AUTH] User verified:", req.user.id);
        next();
    } catch (err) {
        console.error("❌ [AUTH] Token Error:", err.message);
        res.status(401).json({ error: 'වලංගු නොවන token එකකි' });
    }
};

module.exports = auth;