import React, { useState, useEffect, useContext } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    ActivityIndicator, Alert, TextInput, Dimensions,
    Modal, Image
} from 'react-native';
import { 
    FileText, ShieldCheck, Clock, Check, X, 
    Upload, ChevronRight, History, Award, ShieldAlert,
    Download, User, Calendar, Info, FileSearch, PlusCircle,
    Edit3, Trash2, CreditCard
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { AuthContext } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import api from '../../services/api';

const { width } = Dimensions.get('window');

const SRI_LANKAN_BANKS = [
    'People\'s Bank', 'Bank of Ceylon', 'Commercial Bank', 'Sampath Bank', 
    'HNB', 'Seylan Bank', 'NDB Bank', 'DFCC Bank', 'Nations Trust Bank'
];

const MOBILE_PROVIDERS = [
    { name: 'Dialog', color: '#e31e24' },
    { name: 'Mobitel', color: '#00a651' },
    { name: 'Hutch', color: '#ff6600' },
    { name: 'Airtel', color: '#ed1c24' }
];

const CERT_TYPES = [
    'Residency Certificate', 'Income Certificate', 
    'Character Certificate', 'Birth Certificate Copy'
];

const translations = {
    en: {
        title: "Certificates", apply: "Request New", history: "My Requests",
        type: "Select Type", for: "Applying for", self: "Myself", family: "Family Member",
        child: "Child (Under 18)", upload: "Upload Proof Document", proceed: "Continue to Payment",
        upload: "Upload Proof Document", proceed: "Continue to Payment",
        historyTitle: "Application History", empty: "No applications found",
        status: "Status", date: "Applied on", nicLabel: "Relative's NIC",
        payment: "Administrative Fee", total: "Total Payable", payNow: "Secure Payment",
        download: "Download Certificate",
        validation: {
            nic: "Please enter relative's NIC",
            relationship: "Please specify relationship",
            file: "Please upload a proof document"
        },
        cardValidation: {
            invalidNumber: "Invalid card number",
            invalidExpiry: "Invalid expiry date",
            invalidCvv: "Invalid CVV"
        },
        timeline: { applied: "Submitted", review: "Reviewing", final: "Result" },
        actions: { delete: "Cancel", edit: "Edit", confirmDelete: "Are you sure you want to cancel this application?" },
        labels: { relationship: "Relationship", occupation: "Occupation", household: "Household No" }
    },
    si: {
        title: "සහතික පත්‍ර", apply: "අයදුම් කරන්න", history: "මගේ අයදුම්පත්",
        type: "වර්ගය තෝරන්න", for: "අයදුම් කරන්නේ", self: "මටම", family: "පවුලේ සාමාජිකයෙකුට",
        child: "දරුවෙකු සඳහා", upload: "සාක්ෂි ලේඛනය උඩුගත කරන්න", proceed: "ගෙවීම් වෙත යන්න",
        historyTitle: "අයදුම්පත් ඉතිහාසය", empty: "අයදුම්පත් හමු නොවීය",
        status: "තත්වය", date: "අයදුම් කළ දිනය", nicLabel: "සාමාජිකයාගේ NIC",
        payment: "පරිපාලන ගාස්තුව", total: "ගෙවිය යුතු මුළු මුදල", payNow: "ගෙවීම් සිදු කරන්න",
        download: "සහතිකය බාගන්න",
        validation: {
            nic: "සාමාජිකයාගේ NIC අංකය ඇතුළත් කරන්න",
            relationship: "සම්බන්ධතාවය සඳහන් කරන්න",
            file: "සාක්ෂි ලේඛනයක් ඇතුළත් කරන්න"
        },
        cardValidation: {
            invalidNumber: "කාඩ් අංකය වැරදියි",
            invalidExpiry: "දිනය වැරදියි",
            invalidCvv: "CVV වැරදියි"
        },
        timeline: { applied: "යොමු කළා", review: "පරීක්ෂාව", final: "ප්‍රතිඵලය" },
        actions: { delete: "අවලංගු කරන්න", edit: "සංස්කරණය", confirmDelete: "ඔබට මෙම අයදුම්පත අවලංගු කිරීමට අවශ්‍යද?" },
        labels: { relationship: "සම්බන්ධතාවය", occupation: "රැකියාව", household: "නිවාස අංකය" }
    },
    ta: {
        title: "சான்றிதழ்கள்", apply: "விண்ணப்பிக்க", history: "விண்ணப்பங்கள்",
        type: "வகையைத் தேர்ந்தெடுக்கவும்", for: "விண்ணப்பிப்பது", self: "எனக்காக", family: "குடும்ப உறுப்பினர்",
        child: "குழந்தை (18 கீழ்)", upload: "ஆவணத்தைப் பதிவேற்றவும்", proceed: "பணம் செலுத்த தொடரவும்",
        historyTitle: "விண்ணப்ப வரலாறு", empty: "விண்ணப்பங்கள் எதுவும் இல்லை",
        status: "நிலை", date: "தேதி", nicLabel: "உறுப்பினரின் NIC",
        payment: "நிர்வாகக் கட்டணம்", total: "மொத்த தொகை", payNow: "பணம் செலுத்துங்கள்",
        download: "பதிவிறக்கம்",
        validation: {
            nic: "NIC எண்ணை உள்ளிடவும்",
            relationship: "உறவை குறிப்பிடவும்",
            file: "ஆவணத்தை பதிவேற்றவும்"
        },
        cardValidation: {
            invalidNumber: "அட்டை எண் தவறானது",
            invalidExpiry: "காலாவதி தேதி தவறானது",
            invalidCvv: "CVV தவறானது"
        },
        timeline: { applied: "சமர்ப்பிக்கப்பட்டது", review: "மதிப்பாய்வு", final: "முடிவு" },
        actions: { delete: "ரத்து செய்", edit: "திருத்து", confirmDelete: "இந்த விண்ணப்பத்தை ரத்து செய்ய விரும்புகிறீர்களா?" },
        labels: { relationship: "உறவு", occupation: "தொழில்", household: "வீட்டு எண்" }
    }
};

export default function CertificatesScreen() {
    const { user } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('apply');
    const [certType, setCertType] = useState(CERT_TYPES[0]);
    const [applyFor, setApplyFor] = useState('Self');
    const [nic, setNic] = useState('');
    const [relationship, setRelationship] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [paymentMode, setPaymentMode] = useState(false);
    const [errors, setErrors] = useState({});
    const [verifyingMember, setVerifyingMember] = useState(false);
    const [verifiedMemberName, setVerifiedMemberName] = useState('');
    const [nicDetails, setNicDetails] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('Card');
    const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '', name: '' });
    const [bankData, setBankData] = useState({ bank: 'People\'s Bank', account: '', holder: '' });
    const [mobileData, setMobileData] = useState({ provider: 'Dialog', number: '', pin: '' });
    const [offlineReceipt, setOfflineReceipt] = useState('');
    const [lang, setLang] = useState('en');
    const [editingId, setEditingId] = useState(null);
    const [originalCertType, setOriginalCertType] = useState(null);
    const t = translations[lang];

    useEffect(() => {
        if (activeTab === 'history') fetchHistory();
    }, [activeTab]);

    const validateNIC = (nic) => {
        const cleaned = nic.trim().toUpperCase();
        const oldNic = /^[0-9]{9}[vVxX]$/;
        const newNic = /^[0-9]{12}$/;
        if (oldNic.test(cleaned) || newNic.test(cleaned)) {
            const year = cleaned.length === 10 ? 1900 + parseInt(cleaned.substring(0, 2)) : parseInt(cleaned.substring(0, 4));
            const days = parseInt(cleaned.substring(cleaned.length === 10 ? 2 : 4, cleaned.length === 10 ? 5 : 7));
            const gender = days > 500 ? 'Female' : 'Male';
            return { year, gender, type: cleaned.length === 10 ? 'old' : 'new' };
        }
        return null;
    };

    const handleNicChange = (val) => {
        const cleaned = val.replace(/\s/g, '');
        setNic(cleaned);
        setNicDetails(validateNIC(cleaned));
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/certificates/user/${user?._id || user?.id}`);
            setHistory(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const verifyMember = async () => {
        if (!nic) return Alert.alert("Error", t.validation.nic);
        setVerifyingMember(true);
        setVerifiedMemberName('');
        try {
            const res = await api.get(`/auth/citizens`);
            const member = res.data.find(c => c.nic === nic);
            if (member) {
                setVerifiedMemberName(member.fullName);
            } else {
                Alert.alert("Error", "Member not found in system registry.");
            }
        } catch (err) {
            Alert.alert("Error", "Verification failed.");
        } finally {
            setVerifyingMember(false);
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
            });
            if (!result.canceled) setSelectedFile(result.assets[0]);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDownload = async (item) => {
        try {
            setLoading(true);
            const htmlContent = `
                <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #1e293b; }
                        .border { border: 15px solid #800000; padding: 30px; border-double: double; height: 90%; position: relative; }
                        .inner-border { border: 2px solid #fbc531; padding: 20px; height: 98%; }
                        .header { text-align: center; margin-bottom: 40px; }
                        .gov-title { color: #800000; font-size: 24px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                        .dept-title { color: #64748b; font-size: 16px; margin-bottom: 20px; }
                        .cert-name { font-size: 32px; font-weight: bold; color: #1e293b; margin: 30px 0; border-bottom: 2px solid #e2e8f0; display: inline-block; padding-bottom: 10px; }
                        .content { line-height: 1.8; font-size: 18px; text-align: center; }
                        .details { margin: 40px auto; width: 80%; text-align: left; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 5px; }
                        .label { font-weight: bold; color: #64748b; }
                        .val { color: #1e293b; }
                        .footer { margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; }
                        .signature { text-align: center; border-top: 1px solid #1e293b; width: 200px; padding-top: 10px; font-size: 14px; }
                        .seal { width: 100px; height: 100px; border: 4px double #800000; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #800000; font-weight: bold; transform: rotate(-15deg); font-size: 10px; text-align: center; opacity: 0.6; }
                        .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; color: rgba(128, 0, 0, 0.05); white-space: nowrap; font-weight: bold; pointer-events: none; }
                    </style>
                </head>
                <body>
                    <div class="border">
                        <div class="inner-border">
                            <div class="watermark">VILLAGEFLOW OFFICIAL</div>
                            <div class="header">
                                <div class="gov-title">Democratic Socialist Republic of Sri Lanka</div>
                                <div class="dept-title">VillageFlow Government Portal - Digital Services</div>
                                <div class="cert-name">${item.certificateType}</div>
                            </div>
                            
                            <div class="content">
                                <p>This is to certify that</p>
                                <h2 style="color: #800000; margin: 10px 0;">${item.memberName || 'Self'}</h2>
                                <p>holding NIC / Registration Number</p>
                                <h3 style="margin: 10px 0;">${item.nic}</h3>
                                <p>has successfully completed the application process for the aforementioned certificate.</p>
                            </div>

                            <div class="details">
                                <div class="row"><span class="label">Application ID:</span> <span class="val">${item._id || item.id}</span></div>
                                <div class="row"><span class="label">Issue Date:</span> <span class="val">${new Date(item.createdAt).toLocaleDateString()}</span></div>
                                <div class="row"><span class="label">Verification Code:</span> <span class="val">VF-${item.nic.substring(0,4)}-${Math.floor(1000 + Math.random() * 9000)}</span></div>
                                <div class="row"><span class="label">Payment Status:</span> <span class="val" style="color: green; font-weight: bold;">VERIFIED</span></div>
                            </div>

                            <div class="footer">
                                <div class="seal">OFFICIAL SEAL<br>VILLAGEFLOW<br>GN DIVISION</div>
                                <div class="signature">
                                    <strong>Grama Niladhari</strong><br>
                                    Authorized Officer Signature<br>
                                    (Digitally Signed)
                                </div>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (err) {
            console.error("PDF Error:", err);
            Alert.alert("Error", "Could not generate professional PDF certificate.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id) => {
        Alert.alert(
            t.actions.delete,
            t.actions.confirmDelete,
            [
                { text: "No", style: "cancel" },
                { text: "Yes", onPress: async () => {
                    try {
                        await api.delete(`/certificates/delete/${id}`);
                        fetchHistory();
                        Alert.alert("Success", "Application deleted.");
                    } catch (err) {
                        Alert.alert("Error", "Failed to delete.");
                    }
                }}
            ]
        );
    };

    const handleEdit = (item) => {
        setEditingId(item._id || item.id);
        setOriginalCertType(item.certificateType);
        setCertType(item.certificateType);
        setApplyFor(item.applyFor);
        setNic(item.applyFor === 'Self' ? '' : item.nic);
        setVerifiedMemberName(item.memberName === 'Self' ? '' : item.memberName);
        setRelationship(item.relationship === 'Self' ? '' : item.relationship);
        setActiveTab('apply');
        setPaymentMode(false);
    };

    const validateForm = () => {
        let newErrors = {};
        if (applyFor === 'Family') {
            if (!nic) newErrors.nic = t.validation.nic;
            else if (!nicDetails) newErrors.nic = "Invalid NIC format";
            if (!relationship) newErrors.relationship = t.validation.relationship;
        } else if (applyFor === 'Child') {
            if (!nic) newErrors.nic = "Birth Cert No required";
            if (!relationship) newErrors.relationship = "Relation required";
        }
        if (!editingId && !selectedFile && activeTab === 'apply') newErrors.file = t.validation.file;
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validatePaymentForm = () => {
        let pErrors = {};
        if (paymentMethod === 'Card') {
            const cleanNum = cardData.number.replace(/\s/g, '');
            if (!/^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})$/.test(cleanNum)) {
                pErrors.cardNumber = "Invalid Visa/Mastercard number";
            }
            if (!/^\d{2}\/\d{2}$/.test(cardData.expiry)) {
                pErrors.cardExpiry = "Format MM/YY";
            } else {
                const [m, y] = cardData.expiry.split('/').map(Number);
                const now = new Date();
                const expDate = new Date(2000 + y, m - 1);
                if (m < 1 || m > 12 || expDate < now) pErrors.cardExpiry = "Card expired";
            }
            if (!/^\d{3}$/.test(cardData.cvv)) pErrors.cardCvv = "3 digits required";
            if (!cardData.name || cardData.name.length < 3) pErrors.cardName = "Invalid name";
        } else if (paymentMethod === 'Bank') {
            if (!/^\d{8,15}$/.test(bankData.account)) pErrors.bankAccount = "8-15 digits required";
            if (!bankData.holder || bankData.holder.length < 3) pErrors.bankHolder = "Enter full name";
        } else if (paymentMethod === 'Mobile') {
            // Sri Lankan Mobile: 07(0|1|2|4|5|6|7|8) followed by 7 digits
            if (!/^07(0|1|2|4|5|6|7|8)\d{7}$/.test(mobileData.number)) {
                pErrors.mobileNumber = "Invalid SL mobile number";
            }
            if (!/^\d{4,6}$/.test(mobileData.pin)) pErrors.mobilePin = "4-6 digit PIN required";
        } else if (paymentMethod === 'Cash') {
            if (!offlineReceipt || !offlineReceipt.startsWith('GN/')) {
                pErrors.receipt = "Format: GN/RCPT/2024/001";
            }
        }
        setErrors(pErrors);
        return Object.keys(pErrors).length === 0;
    };

    const handleApply = () => {
        if (!validateForm()) return;
        
        if (applyFor === 'Family' && !verifiedMemberName) {
            return Alert.alert("Wait", "Please verify the member NIC first.");
        }
        
        // Check for duplicate pending application
        const existing = history.find(app => 
            app.certificateType === certType && 
            app.status === 'Pending' && 
            (applyFor === 'Self' ? app.nic === user.nic : app.nic === nic)
        );
        
        if (existing && !editingId) {
            Alert.alert(
                "Duplicate Application",
                "You already have a pending request for this certificate.",
                [
                    { text: "Go to History", onPress: () => { setActiveTab('history'); } },
                    { text: "OK", style: "cancel" }
                ]
            );
            return;
        }
        
        if (editingId) {
            if (certType === originalCertType) {
                confirmAndSubmit();
                return;
            } else {
                Alert.alert(
                    "Type Changed",
                    "Changing the certificate type requires a new payment. Your previous payment will be refunded.",
                    [
                        { text: "Cancel", style: "cancel" },
                        { text: "Continue", onPress: () => setPaymentMode(true) }
                    ]
                );
                return;
            }
        }

        setPaymentMode(true);
    };

    const confirmAndSubmit = async () => {
        const isNewPaymentNeeded = !editingId || certType !== originalCertType;
        if (isNewPaymentNeeded && !validatePaymentForm()) {
            Alert.alert("Incomplete Data", "Please fill in all payment details correctly.");
            return;
        }
        console.log("🚀 Submitting Form Data:", {
            certType, applyFor, nic, memberName: verifiedMemberName, 
            relationship, selectedFile: selectedFile?.name
        });
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('certificateType', certType);
            formData.append('applyFor', applyFor === 'Child' ? 'Family' : applyFor);
            formData.append('nic', applyFor === 'Self' ? user.nic : nic);
            formData.append('memberName', applyFor === 'Self' ? user.fullName : verifiedMemberName);
            formData.append('relationship', applyFor === 'Self' ? 'Self' : relationship);
            
            if (editingId) {
                // For updates, we don't need to send payment details again
                // but we keep the status as completed
                formData.append('paymentStatus', 'completed');
            } else {
                formData.append('paymentStatus', 'completed');
                formData.append('paymentMethod', paymentMethod === 'Cash' ? 'offline' : paymentMethod.toLowerCase());
                formData.append('paymentAmount', '250');
                formData.append('transactionId', `MOB-${Date.now()}`);
            }
            formData.append('userId', user._id || user.id);

            if (selectedFile) {
                // Handle Web vs Native
                if (selectedFile.file) {
                    // WEB: Use the File object directly
                    formData.append('utilityBill', selectedFile.file);
                } else {
                    // NATIVE: Use the {uri, name, type} object
                    formData.append('utilityBill', {
                        uri: selectedFile.uri,
                        name: selectedFile.name || 'document.pdf',
                        type: selectedFile.mimeType || 'application/octet-stream'
                    });
                }
            }

            if (editingId) {
                // If type changed, we send new payment info
                if (certType !== originalCertType) {
                    formData.append('paymentMethod', paymentMethod === 'Cash' ? 'offline' : paymentMethod.toLowerCase());
                    formData.append('transactionId', `RESUB-${Date.now()}`);
                    formData.append('paymentAmount', '250');
                    formData.append('refundPrevious', 'true'); 
                }
                await api.put(`/certificates/update/${editingId}`, formData);
            } else {
                await api.post('/certificates/apply', formData);
            }
            
            Alert.alert("Success", editingId ? "Updated successfully!" : "Submitted successfully!");
            setPaymentMode(false);
            setEditingId(null);
            setActiveTab('history');
            resetForm();
        } catch (err) {
            console.error("Submission Error:", err.response?.data || err.message);
            const errorMsg = err.response?.data?.error || "Submission failed";
            
            if (errorMsg.includes("already have a pending application")) {
                Alert.alert(
                    "Duplicate Application",
                    "You already have a pending request for this certificate. Please check your history tab to track its status.",
                    [
                        { text: "Go to History", onPress: () => { setPaymentMode(false); setActiveTab('history'); } },
                        { text: "OK", style: "cancel" }
                    ]
                );
            } else {
                Alert.alert("Submission Failed", errorMsg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setNic('');
        setRelationship('');
        setSelectedFile(null);
        setErrors({});
        setVerifiedMemberName('');
        setNicDetails(null);
        setEditingId(null);
        setOriginalCertType(null);
        setCardData({ number: '', expiry: '', cvv: '', name: '' });
        setBankData({ bank: 'People\'s Bank', account: '', holder: '' });
        setMobileData({ provider: 'Dialog', number: '', pin: '' });
        setOfflineReceipt('');
    };

    const StatusTracker = ({ status }) => {
        const steps = [
            { label: t.timeline.applied, icon: <FileText size={12} color="#fff" /> },
            { label: t.timeline.review, icon: <Info size={12} color="#fff" /> },
            { label: status === 'Rejected' ? 'Denied' : 'Done', icon: status === 'Approved' ? <Check size={12} color="#fff" /> : status === 'Rejected' ? <X size={12} color="#fff" /> : <Clock size={12} color="#fff" /> }
        ];

        const activeIndex = status === 'Pending' ? 1 : (status === 'Approved' || status === 'Rejected') ? 2 : 0;

        return (
            <View style={styles.trackerContainer}>
                {steps.map((step, i) => (
                    <View key={i} style={styles.stepWrapper}>
                        <View style={[styles.stepCircle, { backgroundColor: i <= activeIndex ? (status === 'Rejected' && i === 2 ? '#ef4444' : '#800000') : '#e2e8f0' }]}>
                            {step.icon}
                        </View>
                        <Text style={[styles.stepLabel, { color: i <= activeIndex ? '#1e293b' : '#94a3b8' }]}>{step.label}</Text>
                        {i < steps.length - 1 && (
                            <View style={[styles.stepLine, { backgroundColor: i < activeIndex ? '#800000' : '#e2e8f0' }]} />
                        )}
                    </View>
                ))}
            </View>
        );
    };

    const renderApplication = ({ item }) => {
        const statusColor = item.status === 'Approved' ? '#10b981' : item.status === 'Rejected' ? '#ef4444' : '#f59e0b';
        return (
            <View key={item._id || item.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                    <View style={styles.historyIconBox}>
                        <Award size={22} color="#800000" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.historyType}>{item.certificateType}</Text>
                        <Text style={styles.historyDate}>{t.date}: {new Date(item.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.actionRowMini}>
                        {(item.status === 'Pending' || item.status === 'Rejected') && (
                            <>
                                <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionIcon}><Edit3 size={18} color="#64748b" /></TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(item._id || item.id)} style={styles.actionIcon}><Trash2 size={18} color="#ef4444" /></TouchableOpacity>
                            </>
                        )}
                        <View style={[styles.statusBadgeMini, { backgroundColor: `${statusColor}15` }]}>
                            <Text style={[styles.statusTextMini, { color: statusColor }]}>{item.status}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.historyPayInfo}>
                    <CreditCard size={12} color="#64748b" />
                    <Text style={styles.historyPayText}>
                        {item.paymentMethod ? item.paymentMethod.toUpperCase() : 'N/A'} • 
                        LKR {item.paymentAmount || '250'}.00 • 
                        <Text style={{color: item.paymentStatus === 'completed' ? '#10b981' : '#f59e0b', fontWeight: 'bold'}}>
                            {item.paymentStatus ? item.paymentStatus.toUpperCase() : 'PENDING'}
                        </Text>
                    </Text>
                </View>

                <StatusTracker status={item.status} />

                {item.status === 'Rejected' && item.rejectReason && (
                    <View style={styles.rejectBox}>
                        <ShieldAlert size={14} color="#ef4444" />
                        <Text style={styles.rejectText}>{item.rejectReason}</Text>
                    </View>
                )}
                
                {item.status === 'Approved' && (
                    <TouchableOpacity style={styles.downloadBtn} onPress={() => handleDownload(item)}>
                        <Download size={16} color="#800000" />
                        <Text style={styles.downloadBtnText}>{t.download}</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>{t.title}</Text>
                    <Text style={styles.headerSub}>Official Government Portal</Text>
                </View>
                <View style={styles.langSelector}>
                    <TouchableOpacity onPress={() => setLang('si')} style={[styles.langBtn, lang === 'si' && styles.langBtnActive]}><Text style={styles.langText}>SI</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setLang('en')} style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}><Text style={styles.langText}>EN</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setLang('ta')} style={[styles.langBtn, lang === 'ta' && styles.langBtnActive]}><Text style={styles.langText}>TA</Text></TouchableOpacity>
                </View>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity style={[styles.tab, activeTab === 'apply' && styles.activeTab]} onPress={() => { setActiveTab('apply'); setPaymentMode(false); }}>
                    <PlusCircle size={18} color={activeTab === 'apply' ? '#800000' : '#94a3b8'} />
                    <Text style={[styles.tabText, activeTab === 'apply' && styles.activeTabText]}>{t.apply}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'history' && styles.activeTab]} onPress={() => setActiveTab('history')}>
                    <History size={18} color={activeTab === 'history' ? '#800000' : '#94a3b8'} />
                    <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>{t.history}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollPadding}>
                {activeTab === 'apply' ? (
                    paymentMode ? (
                        <View style={styles.paymentCard}>
                            <View style={styles.paymentHeader}>
                                <ShieldCheck size={50} color="#800000" />
                                <Text style={styles.paymentTitle}>{t.payNow}</Text>
                            </View>
                            
                            <View style={styles.methodSelector}>
                                {['Card', 'Bank', 'Mobile', 'Cash'].map(m => (
                                    <TouchableOpacity 
                                        key={m} 
                                        style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]}
                                        onPress={() => setPaymentMethod(m)}
                                    >
                                        <Text style={[styles.methodText, paymentMethod === m && styles.methodTextActive]}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.payDetails}>
                                <View style={styles.payRow}><Text style={styles.payLabel}>Service</Text><Text style={styles.payVal}>{certType}</Text></View>
                                <View style={styles.payRow}><Text style={styles.payLabel}>{t.payment}</Text><Text style={styles.payVal}>LKR 250.00</Text></View>
                                
                                {paymentMethod === 'Card' && (
                                    <View style={styles.cardForm}>
                                        <TextInput 
                                            style={[styles.input, errors.cardNumber && styles.errorBorder]} 
                                            placeholder="Card Number (16 digits)" 
                                            keyboardType="numeric" 
                                            maxLength={19}
                                            value={cardData.number}
                                            onChangeText={v => setCardData({...cardData, number: v.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim()})}
                                        />
                                        <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
                                            <TextInput 
                                                style={[styles.input, {flex: 1}, errors.cardExpiry && styles.errorBorder]} 
                                                placeholder="MM/YY" 
                                                maxLength={5}
                                                value={cardData.expiry}
                                                onChangeText={v => setCardData({...cardData, expiry: v})}
                                            />
                                            <TextInput 
                                                style={[styles.input, {flex: 1}, errors.cardCvv && styles.errorBorder]} 
                                                placeholder="CVV" 
                                                maxLength={3}
                                                secureTextEntry
                                                value={cardData.cvv}
                                                onChangeText={v => setCardData({...cardData, cvv: v})}
                                            />
                                        </View>
                                        <TextInput 
                                            style={[styles.input, {marginTop: 10}, errors.cardName && styles.errorBorder]} 
                                            placeholder="Cardholder Name" 
                                            value={cardData.name}
                                            onChangeText={v => setCardData({...cardData, name: v})}
                                        />
                                        {Object.keys(errors).some(k => k.startsWith('card')) && (
                                            <Text style={styles.errorText}>Please complete payment details correctly.</Text>
                                        )}
                                    </View>
                                )}

                                {paymentMethod === 'Bank' && (
                                    <View style={styles.cardForm}>
                                        <Text style={styles.label}>Select Bank</Text>
                                        <View style={styles.typeGrid}>
                                            {SRI_LANKAN_BANKS.slice(0, 4).map(b => (
                                                <TouchableOpacity key={b} style={[styles.miniBtn, bankData.bank === b && styles.miniBtnActive]} onPress={() => setBankData({...bankData, bank: b})}>
                                                    <Text style={[styles.miniBtnText, bankData.bank === b && styles.miniBtnTextActive]}>{b}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        <TextInput style={[styles.input, {marginTop: 10}, errors.bankAccount && styles.errorBorder]} placeholder="Account Number" keyboardType="numeric" value={bankData.account} onChangeText={v => setBankData({...bankData, account: v})} />
                                        <TextInput style={[styles.input, {marginTop: 10}, errors.bankHolder && styles.errorBorder]} placeholder="Account Holder Name" value={bankData.holder} onChangeText={v => setBankData({...bankData, holder: v.toUpperCase()})} />
                                    </View>
                                )}

                                {paymentMethod === 'Mobile' && (
                                    <View style={styles.cardForm}>
                                        <View style={styles.providerRow}>
                                            {MOBILE_PROVIDERS.map(p => (
                                                <TouchableOpacity key={p.name} style={[styles.providerBtn, mobileData.provider === p.name && {backgroundColor: p.color, borderColor: p.color}]} onPress={() => setMobileData({...mobileData, provider: p.name})}>
                                                    <Text style={[styles.providerText, mobileData.provider === p.name && {color: '#fff'}]}>{p.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        <TextInput style={[styles.input, {marginTop: 10}, errors.mobileNumber && styles.errorBorder]} placeholder="Mobile Number (07...)" keyboardType="numeric" maxLength={10} value={mobileData.number} onChangeText={v => setMobileData({...mobileData, number: v})} />
                                        <TextInput style={[styles.input, {marginTop: 10}, errors.mobilePin && styles.errorBorder]} placeholder="Mobile PIN" keyboardType="numeric" maxLength={4} secureTextEntry value={mobileData.pin} onChangeText={v => setMobileData({...mobileData, pin: v})} />
                                    </View>
                                )}

                                {paymentMethod === 'Cash' && (
                                    <View style={styles.cardForm}>
                                        <View style={styles.infoBox}>
                                            <Info size={18} color="#800000" />
                                            <Text style={styles.infoTextMain}>Please pay at your local Grama Niladhari office and enter the physical receipt number below.</Text>
                                        </View>
                                        <TextInput style={[styles.input, {marginTop: 10}, errors.receipt && styles.errorBorder]} placeholder="Receipt No: GN/RCPT/..." value={offlineReceipt} onChangeText={setOfflineReceipt} />
                                    </View>
                                )}

                                <View style={[styles.payRow, { marginTop: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15 }]}><Text style={styles.payLabelBold}>{t.total}</Text><Text style={styles.payValPrice}>LKR 250.00</Text></View>
                            </View>
                            <TouchableOpacity style={styles.btnPrimary} onPress={confirmAndSubmit} disabled={submitting}>
                                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>{t.payNow} with {paymentMethod}</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnSecondary} onPress={() => setPaymentMode(false)}><Text style={styles.btnSecondaryText}>Go Back</Text></TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.formContainer}>
                            <Text style={styles.label}>{t.type}</Text>
                            <View style={styles.typeGrid}>
                                {CERT_TYPES.map(type => (
                                    <TouchableOpacity 
                                        key={type} 
                                        style={[styles.typeBtn, certType === type && styles.typeBtnActive]}
                                        onPress={() => setCertType(type)}
                                    >
                                        <Text style={[styles.typeText, certType === type && styles.typeTextActive]}>{type}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>{t.for}</Text>
                            <View style={styles.roleToggle}>
                                <TouchableOpacity style={[styles.roleBtn, applyFor === 'Self' && styles.activeRoleBtn]} onPress={() => setApplyFor('Self')}><Text style={[styles.roleBtnText, applyFor === 'Self' && styles.activeRoleBtnText]}>{t.self}</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.roleBtn, applyFor === 'Family' && styles.activeRoleBtn]} onPress={() => setApplyFor('Family')}><Text style={[styles.roleBtnText, applyFor === 'Family' && styles.activeRoleBtnText]}>{t.family}</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.roleBtn, applyFor === 'Child' && styles.activeRoleBtn]} onPress={() => setApplyFor('Child')}><Text style={[styles.roleBtnText, applyFor === 'Child' && styles.activeRoleBtnText]}>{t.child}</Text></TouchableOpacity>
                            </View>

                            {(applyFor === 'Family' || applyFor === 'Child') && (
                                <View style={styles.familyForm}>
                                    <Text style={styles.label}>{applyFor === 'Child' ? 'Birth Certificate No / NIC' : t.nicLabel}</Text>
                                    <View style={styles.verifyRow}>
                                        <TextInput style={[styles.input, {flex: 1}, errors.nic && styles.errorBorder]} value={nic} onChangeText={handleNicChange} placeholder={applyFor === 'Child' ? "2010..." : "1990..."} autoCapitalize="characters" />
                                        {applyFor !== 'Child' && (
                                            <TouchableOpacity style={styles.verifyBtn} onPress={verifyMember} disabled={verifyingMember}>
                                                {verifyingMember ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.verifyBtnText}>Verify</Text>}
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    {nicDetails && applyFor !== 'Child' && (
                                        <Text style={styles.nicHint}>📋 {nicDetails.type.toUpperCase()} NIC | Year: {nicDetails.year} | Gender: {nicDetails.gender}</Text>
                                    )}
                                    {errors.nic && <Text style={styles.errorText}>{errors.nic}</Text>}
                                    {verifiedMemberName && applyFor !== 'Child' ? (
                                        <Text style={styles.verifiedText}>✓ Verified Member: {verifiedMemberName}</Text>
                                    ) : null}
                                    
                                    <Text style={styles.label}>{applyFor === 'Child' ? 'Child Name' : 'Full Name'}</Text>
                                    <TextInput style={styles.input} value={verifiedMemberName} onChangeText={setVerifiedMemberName} placeholder="Enter full name" />

                                    <Text style={styles.label}>{t.labels.relationship}</Text>
                                    <TextInput style={[styles.input, errors.relationship && styles.errorBorder]} value={relationship} onChangeText={setRelationship} placeholder="Father / Mother / Guardian" />
                                    {errors.relationship && <Text style={styles.errorText}>{errors.relationship}</Text>}
                                </View>
                            )}

                             <Text style={styles.label}>{t.upload}</Text>
                            <TouchableOpacity style={[styles.uploadZone, errors.file && styles.errorBorder]} onPress={pickDocument}>
                                <Upload size={30} color="#800000" />
                                <Text style={styles.uploadTitle}>{selectedFile ? selectedFile.name : 'Choose File'}</Text>
                                <Text style={styles.uploadSub}>PDF or Images (Max 5MB)</Text>
                            </TouchableOpacity>
                            {errors.file && <Text style={styles.errorText}>{errors.file}</Text>}

                            <TouchableOpacity style={styles.btnPrimary} onPress={handleApply}>
                                <Text style={styles.btnPrimaryText}>{editingId ? (certType === originalCertType ? t.actions.edit : t.proceed) : t.proceed}</Text>
                                <ChevronRight size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )
                ) : (
                    <View style={styles.historyList}>
                        {loading ? <ActivityIndicator size="large" color="#800000" /> : (
                            history.length > 0 ? (
                                history.map(item => renderApplication({ item }))
                            ) : (
                                <View style={styles.empty}><FileSearch size={50} color="#cbd5e1" /><Text style={styles.emptyText}>{t.empty}</Text></View>
                            )
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { 
        backgroundColor: '#800000', padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 8
    },
    headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
    langSelector: { flexDirection: 'row', gap: 8 },
    langBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
    langBtnActive: { backgroundColor: '#f2b713' },
    langText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

    tabContainer: { flexDirection: 'row', backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 6, elevation: 4 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
    activeTab: { backgroundColor: '#fff1f1' },
    tabText: { fontWeight: 'bold', color: '#94a3b8', fontSize: 14 },
    activeTabText: { color: '#800000' },

    scrollPadding: { padding: 16, paddingBottom: 50 },
    formContainer: { gap: 16 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginTop: 8 },
    
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    typeBtn: { width: (width - 42) / 2, padding: 16, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
    typeBtnActive: { borderColor: '#800000', backgroundColor: '#fff1f1' },
    typeText: { fontSize: 13, fontWeight: 'bold', color: '#64748b', textAlign: 'center' },
    typeTextActive: { color: '#800000' },

    roleToggle: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4 },
    roleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    activeRoleBtn: { backgroundColor: '#800000' },
    roleBtnText: { fontWeight: 'bold', color: '#64748b' },
    activeRoleBtnText: { color: '#fff' },

    familyForm: { backgroundColor: '#fff', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
    verifyRow: { flexDirection: 'row', gap: 10 },
    verifyBtn: { backgroundColor: '#800000', paddingHorizontal: 15, borderRadius: 12, justifyContent: 'center' },
    verifyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    verifiedText: { color: '#10b981', fontSize: 12, fontWeight: 'bold' },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 15 },

    uploadZone: { backgroundColor: '#fff', padding: 30, borderRadius: 20, borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', alignItems: 'center' },
    uploadTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginTop: 10 },
    uploadSub: { fontSize: 12, color: '#94a3b8', marginTop: 4 },

    btnPrimary: { backgroundColor: '#800000', padding: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 4 },
    btnPrimaryText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    btnSecondary: { padding: 15, alignItems: 'center' },
    btnSecondaryText: { color: '#64748b', fontWeight: 'bold' },

    paymentCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, elevation: 10 },
    paymentHeader: { alignItems: 'center', marginBottom: 24 },
    paymentTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginTop: 12 },
    payDetails: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 16, marginBottom: 24 },
    payRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    payLabel: { color: '#64748b' },
    payLabelBold: { fontWeight: 'bold', color: '#1e293b' },
    payVal: { fontWeight: 'bold', color: '#1e293b' },
    payValPrice: { fontSize: 20, fontWeight: 'bold', color: '#800000' },

    historyList: { gap: 16 },
    historyCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2 },
    historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    historyIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff1f1', justifyContent: 'center', alignItems: 'center' },
    historyType: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
    historyDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    statusBadgeMini: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusTextMini: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    rejectBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff1f1', padding: 12, borderRadius: 12, marginTop: 15 },
    rejectText: { color: '#ef4444', fontSize: 12, fontWeight: 'bold' },

    empty: { alignItems: 'center', marginTop: 100, gap: 15 },
    emptyText: { color: '#94a3b8', fontSize: 16, fontWeight: '500' },

    trackerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 20, paddingHorizontal: 10 },
    stepWrapper: { alignItems: 'center', flex: 1, position: 'relative' },
    stepCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    stepLabel: { fontSize: 10, fontWeight: 'bold', marginTop: 6, textAlign: 'center' },
    stepLine: { position: 'absolute', height: 2, width: '100%', top: 14, left: '50%', zIndex: 1 },

    downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff1f1', padding: 12, borderRadius: 12, marginTop: 15, borderWidth: 1, borderColor: '#80000030' },
    downloadBtnText: { color: '#800000', fontWeight: 'bold', fontSize: 13 },
    errorBorder: { borderColor: '#ef4444' },
    errorText: { color: '#ef4444', fontSize: 11, marginTop: 4, marginLeft: 4 },
    nicHint: { fontSize: 11, color: '#64748b', marginTop: 4, fontStyle: 'italic' },
    methodSelector: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
    methodBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    methodBtnActive: { backgroundColor: '#800000', borderColor: '#800000' },
    methodText: { fontSize: 12, color: '#64748b', fontWeight: 'bold' },
    methodTextActive: { color: '#fff' },
    cardForm: { marginTop: 20, gap: 5 },
    cardPreview: { backgroundColor: '#1e293b', padding: 15, borderRadius: 12, marginTop: 15, gap: 5 },
    miniBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    miniBtnActive: { backgroundColor: '#800000', borderColor: '#800000' },
    miniBtnText: { fontSize: 10, color: '#64748b', fontWeight: 'bold' },
    miniBtnTextActive: { color: '#fff' },
    providerRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    providerBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#fff' },
    providerText: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
    infoBox: { flexDirection: 'row', gap: 10, backgroundColor: '#fff1f1', padding: 12, borderRadius: 12, alignItems: 'center' },
    infoTextMain: { flex: 1, fontSize: 11, color: '#800000', fontWeight: 'bold' },
    actionRowMini: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    actionIcon: { padding: 5, borderRadius: 8, backgroundColor: '#f1f5f9' },
    historyPayInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    historyPayText: { fontSize: 11, color: '#64748b' }
});
