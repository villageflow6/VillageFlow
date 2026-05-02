import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { 
  User, Edit3, Save, X, LogOut, Landmark, MapPin, 
  Phone, Calendar, Mail, Briefcase, Home, Shield, Smartphone, FileText, UserPlus, Award,
  Download, AlertCircle, Clock
} from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { EncodingType } from 'expo-file-system';
import * as Print from 'expo-print';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

const translations = {
    en: { 
        profile: "Citizen Profile", name: "Full Name", edit: "Update Info",
        save: "Save", cancel: "Cancel", logout: "Logout",
        nicLabel: "NIC", area: "Area", age: "Age", address: "Address",
        household: "Household No", gender: "Gender", dob: "Date of Birth",
        mobile: "Mobile", email: "Email", occupation: "Occupation",
        emergency: "Emergency", successMsg: "Profile updated successfully!",
        delete: "Deactivate Account", confirmDelete: "Are you sure you want to delete your account?",
        proxy: "Proxy Registration", proxySuccess: "Proxy registered successfully!", regBtn: "Authorize Registration",
        relLabel: "Family Relationship", terms: "I agree to the terms and conditions *"
    },
    si: { 
        profile: "පුරවැසි පැතිකඩ", name: "සම්පූර්ණ නම", edit: "යාවත්කාලීන කරන්න",
        save: "සුරකින්න", cancel: "අවලංගු කරන්න", logout: "නික්ම යන්න",
        nicLabel: "ජා.හැ.අ", area: "ප්‍රදේශය", age: "වයස", address: "ලිපිනය",
        household: "ගෘහ අංකය", gender: "ස්ත්‍රී/පුරුෂ", dob: "උපන් දිනය",
        mobile: "දුරකථන අංකය", email: "ඊමේල්", occupation: "රැකියාව",
        emergency: "හදිසි ඇමතුම්", successMsg: "පැතිකඩ යාවත්කාලීන කිරීම සාර්ථකයි!",
        delete: "ගිණුම අක්‍රීය කරන්න", confirmDelete: "මෙම ගිණුම ස්ථිරවම ඉවත් කිරීමට ඔබට අවශ්‍යද?",
        proxy: "වැඩිහිටි සේවා ප්‍රොක්සි ලියාපදිංචිය", proxySuccess: "ප්‍රොක්සි ලියාපදිංචිය සාර්ථකයි!", regBtn: "ලියාපදිංචිය අනුමත කරන්න",
        relLabel: "පවුලේ සම්බන්ධතාවය", terms: "මම නියමයන් හා කොන්දේසි වලට එකඟ වෙමි *"
    },
    ta: { 
        profile: "குடிமக்கள் சுயவிவரம்", name: "முழு பெயர்", edit: "புதுப்பிக்கவும்",
        save: "சேமி", cancel: "ரத்துசெய்", logout: "வெளியேறு",
        nicLabel: "அ.அ.எண்", area: "பகுதி", age: "வயது", address: "முகவரி",
        household: "வீட்டு எண்", gender: "பாலினம்", dob: "பிறந்த தேதி",
        mobile: "மொபைல்", email: "மின்னஞ்சல்", occupation: "தொழில்",
        emergency: "அவசரம்", successMsg: "சுயவிவரம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது!",
        delete: "கணக்கை முடக்கு", confirmDelete: "உங்கள் கணக்கை நிச்சயமாக நீக்க விரும்புகிறீர்களா?",
        proxy: "முதியோர் பராமரிப்பு பதிவு", proxySuccess: "ப்ராக்ஸி பதிவு வெற்றிகரமாக முடிந்தது!", regBtn: "பதிவை அங்கீகரிக்கவும்",
        relLabel: "குடும்ப உறவு", terms: "நான் விதிமுறைகளை ஏற்கிறேன் *"
    }
};

const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
        <View style={styles.infoIcon}>{icon}</View>
        <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value || 'N/A'}</Text>
        </View>
    </View>
);

