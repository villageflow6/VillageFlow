import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
    Switch
} from 'react-native';
import { 
    Landmark, ArrowRight, CheckCircle2, Eye, EyeOff, 
    Phone, Calendar, MapPin, Home, Briefcase, UserCheck, 
    Settings, ChevronLeft, ChevronRight, Shield, User,
    Mail, ShieldCheck, HeartPulse, AlertCircle
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

const translations = {
    en: {
        title: "Create Account", gov: "Gov Digital Access", sub: "Join VillageFlow - Bibile",
        name: "Full Name", nic: "NIC Number", email: "Email Address", pass: "Password",
        role: "Role", gender: "Gender", male: "Male", female: "Female",
        district: "District", ds: "Divisional Secretariat",
        gn: "GN Division", secKey: "Officer Key", btn: "Register Account",
        err_key: "Invalid Key!", success: "Registration Successful!",
        age: "Age", address: "Permanent Address", household: "Household Number",
        mobile: "Mobile Number", dob: "Date of Birth", occupation: "Occupation",
        emergency: "Emergency Contact", terms: "I agree to the Terms & Conditions",
        village: "Village/Street", city: "City", confirmPass: "Confirm Password",
        passMismatch: "Passwords do not match!", requiredField: "This field is required",
        personalInfo: "Personal Information", addressInfo: "Address Information",
        accountInfo: "Account Information", next: "Next", previous: "Previous",
        tab1: "Basic", tab2: "Address", tab3: "Account",
        weak: "Weak", medium: "Medium", strong: "Strong",
        invalidNic: "Invalid NIC format!", passwordHint: "Min 8 characters",
        citizen: "Citizen", officer: "Officer"
    },
    si: {
        title: "ගිණුමක් සාදන්න", gov: "රාජ්‍ය ඩිජිටල් පිවිසුම", sub: "VillageFlow සමඟ එක්වන්න - බිබිලේ",
        name: "සම්පූර්ණ නම", nic: "NIC අංකය", email: "විද්‍යුත් තැපෑල", pass: "මුරපදය",
        role: "භූමිකාව", gender: "ස්ත්‍රී/පුරුෂ භාවය", male: "පුරුෂ", female: "ස්ත්‍රී",
        district: "දිස්ත්‍රික්කය", ds: "ප්‍රාදේශීය ලේකම් කාර්යාලය",
        gn: "ග්‍රාම නිලධාරී වසම", secKey: "නිලධාරී කේතය", btn: "ලියාපදිංචි වන්න",
        err_key: "වැරදි කේතයකි!", success: "ලියාපදිංචිය සාර්ථකයි!",
        age: "වයස", address: "ස්ථිර ලිපිනය", household: "ගෘහ මූලික අංකය",
        mobile: "ජංගම දුරකථන අංකය", dob: "උපන් දිනය", occupation: "රැකියාව",
        emergency: "හදිසි අවස්ථා සඳහා සම්බන්ධ කරගත යුතු අංකය", terms: "මම නියමයන් සහ කොන්දේසි වලට එකඟ වෙමි",
        village: "ගම/වීදිය", city: "නගරය", confirmPass: "මුරපදය තහවුරු කරන්න",
        passMismatch: "මුරපද ගැලපෙන්නේ නැත!", requiredField: "මෙම ක්ෂේත්‍රය අවශ්‍ය වේ",
        personalInfo: "පුද්ගලික තොරතුරු", addressInfo: "ලිපින තොරතුරු",
        accountInfo: "ගිණුම් තොරතුරු", next: "ඊළඟ", previous: "පෙර",
        tab1: "මූලික", tab2: "ලිපිනය", tab3: "ගිණුම",
        weak: "දුර්වල", medium: "මධ්‍යම", strong: "ශක්තිමත්",
        invalidNic: "වැරදි NIC අංකයකි!", passwordHint: "අවම අකුරු 8",
        citizen: "පුරවැසියා", officer: "නිලධාරියා"
    },
    ta: {
        title: "கணக்கை உருவாக்கு", gov: "அரச டிஜிட்டல் அணுகல்", sub: "VillageFlow இல் இணையுங்கள் - பிபிலே",
        name: "முழு பெயர்", nic: "NIC எண்", email: "மின்னஞ்சல்", pass: "கடவுச்சொல்",
        role: "பங்கு", gender: "பாலினம்", male: "ஆண்", female: "பெண்",
        district: "மாவட்டம்", ds: "பிரதேச செயலகம்",
        gn: "கிராம அலுவலர் பிரிவு", secKey: "அதிகாரி குறியீடு", btn: "பதிவு செய்க",
        err_key: "தவறான குறியீடு!", success: "பதிவு வெற்றிகரமாக முடிந்தது!",
        age: "வயது", address: "நிரந்தர முகவரி", household: "வீட்டு எண்",
        mobile: "கைபேசி எண்", dob: "பிறந்த தேதி", occupation: "தொழில்",
        emergency: "அவசர தொடர்பு", terms: "நான் விதிமுறைகள் மற்றும் நிபந்தனைகளை ஏற்கிறேன்",
        village: "கிராமம்/தெரு", city: "நகரம்", confirmPass: "கடவுச்சொல்லை உறுதி செய்க",
        passMismatch: "கடவுச்சொற்கள் பொருந்தவில்லை!", requiredField: "இந்த புலம் தேவை",
        personalInfo: "தனிப்பட்ட தகவல்கள்", addressInfo: "முகவரி தகவல்கள்",
        accountInfo: "கணக்கு தகவல்கள்", next: "அடுத்து", previous: "முந்தைய",
        tab1: "அடிப்படை", tab2: "முகவரி", tab3: "கணக்கு",
        weak: "பலவீனமான", medium: "மிதமான", strong: "வலுவான",
        invalidNic: "தவறான NIC வடிவம்!", passwordHint: "குறைந்தது 8 எழுத்துக்கள்",
        citizen: "குடிமகன்", officer: "அதிகாரி"
    }
};

export default function RegisterScreen({ navigation }) {
    const [lang, setLang] = useState('si');
    const [activeTab, setActiveTab] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '', nic: '', email: '', password: '', confirmPassword: '',
        mobileNumber: '', dateOfBirth: '', role: 'citizen', gender: 'Male',
        district: 'Monaragala', divisionalSecretariat: 'Bibile', gnDivision: 'Kotagama',
        village: '', city: '', householdNo: '', occupation: '',
        emergencyContact: '', address: '', age: '', agreeToTerms: false
    });
    const [securityKey, setSecurityKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    
    const OFFICIAL_KEY = "SL-GOV-2026";
    const t = translations[lang] || translations.en;

    // --- Validation Utilities (Parity with Register.js) ---
    const validateSriLankanNIC = (nic) => {
        if (!nic) return false;
        const cleaned = nic.trim().toUpperCase();
        return /^[0-9]{9}[VX]$/.test(cleaned) || /^[0-9]{12}$/.test(cleaned);
    };

    const calculateAgeFromNIC = (nic) => {
        if (!validateSriLankanNIC(nic)) return "";
        let year;
        if (nic.length === 10) {
            year = 1900 + parseInt(nic.substring(0, 2));
        } else {
            year = parseInt(nic.substring(0, 4));
        }
        return (new Date().getFullYear() - year).toString();
    };

    const validateSriLankanMobile = (mobile) => {
        if (!mobile) return false;
        const cleaned = mobile.trim().replace(/\D/g, '');
        // Supports 947... 07... 7...
        return /^(?:94|0)?7[0-9]{8}$/.test(cleaned);
    };

    const validateSriLankanName = (name) => {
        if (!name) return false;
        const cleaned = name.trim();
        const words = cleaned.split(/\s+/);
        return words.length >= 2 && /^[A-Za-z\s.]+$/.test(cleaned);
    };

    const getPasswordStrength = (pass) => {
        if (!pass) return 0;
        let s = 0;
        if (pass.length >= 8) s++;
        if (/[A-Z]/.test(pass)) s++;
        if (/[0-9]/.test(pass)) s++;
        if (/[^A-Za-z0-9]/.test(pass)) s++;
        return s;
    };
    const validateDateOfBirth = (dob, nic) => {
        if (!dob) return false;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return "Format: YYYY-MM-DD";
        
        const d = new Date(dob);
        if (isNaN(d.getTime())) return "Invalid Date";
        if (d > new Date()) return "Date cannot be in future";

        if (validateSriLankanNIC(nic)) {
            const cleaned = nic.trim().toUpperCase();
            let nicYear, nicDays;
            
            if (cleaned.length === 10) {
                nicYear = 1900 + parseInt(cleaned.substring(0, 2));
                nicDays = parseInt(cleaned.substring(2, 5));
            } else {
                nicYear = parseInt(cleaned.substring(0, 4));
                nicDays = parseInt(cleaned.substring(4, 7));
            }

            // Month and Day check
            if (d.getFullYear() !== nicYear) return `Year must be ${nicYear}`;
            
            const actualDays = nicDays > 500 ? nicDays - 500 : nicDays;
            
            // Calculate day of year for the DOB
            const start = new Date(d.getFullYear(), 0, 0);
            const diff = d - start;
            const oneDay = 1000 * 60 * 60 * 24;
            const dobDayOfYear = Math.floor(diff / oneDay);

            // Note: NIC days count can be off by 1 in leap years depending on the GN system 
            // but usually it's exact.
            if (Math.abs(dobDayOfYear - actualDays) > 1) {
                return "Date/Month does not match NIC";
            }
        }
        return true;
    };
    // --- Handlers ---
    const handleNICChange = (val) => {
        const cleaned = val.replace(/[^0-9VXvx]/g, '').toUpperCase();
        const age = calculateAgeFromNIC(cleaned);
        let gender = formData.gender;
        
        if (validateSriLankanNIC(cleaned)) {
            const dayStr = cleaned.length === 10 ? cleaned.substring(2, 5) : cleaned.substring(4, 7);
            gender = parseInt(dayStr) > 500 ? 'Female' : 'Male';
        }

        setFormData(prev => ({ 
            ...prev, 
            nic: cleaned,
            age: age || prev.age,
            gender: gender
        }));
    };

    const validateStep = () => {
        let newErrors = {};
        if (activeTab === 1) {
            if (!validateSriLankanName(formData.fullName)) newErrors.fullName = "Full name required (letters only, min 2 words)";
            if (!validateSriLankanNIC(formData.nic)) newErrors.nic = t.invalidNic;
            else if (parseInt(formData.age) < 18) newErrors.nic = "Must be 18+ years old";
            
            if (!validateSriLankanMobile(formData.mobileNumber)) newErrors.mobileNumber = "Invalid mobile number";
            const dobStatus = validateDateOfBirth(formData.dateOfBirth, formData.nic);
            if (dobStatus === false) newErrors.dateOfBirth = "Invalid format (YYYY-MM-DD)";
            else if (typeof dobStatus === 'string') newErrors.dateOfBirth = dobStatus;
        } else if (activeTab === 2) {
            if (!formData.address.trim()) newErrors.address = t.requiredField;
            if (!formData.village.trim()) newErrors.village = t.requiredField;
            if (!formData.city.trim()) newErrors.city = t.requiredField;
            if (!formData.householdNo.trim()) newErrors.householdNo = t.requiredField;
            if (!formData.occupation.trim()) newErrors.occupation = t.requiredField;
            if (formData.emergencyContact && !validateSriLankanMobile(formData.emergencyContact)) newErrors.emergencyContact = "Invalid mobile number";
        } else if (activeTab === 3) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email";
            if (formData.password.length < 8) newErrors.password = t.passwordHint;
            if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = t.passMismatch;
            if (!formData.agreeToTerms) newErrors.agreeToTerms = "Accept terms to continue";
            if (formData.role === 'officer' && securityKey !== OFFICIAL_KEY) newErrors.securityKey = t.err_key;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep()) setActiveTab(p => p + 1);
    };

    const handleRegister = async () => {
        if (!validateStep()) return;

        setLoading(true);
        try {
            await api.post('/auth/register', { ...formData, securityKey });
            Alert.alert("Success", t.success, [{ text: "OK", onPress: () => navigation.navigate('Login') }]);
        } catch (err) {
            const backendErrors = err.response?.data?.errors;
            if (backendErrors) {
                setErrors(backendErrors);
                // Auto-jump to the tab with errors
                if (backendErrors.nic || backendErrors.fullName) setActiveTab(1);
                else if (backendErrors.village || backendErrors.householdNo) setActiveTab(2);
                Alert.alert("Error", "Please fix the highlighted fields.");
            } else {
                Alert.alert("Error", err.response?.data?.msg || "Registration failed");
            }
        } finally {
            setLoading(false);
        }
    };

    const renderInput = (label, field, icon, options = {}) => (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.inputWrapper, errors[field] && styles.errorBorder]}>
                {icon}
                <TextInput 
                    style={styles.input}
                    value={formData[field]}
                    onChangeText={(val) => setFormData(p => ({...p, [field]: val}))}
                    placeholder={label}
                    placeholderTextColor="#94a3b8"
                    {...options}
                />
            </View>
            {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ChevronLeft size={24} color="#800000" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.headerTitle}>{t.title}</Text>
                        <Text style={styles.headerSub}>{t.sub}</Text>
                    </View>
                    <View style={styles.langRow}>
                        {['en', 'si', 'ta'].map(l => (
                            <TouchableOpacity key={l} onPress={() => setLang(l)} style={[styles.langBtn, lang === l && styles.langBtnActive]}>
                                <Text style={[styles.langBtnText, lang === l && styles.langBtnTextActive]}>{l.toUpperCase()}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Stepper */}
                <View style={styles.stepper}>
                    {[1, 2, 3].map(i => (
                        <View key={i} style={styles.stepItem}>
                            <View style={[styles.stepCircle, activeTab >= i && styles.stepCircleActive]}>
                                <Text style={[styles.stepNum, activeTab >= i && styles.stepNumActive]}>{i}</Text>
                            </View>
                            <Text style={[styles.stepLabel, activeTab >= i && styles.stepLabelActive]}>{t[`tab${i}`]}</Text>
                            {i < 3 && <View style={[styles.stepLine, activeTab > i && styles.stepLineActive]} />}
                        </View>
                    ))}
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {activeTab === 1 && (
                        <View>
                            <Text style={styles.sectionTitle}>{t.personalInfo}</Text>
                            {renderInput(t.name, 'fullName', <User size={18} color="#800000" style={styles.icon} />)}
                            
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t.nic}</Text>
                                <View style={[styles.inputWrapper, errors.nic && styles.errorBorder]}>
                                    <Shield size={18} color="#800000" style={styles.icon} />
                                    <TextInput 
                                        style={styles.input}
                                        value={formData.nic}
                                        onChangeText={handleNICChange}
                                        placeholder="199512345678 / 851234567V"
                                        autoCapitalize="characters"
                                    />
                                </View>
                                {errors.nic && <Text style={styles.errorText}>{errors.nic}</Text>}
                            </View>

                            {/* Identity Insight */}
                            {validateSriLankanNIC(formData.nic) && (
                                <View style={styles.insight}>
                                    <ShieldCheck size={16} color="#10b981" />
                                    <Text style={styles.insightText}>Verified: {formData.gender} | {formData.age} Years Old</Text>
                                </View>
                            )}

                            {renderInput(t.mobile, 'mobileNumber', <Phone size={18} color="#800000" style={styles.icon} />, { keyboardType: 'phone-pad' })}
                            {renderInput(t.dob, 'dateOfBirth', <Calendar size={18} color="#800000" style={styles.icon} />, { placeholder: 'YYYY-MM-DD' })}
                            
                            <Text style={styles.label}>{t.role}</Text>
                            <View style={styles.row}>
                                <TouchableOpacity style={[styles.choice, formData.role === 'citizen' && styles.choiceActive]} onPress={() => setFormData(p => ({...p, role: 'citizen'}))}>
                                    <UserCheck size={16} color={formData.role === 'citizen' ? '#fff' : '#64748b'} />
                                    <Text style={[styles.choiceText, formData.role === 'citizen' && styles.choiceTextActive]}>{t.citizen}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.choice, formData.role === 'officer' && styles.choiceActive]} onPress={() => setFormData(p => ({...p, role: 'officer'}))}>
                                    <Shield size={16} color={formData.role === 'officer' ? '#fff' : '#64748b'} />
                                    <Text style={[styles.choiceText, formData.role === 'officer' && styles.choiceTextActive]}>{t.officer}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {activeTab === 2 && (
                        <View>
                            <Text style={styles.sectionTitle}>{t.addressInfo}</Text>
                            {renderInput(t.village, 'village', <Home size={18} color="#800000" style={styles.icon} />)}
                            {renderInput(t.city, 'city', <MapPin size={18} color="#800000" style={styles.icon} />)}
                            {renderInput(t.household, 'householdNo', <Home size={18} color="#800000" style={styles.icon} />)}
                            {renderInput(t.occupation, 'occupation', <Briefcase size={18} color="#800000" style={styles.icon} />)}
                            {renderInput(t.emergency, 'emergencyContact', <HeartPulse size={18} color="#800000" style={styles.icon} />, { keyboardType: 'phone-pad' })}
                            {renderInput(t.address, 'address', <MapPin size={18} color="#800000" style={styles.icon} />, { multiline: true })}
                        </View>
                    )}

                    {activeTab === 3 && (
                        <View>
                            <Text style={styles.sectionTitle}>{t.accountInfo}</Text>
                            {renderInput(t.email, 'email', <Mail size={18} color="#800000" style={styles.icon} />, { keyboardType: 'email-address', autoCapitalize: 'none' })}
                            
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t.pass}</Text>
                                <View style={[styles.inputWrapper, errors.password && styles.errorBorder]}>
                                    <Shield size={18} color="#800000" style={styles.icon} />
                                    <TextInput 
                                        style={styles.input}
                                        value={formData.password}
                                        onChangeText={(v) => setFormData(p => ({...p, password: v}))}
                                        secureTextEntry={!showPassword}
                                        placeholder={t.passwordHint}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#64748b" />}
                                    </TouchableOpacity>
                                </View>
                                {formData.password ? (
                                    <View style={styles.strengthRow}>
                                        <View style={[styles.strengthBar, { width: `${(getPasswordStrength(formData.password) / 4) * 100}%`, backgroundColor: getPasswordStrength(formData.password) < 2 ? '#ef4444' : getPasswordStrength(formData.password) < 4 ? '#f59e0b' : '#10b981' }]} />
                                    </View>
                                ) : null}
                                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                            </View>

                            {renderInput(t.confirmPass, 'confirmPassword', <Shield size={18} color="#800000" style={styles.icon} />, { secureTextEntry: !showPassword })}

                            {formData.role === 'officer' && (
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, {color: '#f59e0b'}]}>{t.secKey}</Text>
                                    <View style={[styles.inputWrapper, {borderColor: '#f59e0b'}]}>
                                        <ShieldCheck size={18} color="#f59e0b" style={styles.icon} />
                                        <TextInput style={styles.input} value={securityKey} onChangeText={setSecurityKey} placeholder="Enter Code" secureTextEntry />
                                    </View>
                                </View>
                            )}

                            <TouchableOpacity style={styles.terms} onPress={() => setFormData(p => ({...p, agreeToTerms: !p.agreeToTerms}))}>
                                <View style={[styles.checkbox, formData.agreeToTerms && styles.checkboxActive]}>
                                    {formData.agreeToTerms && <CheckCircle2 size={14} color="#fff" />}
                                </View>
                                <Text style={styles.termsText}>{t.terms}</Text>
                            </TouchableOpacity>
                            {errors.agreeToTerms && <Text style={styles.errorText}>{errors.agreeToTerms}</Text>}
                        </View>
                    )}

                    <View style={styles.footer}>
                        {activeTab > 1 && (
                            <TouchableOpacity style={styles.prevBtn} onPress={() => setActiveTab(p => p - 1)}>
                                <ChevronLeft size={20} color="#800000" />
                                <Text style={styles.prevBtnText}>{t.previous}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                            style={[styles.nextBtn, activeTab === 3 && styles.submitBtn, loading && styles.disabled]} 
                            onPress={activeTab === 3 ? handleRegister : handleNext}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <Text style={styles.nextBtnText}>{activeTab === 3 ? t.btn : t.next}</Text>
                                    {activeTab === 3 ? <CheckCircle2 size={20} color="#fff" /> : <ChevronRight size={20} color="#fff" />}
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backBtn: { padding: 8, backgroundColor: '#fff5f5', borderRadius: 12 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    headerSub: { fontSize: 12, color: '#64748b' },
    langRow: { flexDirection: 'row', gap: 6 },
    langBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#f8fafc' },
    langBtnActive: { backgroundColor: '#800000' },
    langBtnText: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
    langBtnTextActive: { color: '#fff' },

    stepper: { flexDirection: 'row', padding: 20, backgroundColor: '#f8fafc', justifyContent: 'space-between' },
    stepItem: { flex: 1, alignItems: 'center', position: 'relative' },
    stepCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', zIndex: 2 },
    stepCircleActive: { backgroundColor: '#800000' },
    stepNum: { fontSize: 14, fontWeight: 'bold', color: '#64748b' },
    stepNumActive: { color: '#fff' },
    stepLabel: { fontSize: 10, marginTop: 5, color: '#94a3b8', fontWeight: 'bold' },
    stepLabelActive: { color: '#800000' },
    stepLine: { position: 'absolute', height: 2, width: '100%', backgroundColor: '#e2e8f0', top: 15, left: '50%', zIndex: 1 },
    stepLineActive: { backgroundColor: '#800000' },

    content: { padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#800000', paddingLeft: 12 },
    inputGroup: { marginBottom: 15 },
    label: { fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, height: 55 },
    errorBorder: { borderColor: '#ef4444' },
    icon: { marginRight: 10 },
    input: { flex: 1, fontSize: 15, color: '#1e293b' },
    errorText: { fontSize: 11, color: '#ef4444', marginTop: 4, marginLeft: 4 },

    insight: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#dcfce7' },
    insightText: { fontSize: 12, color: '#166534', fontWeight: 'bold' },

    row: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    choice: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    choiceActive: { backgroundColor: '#800000', borderColor: '#800000' },
    choiceText: { color: '#64748b', fontWeight: 'bold' },
    choiceTextActive: { color: '#fff' },

    strengthRow: { height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
    strengthBar: { height: '100%', borderRadius: 2 },

    terms: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 15 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
    checkboxActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
    termsText: { fontSize: 13, color: '#64748b' },

    footer: { flexDirection: 'row', gap: 15, marginTop: 30, marginBottom: 40 },
    prevBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 55, borderRadius: 12, borderWidth: 1, borderColor: '#800000' },
    prevBtnText: { color: '#800000', fontWeight: 'bold' },
    nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 55, borderRadius: 12, backgroundColor: '#800000' },
    nextBtnText: { color: '#fff', fontWeight: 'bold' },
    submitBtn: { backgroundColor: '#10b981' },
    disabled: { opacity: 0.6 }
});
