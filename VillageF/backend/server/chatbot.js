// server/chatbot.js
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Gemini Configuration
// Ensure GEMINI_API_KEY is set in your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// System Prompt for Gemini to give it context about VillageFlow
const getSystemPrompt = (lang) => {
    return `
    You are the "VillageFlow AI Assistant", an official AI guide for the VillageFlow Digital Government Services system in Sri Lanka.
    Your goal is to help citizens with information about village-level government services.
    
    VILLAGEFLOW SYSTEM DETAILS:
    - Office Hours: 8:30 AM - 4:15 PM (Monday to Friday). Closed on weekends and public holidays.
    - Contact: Official helpline is 1900. Email is villageflow6@gmail.com.
    - Office Location: Kotagama Grama Niladhari Office, Bibile.
    
    SERVICES & FEES:
    - Residency Certificate: 250 LKR. Requires NIC and Utility Bill (last 3 months).
    - Character Certificate: 200 LKR. Requires NIC.
    - Income Certificate: 300 LKR. Requires NIC and Proof of Income (Payslip).
    - Welfare Services: Aswasuma, Samurdhi, and Elderly Allowance (Age 60+). No application fees.
    - Appointments: Citizens can book appointments online for free via the /appointments section.
    
    INSTRUCTIONS:
    - Respond in the language the user is speaking (${lang === 'si' ? 'Sinhala' : (lang === 'ta' ? 'Tamil' : 'English')}).
    - Be professional, polite, and helpful like a government official.
    - Use emojis to make the chat friendly (🏛️, ✅, 📄, 📅).
    - If the user asks something unrelated to VillageFlow or government services, politely redirect them back to system topics.
    - If you are unsure, advise them to visit the Grama Niladhari office in person.
    `;
};

// Chat endpoint
router.post('/chat', async (req, res) => {
    try {
        let { message, userRole = 'citizen', lang = 'si' } = req.body;

        console.log(`📨 Chat (AI) - Lang: ${lang}, Role: ${userRole}, Msg: "${message?.substring(0, 50)}..."`);

        if (!message || message.trim() === '') {
            return res.json({ success: true, reply: "Please type a question." });
        }

        // Security check for role
        if (userRole !== 'citizen') {
            return res.json({ success: true, reply: "This assistant is currently available for Citizen accounts only." });
        }

        // Verify API Key
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('EXAMPLE')) {
            console.error("❌ GEMINI_API_KEY is missing or invalid in .env");
            return res.json({
                success: true,
                reply: "සමාවන්න, AI සහායකයා දැනට ක්‍රියාත්මක නොවේ. කරුණාකර පසුව නැවත උත්සාහ කරන්න හෝ 1900 අමතන්න."
            });
        }

        // Combine System Prompt with User Message
        const systemPrompt = getSystemPrompt(lang);
        const prompt = `${systemPrompt}\n\nCitizen says: ${message}\n\nAssistant Response:`;

        // Generate Response
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const reply = response.text();

        console.log(`✅ AI Response generated successfully`);
        res.json({ success: true, reply });

    } catch (error) {
        console.error('❌ Gemini Error:', error.message);

        // Use req.body.lang if lang is not yet defined
        const currentLang = req.body.lang || 'si';

        // Return a helpful fallback message if Gemini fails (e.g. quota limit)
        const fallback = currentLang === 'si'
            ? "සමාවන්න, සේවාදායකයේ කාර්යබහුල තාවයක් පවතී. කරුණාකර සුළු මොහොතකින් නැවත උත්සාහ කරන්න."
            : "Sorry, I'm having trouble connecting to my brain right now. Please try again in a moment.";

        res.json({ success: true, reply: fallback });
    }
});

module.exports = router;