export default function ProfileScreen({ navigation }) {
    const { user, logout, login } = useContext(AuthContext);
    const [lang, setLang] = useState('en');
    const t = translations[lang] || translations.en;
    
    const [userData, setUserData] = useState(user);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [proxyLoading, setProxyLoading] = useState(false);
    
    const [editData, setEditData] = useState({});
    const [errors, setErrors] = useState({});
    const [proxyErrors, setProxyErrors] = useState({});
    const [officeInfo, setOfficeInfo] = useState(null);
    const qrRef = React.useRef();
    const [proxyData, setProxyData] = useState({
        fullName: '', nic: '', password: '', relationship: '', 
        address: '', householdNo: '', gender: 'Male', mobileNumber: '', 
        occupation: '', email: '', dateOfBirth: '', village: '', city: '', 
        emergencyContact: '', agreeToTerms: true
    });

    useEffect(() => {
        fetchUserData();
        fetchOfficeInfo();
    }, []);

    const fetchOfficeInfo = async () => {
        try {
            const res = await api.get('/system/public-config');
            setOfficeInfo(res.data.general);
        } catch (err) {
            console.error("Office info error", err);
        }
    };

    const fetchUserData = async () => {
        try {
            const id = user._id || user.id;
            const res = await api.get(`/auth/user/${id}`);
            const latest = res.data;
            setUserData(latest);
            setEditData({
                fullName: latest.fullName || '',
                mobileNumber: latest.mobileNumber || '',
                address: latest.address || '',
                occupation: latest.occupation || '',
                emergencyContact: latest.emergencyContact || '',
                email: latest.email || '',
                dateOfBirth: latest.dateOfBirth ? latest.dateOfBirth.split('T')[0] : '',
                gender: latest.gender || 'Male',
                householdNo: latest.householdNo || '',
                nic: latest.nic || ''
            });
        } catch (err) {
            console.error("Error fetching user", err);
        } finally {
            setLoading(false);
        }
    };

    const validateNIC = (nic) => {
        const oldNic = /^[0-9]{9}[vVxX]$/;
        const newNic = /^[0-9]{12}$/;
        return oldNic.test((nic || '').trim()) || newNic.test((nic || '').trim());
    };

    const validatePhone = (phone) => /^[0-9]{10}$/.test((phone || '').trim());
    const validatePassword = (pw) => pw.length >= 4 && pw.length <= 20 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
    const calculateAge = (dob) => {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age--;
        return age;
    };

    const handleUpdate = async () => {
        let newErrors = {};
        if (!editData.fullName) newErrors.fullName = "Full name is required";
        if (!validatePhone(editData.mobileNumber)) newErrors.mobileNumber = "Invalid mobile number";
        if (!validateNIC(editData.nic)) newErrors.nic = "Invalid NIC format";
        if (!editData.address || editData.address.trim().length < 5) newErrors.address = "Permanent address is required";

        if (editData.dateOfBirth) {
            const d = new Date(editData.dateOfBirth);
            const cleaned = editData.nic.trim().toUpperCase();
            const nicYear = cleaned.length === 10 ? 1900 + parseInt(cleaned.substring(0, 2)) : parseInt(cleaned.substring(0, 4));
            if (d.getFullYear() !== nicYear) {
                newErrors.dateOfBirth = `Year must match NIC (${nicYear})`;
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            Alert.alert("Validation Error", "Please check the highlighted fields.");
            return;
        }

        setSaving(true);
        setErrors({});
        try {
            const id = user._id || user.id;
            const res = await api.put(`/auth/update/${id}`, editData);
            setUserData(res.data.user);
            
            // Sync with global auth state so other screens see the update
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const token = await AsyncStorage.getItem('token');
            if (token) {
                await login(res.data.user, token);
            }
            
            Alert.alert("Success", t.successMsg);
            setIsEditing(false);
        } catch (err) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                Alert.alert("Error", err.response?.data?.msg || "Update failed");
            }
        } finally {
            setSaving(false);
        }
    };

    const downloadSmartID = async () => {
        try {
            setSaving(true);
            const qrValue = `https://villageflow.com/verify/${userData._id || userData.id}`;
            const htmlContent = `
                <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f2f5; }
                        .card { width: 350px; height: 550px; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2); position: relative; border: 1px solid #e2e8f0; }
                        .top { background: #800000; height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; }
                        .gov-emblem { font-size: 10px; font-weight: bold; opacity: 0.8; margin-bottom: 10px; text-transform: uppercase; }
                        .title { font-size: 18px; font-weight: bold; letter-spacing: 1px; }
                        .photo-area { width: 120px; height: 120px; background: #f8fafc; border-radius: 60px; border: 5px solid white; margin-top: -60px; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-left: auto; margin-right: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                        .name { text-align: center; font-size: 20px; font-weight: bold; color: #1e293b; margin-top: 15px; padding: 0 20px; }
                        .role { text-align: center; background: #fef2f2; color: #800000; display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-left: 110px; margin-top: 10px; }
                        .details { padding: 30px; margin-top: 10px; }
                        .item { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; }
                        .label { color: #64748b; font-size: 12px; font-weight: bold; }
                        .val { color: #1e293b; font-size: 14px; font-weight: 500; }
                        .footer { position: absolute; bottom: 0; width: 100%; background: #f8fafc; padding: 15px 0; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="top">
                            <div class="gov-emblem">Republic of Sri Lanka</div>
                            <div class="title">DIGITAL IDENTITY</div>
                        </div>
                        <div class="photo-area">
                             <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrValue}" style="width: 100px; height: 100px;" />
                        </div>
                        <div class="name">${userData.fullName}</div>
                        <div class="role">${userData.role?.toUpperCase()}</div>
                        <div class="details">
                            <div class="item"><span class="label">NIC NUMBER</span> <span class="val">${userData.nic}</span></div>
                            <div class="item"><span class="label">DIVISION</span> <span class="val">${userData.gnDivision || 'Kotagama'}</span></div>
                            <div class="item"><span class="label">HOUSEHOLD</span> <span class="val">${userData.householdNo || 'N/A'}</span></div>
                            <div class="item"><span class="label">VALID UNTIL</span> <span class="val">DEC 2030</span></div>
                        </div>
                        <div class="footer">Issued by VillageFlow Government Digital Services</div>
                    </div>
                </body>
                </html>
            `;
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Could not generate Smart ID PDF");
        } finally {
            setSaving(false);
        }
    };

    const handleProxyRegister = async () => {
        const p = proxyData;
        let pErrors = {};
        if (!p.fullName) pErrors.fullName = "Full name is required";
        if (!p.nic) pErrors.nic = "NIC is required";
        else if (!validateNIC(p.nic)) pErrors.nic = "Invalid NIC format";
        
        if (!p.password) pErrors.password = "Password is required";
        else if (!validatePassword(p.password)) pErrors.password = "Min 4 chars, letters & numbers";
        
        if (!p.relationship) pErrors.relationship = "Relationship is required";
        if (!p.mobileNumber) pErrors.mobileNumber = "Mobile is required";
        else if (!validatePhone(p.mobileNumber)) pErrors.mobileNumber = "Invalid format";
        
        if (!p.dateOfBirth) pErrors.dateOfBirth = "DOB is required";
        else {
            const age = calculateAge(p.dateOfBirth);
            if (isNaN(age) || age < 18) pErrors.dateOfBirth = "Min age is 18";
            else if (age > 120) pErrors.dateOfBirth = "Invalid DOB";
        }
        
        if (!p.householdNo) pErrors.householdNo = "Required";
        if (!p.address || p.address.trim().length < 5) pErrors.address = "Permanent address is required";
        if (!p.village) pErrors.village = "Required";
        if (!p.city) pErrors.city = "Required";
        if (!p.occupation) pErrors.occupation = "Required";
        if (!p.agreeToTerms) pErrors.agreeToTerms = "Accept terms to continue";

        if (Object.keys(pErrors).length > 0) {
            setProxyErrors(pErrors);
            Alert.alert("Validation Error", "Please check proxy form fields.");
            return;
        }

        setProxyLoading(true);
        setProxyErrors({});
        try {
            const targetId = user._id || user.id;
            const submitData = { 
                ...p, 
                officerId: targetId, 
                role: 'citizen',
                district: userData.district || "Monaragala",
                divisionalSecretariat: userData.divisionalSecretariat || "Bibile",
                gnDivision: userData.gnDivision || "Kotagama"
            };
            await api.post('/auth/proxy-register', submitData);
            Alert.alert("Success", t.proxySuccess);
            setProxyData({ 
                fullName: '', nic: '', password: '', relationship: '',
                address: '', householdNo: '', gender: 'Male', mobileNumber: '', 
                occupation: '', email: '', dateOfBirth: '', village: '', city: '', 
                emergencyContact: '', agreeToTerms: true
            });
        } catch (err) {
            if (err.response?.data?.errors) {
                setProxyErrors(err.response.data.errors);
            } else {
                Alert.alert("Error", err.response?.data?.msg || "Proxy Registration Failed");
            }
        } finally {
            setProxyLoading(false);
        }
    };

    const handleLogout = () => {
        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to logout?")) {
                logout();
            }
        } else {
            Alert.alert("Logout", "Are you sure?", [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", onPress: logout, style: "destructive" }
            ]);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#800000" /></View>;

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t.profile}</Text>
                <View style={styles.langBar}>
                    <TouchableOpacity onPress={() => setLang('si')}><Text style={[styles.langText, lang==='si'&&styles.langActive]}>සිං</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setLang('en')}><Text style={[styles.langText, lang==='en'&&styles.langActive]}>EN</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setLang('ta')}><Text style={[styles.langText, lang==='ta'&&styles.langActive]}>த</Text></TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* ID Card Section */}
                <View style={styles.idCard}>
                    <View style={styles.idHeader}>
                        <Landmark size={20} color="#fbc531" />
                        <Text style={styles.idHeaderText}>OFFICIAL DIGITAL IDENTITY</Text>
                    </View>
                    <View style={styles.qrContainer}>
                        <QRCode
                            getRef={(c) => (qrRef.current = c)}
                            value={`https://villageflow.com/verify/${userData._id || userData.id}`}
                            size={140}
                            color="black"
                            backgroundColor="white"
                        />
                    </View>
                    <Text style={styles.idName}>{userData.fullName}</Text>
                    <View style={styles.roleBadge}><Text style={styles.roleText}>{userData.role?.toUpperCase()}</Text></View>
                    <Text style={styles.idNic}>NIC: {userData.nic}</Text>
                    <View style={{flexDirection: 'row', justifyContent: 'center', marginTop: 15}}>
                        <TouchableOpacity style={[styles.downloadBtn, {backgroundColor: '#800000', width: '80%', justifyContent: 'center'}]} onPress={downloadSmartID}>
                            <Award size={16} color="#fff" />
                            <Text style={[styles.downloadBtnText, {color: '#fff', fontSize: 13}]}>DOWNLOAD SMART ID</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* GN Office Info Section */}
                <View style={styles.contentCard}>
                    <View style={styles.cardHeader}>
                        <Landmark size={18} color="#800000" />
                        <Text style={styles.cardTitle}>GN Office Information</Text>
                    </View>
                    <View style={styles.officeGrid}>
                        <View style={styles.officeItem}><Clock size={16} color="#64748b" /><View><Text style={styles.officeLabel}>Office Hours</Text><Text style={styles.officeValue}>{officeInfo?.officeHours || '8.30 AM - 4.15 PM'}</Text></View></View>
                        <View style={styles.officeItem}><Phone size={16} color="#64748b" /><View><Text style={styles.officeLabel}>Contact Number</Text><Text style={styles.officeValue}>{officeInfo?.contactNumber || '011-2XXXXXX'}</Text></View></View>
                        <View style={styles.officeItem}><MapPin size={16} color="#64748b" /><View><Text style={styles.officeLabel}>Office Address</Text><Text style={styles.officeValue}>{officeInfo?.officeAddress || 'GN Office'}</Text></View></View>
                        <View style={styles.officeItem}><User size={16} color="#64748b" /><View><Text style={styles.officeLabel}>Officer Name</Text><Text style={styles.officeValue}>{officeInfo?.gramaNiladhariName || 'Grama Niladhari'}</Text></View></View>
                    </View>
                </View>

                {/* Personal Details Section */}
                <View style={styles.contentCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{isEditing ? t.edit : "Personal Details"}</Text>
                        {!isEditing && <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}><Edit3 size={16} color="#800000" /><Text style={styles.editBtnText}>{t.edit}</Text></TouchableOpacity>}
                    </View>
                    {isEditing ? (
                        <View style={styles.form}>
                            <Text style={styles.label}>{t.name} *</Text>
                            <TextInput style={[styles.input, errors.fullName && styles.errorBorder]} value={editData.fullName} onChangeText={(v) => setEditData({...editData, fullName: v})} />
                            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
                            
                            <Text style={styles.label}>{t.mobile} *</Text>
                            <TextInput style={[styles.input, errors.mobileNumber && styles.errorBorder]} value={editData.mobileNumber} onChangeText={(v) => setEditData({...editData, mobileNumber: v})} keyboardType="phone-pad" />
                            {errors.mobileNumber && <Text style={styles.errorText}>{errors.mobileNumber}</Text>}
                            
                            <Text style={styles.label}>{t.email}</Text>
                            <TextInput style={styles.input} value={editData.email} onChangeText={(v) => setEditData({...editData, email: v})} keyboardType="email-address" />

                            <Text style={styles.label}>{t.dob}</Text>
                            <TextInput style={[styles.input, errors.dateOfBirth && styles.errorBorder]} value={editData.dateOfBirth} onChangeText={(v) => setEditData({...editData, dateOfBirth: v})} placeholder="YYYY-MM-DD" />
                            {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}

                            <Text style={styles.label}>{t.nicLabel} *</Text>
                            <TextInput style={[styles.input, errors.nic && styles.errorBorder]} value={editData.nic} onChangeText={(v) => setEditData({...editData, nic: v})} autoCapitalize="characters" />
                            {errors.nic && <Text style={styles.errorText}>{errors.nic}</Text>}

                            <Text style={styles.label}>{t.occupation}</Text>
                            <TextInput style={styles.input} value={editData.occupation} onChangeText={(v) => setEditData({...editData, occupation: v})} />

                            <Text style={styles.label}>{t.emergency}</Text>
                            <TextInput style={styles.input} value={editData.emergencyContact} onChangeText={(v) => setEditData({...editData, emergencyContact: v})} keyboardType="phone-pad" />

                            <Text style={styles.label}>{t.address} *</Text>
                            <TextInput style={[styles.input, {height: 80}, errors.address && styles.errorBorder]} value={editData.address} onChangeText={(v) => setEditData({...editData, address: v})} multiline />
                            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                                    <X size={16} color="#64748b" />
                                    <Text style={styles.cancelBtnText}>{t.cancel}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate}>
                                    <Save size={16} color="#fff" />
                                    <Text style={styles.saveBtnText}>{t.save}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.infoGrid}>
                            <InfoRow icon={<Shield size={18} color="#64748b"/>} label={t.nicLabel} value={userData.nic} />
                            <InfoRow icon={<Smartphone size={18} color="#64748b"/>} label={t.mobile} value={userData.mobileNumber} />
                            <InfoRow icon={<Mail size={18} color="#64748b"/>} label={t.email} value={userData.email} />
                            <InfoRow icon={<Calendar size={18} color="#64748b"/>} label={t.dob} value={userData.dateOfBirth?.split('T')[0]} />
                            <InfoRow icon={<Home size={18} color="#64748b"/>} label={t.household} value={userData.householdNo} />
                            <InfoRow icon={<Briefcase size={18} color="#64748b"/>} label={t.occupation} value={userData.occupation} />
                            <InfoRow icon={<MapPin size={18} color="#64748b"/>} label={t.area} value={`${userData.gnDivision || 'N/A'}`} />
                            <InfoRow icon={<MapPin size={18} color="#64748b"/>} label={t.address} value={userData.address} />
                            <InfoRow icon={<Phone size={18} color="#64748b"/>} label={t.emergency} value={userData.emergencyContact} />
                        </View>
                    )}
                </View>

                {/* Proxy Registration Form */}
                <View style={styles.contentCard}>
                    <View style={styles.cardHeader}>
                        <UserPlus size={18} color="#800000" />
                        <Text style={styles.cardTitle}>{t.proxy}</Text>
                    </View>
                    <View style={styles.form}>
                        <Text style={styles.label}>{t.name} *</Text>
                        <TextInput style={[styles.input, proxyErrors.fullName && styles.errorBorder]} value={proxyData.fullName} onChangeText={t => setProxyData({...proxyData, fullName: t})} />
                        {proxyErrors.fullName && <Text style={styles.errorText}>{proxyErrors.fullName}</Text>}
                        
                        <Text style={styles.label}>{t.nicLabel} *</Text>
                        <TextInput style={[styles.input, proxyErrors.nic && styles.errorBorder]} value={proxyData.nic} onChangeText={t => setProxyData({...proxyData, nic: t})} autoCapitalize="characters" />
                        {proxyErrors.nic && <Text style={styles.errorText}>{proxyErrors.nic}</Text>}
                        
                        <Text style={styles.label}>Password *</Text>
                        <TextInput style={[styles.input, proxyErrors.password && styles.errorBorder]} secureTextEntry value={proxyData.password} onChangeText={t => setProxyData({...proxyData, password: t})} />
                        {proxyErrors.password && <Text style={styles.errorText}>{proxyErrors.password}</Text>}
                        
                        <Text style={styles.label}>{t.relLabel} *</Text>
                        <View style={styles.choiceRow}>
                            {['Father', 'Mother', 'Sister', 'Brother', 'Grandfather', 'Grandmother', 'Spouse', 'Child'].map(rel => (
                                <TouchableOpacity 
                                    key={rel} 
                                    style={[styles.miniChoice, proxyData.relationship === rel && styles.miniChoiceActive]}
                                    onPress={() => setProxyData({...proxyData, relationship: rel})}
                                >
                                    <Text style={[styles.miniChoiceText, proxyData.relationship === rel && styles.miniChoiceTextActive]}>{rel}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {proxyErrors.relationship && <Text style={styles.errorText}>{proxyErrors.relationship}</Text>}
                        
                        <Text style={styles.label}>{t.dob} *</Text>
                        <TextInput style={[styles.input, proxyErrors.dateOfBirth && styles.errorBorder]} placeholder="YYYY-MM-DD" value={proxyData.dateOfBirth} onChangeText={t => setProxyData({...proxyData, dateOfBirth: t})} />
                        {proxyErrors.dateOfBirth && <Text style={styles.errorText}>{proxyErrors.dateOfBirth}</Text>}
                        
                        <Text style={styles.label}>{t.mobile} *</Text>
                        <TextInput style={[styles.input, proxyErrors.mobileNumber && styles.errorBorder]} value={proxyData.mobileNumber} onChangeText={t => setProxyData({...proxyData, mobileNumber: t})} keyboardType="phone-pad" />
                        {proxyErrors.mobileNumber && <Text style={styles.errorText}>{proxyErrors.mobileNumber}</Text>}
                        
                        <Text style={styles.label}>{t.household} *</Text>
                        <TextInput style={[styles.input, proxyErrors.householdNo && styles.errorBorder]} value={proxyData.householdNo} onChangeText={t => setProxyData({...proxyData, householdNo: t})} />
                        {proxyErrors.householdNo && <Text style={styles.errorText}>{proxyErrors.householdNo}</Text>}

                        <Text style={styles.label}>Village *</Text>
                        <TextInput style={[styles.input, proxyErrors.village && styles.errorBorder]} value={proxyData.village} onChangeText={t => setProxyData({...proxyData, village: t})} />
                        {proxyErrors.village && <Text style={styles.errorText}>{proxyErrors.village}</Text>}

                        <Text style={styles.label}>City *</Text>
                        <TextInput style={[styles.input, proxyErrors.city && styles.errorBorder]} value={proxyData.city} onChangeText={t => setProxyData({...proxyData, city: t})} />
                        {proxyErrors.city && <Text style={styles.errorText}>{proxyErrors.city}</Text>}

                        <Text style={styles.label}>{t.occupation} *</Text>
                        <TextInput style={[styles.input, proxyErrors.occupation && styles.errorBorder]} value={proxyData.occupation} onChangeText={t => setProxyData({...proxyData, occupation: t})} />
                        {proxyErrors.occupation && <Text style={styles.errorText}>{proxyErrors.occupation}</Text>}

                        <Text style={styles.label}>{t.address} *</Text>
                        <TextInput style={[styles.input, {height: 60}, proxyErrors.address && styles.errorBorder]} value={proxyData.address} onChangeText={t => setProxyData({...proxyData, address: t})} multiline />
                        {proxyErrors.address && <Text style={styles.errorText}>{proxyErrors.address}</Text>}

                        <TouchableOpacity 
                            style={{flexDirection: 'row', alignItems: 'center', marginTop: 10}} 
                            onPress={() => setProxyData({...proxyData, agreeToTerms: !proxyData.agreeToTerms})}
                        >
                            <View style={[styles.checkbox, proxyData.agreeToTerms && styles.checkboxActive, proxyErrors.agreeToTerms && styles.errorBorder]}>
                                {proxyData.agreeToTerms && <Text style={{color: '#fff', fontSize: 10}}>✓</Text>}
                            </View>
                            <Text style={[styles.termsText, proxyErrors.agreeToTerms && {color: '#ef4444'}]}>{t.terms}</Text>
                        </TouchableOpacity>
                        {proxyErrors.agreeToTerms && <Text style={styles.errorText}>{proxyErrors.agreeToTerms}</Text>}

                        <TouchableOpacity style={[styles.saveBtn, {marginTop: 15, justifyContent: 'center'}]} onPress={handleProxyRegister} disabled={proxyLoading}>
                            {proxyLoading ? <ActivityIndicator size="small" color="#fff" /> : <Award size={18} color="#fff" />}
                            <Text style={styles.saveBtnText}>{t.regBtn}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}><LogOut size={20} color="#b91c1c" /><Text style={styles.logoutText}>{t.logout}</Text></TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    header: { backgroundColor: '#800000', padding: 20, paddingTop: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    langBar: { flexDirection: 'row', gap: 10 },
    langText: { color: '#fda4af', fontSize: 14, fontWeight: 'bold' },
    langActive: { color: '#fff' },
    scrollContent: { padding: 15 },
    idCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', shadowOpacity: 0.1, elevation: 5, marginBottom: 20 },
    idHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    idHeaderText: { fontWeight: 'bold', color: '#1e293b' },
    qrContainer: { padding: 10, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 15 },
    idName: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', textAlign: 'center' },
    roleBadge: { backgroundColor: '#800000', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, marginVertical: 10 },
    roleText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    idNic: { color: '#64748b' },
    downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#800000' },
    downloadBtnText: { fontWeight: 'bold' },
    contentCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 10 },
    cardTitle: { fontSize: 18, fontWeight: 'bold' },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    editBtnText: { color: '#800000', fontWeight: 'bold' },
    infoGrid: { gap: 15 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    infoIcon: { width: 40, height: 40, backgroundColor: '#f8fafc', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' },
    infoValue: { fontSize: 15, fontWeight: '500', color: '#1e293b' },
    form: { gap: 15 },
    label: { fontSize: 12, fontWeight: 'bold', color: '#475569' },
    input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, backgroundColor: '#f8fafc' },
    saveBtn: { backgroundColor: '#800000', padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
    saveBtnText: { color: '#fff', fontWeight: 'bold' },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 15 },
    logoutText: { color: '#b91c1c', fontWeight: 'bold' },
    officeGrid: { gap: 15 },
    officeItem: { flexDirection: 'row', gap: 15, alignItems: 'center' },
    officeLabel: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold' },
    officeValue: { fontSize: 14, fontWeight: '600' },
    errorText: { color: '#ef4444', fontSize: 11, marginTop: -10, marginBottom: 5, marginLeft: 5 },
    errorBorder: { borderColor: '#ef4444' },
    cancelBtn: { padding: 10, marginRight: 10, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 5 },
    cancelBtnText: { color: '#64748b', fontWeight: 'bold' },
    checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
    checkboxActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
    termsText: { fontSize: 12, color: '#475569' },
    choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    miniChoice: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
    miniChoiceActive: { backgroundColor: '#800000', borderColor: '#800000' },
    miniChoiceText: { fontSize: 12, color: '#64748b', fontWeight: 'bold' },
    miniChoiceTextActive: { color: '#fff' }
});
