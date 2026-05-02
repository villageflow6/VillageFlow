import React, { useState, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { User, ShieldCheck, AlertCircle, ArrowRight, Lock, Landmark, Info, X, Eye, EyeOff, CheckCircle } from 'lucide-react-native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

const translations = {
    en: { 
        title: "Administrative Services", gov: "Government Digital Access Portal", citizen: "Citizen", officer: "Officer", 
        nic: "NIC Number", pass: "Password", btn: "Secure Sign In", register: "Register Now",
        nicHint: "Old: 9 digits + V/X | New: 12 digits", invalidNic: "Invalid NIC format!", emptyFields: "Please enter all fields.", roleMismatch: "This account is not a {role} account.",
        proxy: "Elderly Care Proxy Registration", noAccount: "Not registered yet?", forgot: "Forgot Password?",
        forgotHelp: "To reset your password, please contact your Grama Niladhari.", passwordHint: "Minimum 8 characters"
    },
    si: { 
        title: "පරිපාලන සේවය", gov: "රාජ්‍ය ඩිජිටල් පිවිසුම් ද්වාරය", citizen: "පුරවැසියා", officer: "නිලධාරියා", 
        nic: "NIC අංකය", pass: "මුරපදය", btn: "ඇතුළු වන්න", register: "දැන් ලියාපදිංචි වන්න",
        nicHint: "පැරණි: 9 + V/X | නව: 12", invalidNic: "වලංගු නොවන NIC ආකෘතිය!", emptyFields: "සියලුම තොරතුරු ඇතුළත් කරන්න.", roleMismatch: "මෙම ගිණුම {role} ගිණුමක් නොවේ.",
        proxy: "වැඩිහිටි ලියාපදිංචි සහය (ප්‍රොක්සි)", noAccount: "තවමත් ලියාපදිංචි වී නැද්ද?", forgot: "මුරපදය අමතකද?",
        forgotHelp: "මුරපදය ප්‍රතිසාධනය කිරීමට ඔබගේ ග්‍රාම නිලධාරීවරයා හමුවන්න.", passwordHint: "අවම වශයෙන් අකුරු 8 ක්",
        loginSuccess: "ප්‍රවේශය සාර්ථකයි! නැවත යොමු වෙමින්...", networkError: "ජාල දෝෂයකි.", serverError: "සේවාදායක දෝෂයකි."
    },
    ta: { 
        title: "நிர்வாக சேவைகள்", gov: "அரசாங்க டிஜிட்டல் அணுகல் போர்டல்", citizen: "குடிமகன்", officer: "அதிகாரி", 
        nic: "NIC எண்", pass: "கடவுச்சொல்", btn: "உள்நுழைவு", register: "பதிவு செய்யுங்கள்",
        nicHint: "பழைய: 9 இலக்கங்கள் + V/X | புதிய: 12 இலக்கங்கள்", invalidNic: "தவறான NIC வடிவம்!", emptyFields: "அனைத்து புலங்களையும் நிரப்பவும்.", roleMismatch: "இந்த கணக்கு {role} கணக்கு அல்ல.",
        proxy: "முதியோர் பராமரிப்பு பதிவு", noAccount: "பதிவு செய்யவில்லையா?", forgot: "கடவுச்சொல் மறந்துவிட்டதா?",
        forgotHelp: "கடவுச்சோல்லை மீட்டமைக்க கிராம அலுவலரை தொடர்பு கொள்ளவும்.", passwordHint: "குறைந்தது 8 எழுத்துகள்",
        loginSuccess: "உள்நுழைவு வெற்றிகரமாக!", networkError: "பிணைய பிழை.", serverError: "சேவையக பிழை."
    }
};

export default function LoginScreen({ navigation }) {
    const { login } = useContext(AuthContext);
    const [lang, setLang] = useState('en');
    const [role, setRole] = useState('citizen');
    const [nic, setNic] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const t = translations[lang] || translations.en;

    const validateNIC = (val) => {
        if (!val) return false;
        const cleaned = val.trim().toUpperCase();
        return /^[0-9]{9}[VX]$/.test(cleaned) || /^[0-9]{12}$/.test(cleaned);
    };

    const getNICDetails = (nicVal) => {
        if (!nicVal || !validateNIC(nicVal)) return null;
        const cleaned = nicVal.trim().toUpperCase();
        if (cleaned.length === 10) {
            const year = 1900 + parseInt(cleaned.substring(0, 2));
            const days = parseInt(cleaned.substring(2, 5));
            const gender = days > 500 ? 'Female' : 'Male';
            return { type: 'old', year, gender };
        } else if (cleaned.length === 12) {
            const year = parseInt(cleaned.substring(0, 4));
            const days = parseInt(cleaned.substring(4, 7));
            const gender = days > 500 ? 'Female' : 'Male';
            return { type: 'new', year, gender };
        }
        return null;
    };

    const formatNICForDisplay = (nicVal) => {
        if (!nicVal) return nicVal;
        const cleaned = nicVal.replace(/\s/g, '').toUpperCase();
        if (cleaned.length === 10) {
            return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9)}`;
        } else if (cleaned.length === 12) {
            return `${cleaned.substring(0, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7, 10)} ${cleaned.substring(10, 12)}`;
        }
        return cleaned;
    };

    const getPasswordStrength = (pass) => {
        if (!pass) return 0;
        let strength = 0;
        if (pass.length >= 8) strength++;
        if (pass.length >= 12) strength++;
        if (pass.match(/[a-z]+/)) strength++;
        if (pass.match(/[A-Z]+/)) strength++;
        if (pass.match(/[0-9]+/)) strength++;
        if (pass.match(/[$@#&!%*?]+/)) strength++;
        return Math.min(strength, 5);
    };

    const getPasswordStrengthColor = (strength) => {
        if (strength <= 2) return '#ff4757';
        if (strength <= 3) return '#ffa502';
        return '#2ed573';
    };

    const getPasswordStrengthText = (strength) => {
        if (strength <= 2) return lang === 'si' ? 'දුර්වල' : lang === 'ta' ? 'பலவீனமான' : 'Weak';
        if (strength <= 3) return lang === 'si' ? 'මධ්‍යම' : lang === 'ta' ? 'மிதமான' : 'Medium';
        return lang === 'si' ? 'ශක්තිමත්' : lang === 'ta' ? 'வலுவான' : 'Strong';
    };

    const nicDetails = getNICDetails(nic);
    const passwordStrength = getPasswordStrength(password);

    const handleLogin = async () => {
        let newErrors = {};
        if (!nic.trim()) newErrors.nic = t.emptyFields;
        if (!password) newErrors.password = t.emptyFields;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        if (!validateNIC(nic)) {
            setErrors({ nic: t.invalidNic });
            return;
        }

        if (password.length < 6) {
            setErrors({ password: lang === 'si' ? "මුරපදය අවම වශයෙන් අකුරු 6 ක් විය යුතුය." : "Password must be at least 6 characters." });
            return;
        }

        setLoading(true);
        setErrors({});
        try {
            const res = await api.post('/auth/login', { 
                nic: nic.replace(/\s/g, ''), 
                password: password
            });

            if (res.data && res.data.token) {
                if (res.data.user.role !== role) {
                    setErrors({ general: t.roleMismatch.replace('{role}', role) });
                    setLoading(false);
                    return;
                }
                await login(res.data.user, res.data.token);
                // Navigation will be handled by the root navigator checking the AuthContext
            }
        } catch (err) {
            const errorMsg = err.response?.data?.msg || "Login failed.";
            setErrors({ general: errorMsg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                {/* Header Section */}
                <View style={styles.headerPanel}>
                    <Landmark size={48} color="#fbc531" />
                    <Text style={styles.govText}>{t.gov}</Text>
                    <View style={styles.divider} />
                    <Text style={styles.portalName}>VillageFlow</Text>
                </View>

                {/* Main Form Section */}
                <View style={styles.formPanel}>
                    {/* Language Selector */}
                    <View style={styles.langBar}>
                        <TouchableOpacity onPress={() => setLang('si')}><Text style={[styles.langBtn, lang==='si' && styles.activeLang]}>සිංහල</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => setLang('en')}><Text style={[styles.langBtn, lang==='en' && styles.activeLang]}>EN</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => setLang('ta')}><Text style={[styles.langBtn, lang==='ta' && styles.activeLang]}>தமிழ்</Text></TouchableOpacity>
                    </View>

                    <Text style={styles.titleStyle}>{role === 'citizen' ? t.citizen : t.officer} {t.title}</Text>

                    {/* Role Toggle */}
                    <View style={styles.roleToggle}>
                        <TouchableOpacity 
                            style={[styles.roleBtn, role === 'citizen' && styles.activeRoleBtn]}
                            onPress={() => setRole('citizen')}
                        >
                            <User size={16} color={role === 'citizen' ? '#fff' : '#64748b'} />
                            <Text style={[styles.roleBtnText, role === 'citizen' && styles.activeRoleBtnText]}>{t.citizen}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.roleBtn, role === 'officer' && styles.activeRoleBtn]}
                            onPress={() => setRole('officer')}
                        >
                            <ShieldCheck size={16} color={role === 'officer' ? '#fff' : '#64748b'} />
                            <Text style={[styles.roleBtnText, role === 'officer' && styles.activeRoleBtnText]}>{t.officer}</Text>
                        </TouchableOpacity>
                    </View>

                    {errors.general ? (
                        <View style={styles.errorBox}>
                            <AlertCircle size={16} color="#b91c1c" />
                            <Text style={styles.errorText}>{errors.general}</Text>
                        </View>
                    ) : null}

                    {/* Inputs */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t.nic}</Text>
                        <View style={styles.inputGroup}>
                            <User size={18} color="#800000" style={styles.inputIcon} />
                            <TextInput 
                                style={[styles.input, errors.nic && styles.errorBorder]}
                                placeholder="199012345678 or 876543210V"
                                value={formatNICForDisplay(nic)}
                                onChangeText={v => setNic(v.replace(/\s/g, ''))}
                                autoCapitalize="characters"
                            />
                        </View>
                        {errors.nic ? <Text style={styles.inlineError}>{errors.nic}</Text> : (
                            nicDetails ? (
                                <Text style={{fontSize: 11, color: '#2ed573', marginTop: 5}}>
                                    📋 {nicDetails.type === 'old' ? 'Old NIC' : 'New NIC'} | Year: {nicDetails.year} | Gender: {nicDetails.gender}
                                </Text>
                            ) : (
                                <Text style={styles.hintText}>{t.nicHint}</Text>
                            )
                        )}
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t.pass}</Text>
                        <View style={styles.inputGroup}>
                            <Lock size={18} color="#800000" style={styles.inputIcon} />
                            <TextInput 
                                style={[styles.input, errors.password && styles.errorBorder]}
                                placeholder="••••••••"
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                {showPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                            </TouchableOpacity>
                        </View>
                        {errors.password && <Text style={styles.inlineError}>{errors.password}</Text>}
                        {password ? (
                            <View style={{marginTop: 8}}>
                                <View style={{height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, overflow: 'hidden', marginBottom: 5}}>
                                    <View style={{height: '100%', width: `${(passwordStrength / 5) * 100}%`, backgroundColor: getPasswordStrengthColor(passwordStrength)}} />
                                </View>
                                <Text style={{fontSize: 10, color: '#64748b'}}>
                                    {t.passwordHint}: {getPasswordStrengthText(passwordStrength)}
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.hintText}>{t.passwordHint}</Text>
                        )}
                    </View>

                    <TouchableOpacity 
                        style={[styles.mainBtn, loading && styles.disabledBtn]} 
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <Text style={styles.mainBtnText}>{t.btn.toUpperCase()}</Text>
                                <ArrowRight size={18} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={{marginTop: 15, alignItems: 'center'}} onPress={() => alert(t.forgotHelp)}>
                        <Text style={{color: '#64748b', fontSize: 13}}>{t.forgot}</Text>
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>{t.noAccount}</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{marginTop: 10, borderWidth: 1, borderColor: '#800000', padding: 12, borderRadius: 8, width: '100%', alignItems: 'center'}}>
                            <Text style={styles.linkText}>{t.register}</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#800000' },
    scrollContent: { flexGrow: 1, justifyContent: 'center' },
    headerPanel: { alignItems: 'center', padding: 40, paddingTop: 60, paddingBottom: 20 },
    govText: { color: '#fbc531', fontSize: 12, fontWeight: 'bold', marginTop: 10, letterSpacing: 1 },
    divider: { height: 3, width: 40, backgroundColor: '#fbc531', marginVertical: 15 },
    portalName: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
    
    formPanel: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, flex: 1 },
    langBar: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15, marginBottom: 20 },
    langBtn: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
    activeLang: { color: '#800000', fontWeight: '800' },
    titleStyle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginBottom: 20 },
    
    roleToggle: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 5, marginBottom: 25 },
    roleBtn: { flex: 1, flexDirection: 'row', padding: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 8, gap: 8 },
    activeRoleBtn: { backgroundColor: '#800000' },
    roleBtnText: { color: '#64748b', fontWeight: '600' },
    activeRoleBtnText: { color: '#fff' },
    
    errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 20, gap: 8 },
    errorText: { color: '#b91c1c', fontSize: 13, flex: 1 },
    
    inputContainer: { marginBottom: 20 },
    label: { fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 8, textTransform: 'uppercase' },
    inputGroup: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 15, height: 50 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: '100%', fontSize: 15 },
    eyeIcon: { padding: 5 },
    hintText: { fontSize: 11, color: '#94a3b8', marginTop: 5 },
    
    mainBtn: { backgroundColor: '#800000', height: 55, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10 },
    disabledBtn: { backgroundColor: '#cbd5e1' },
    mainBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    
    footer: { marginTop: 30, alignItems: 'center' },
    footerText: { color: '#64748b', fontSize: 14 },
    linkText: { color: '#800000', fontWeight: 'bold' },
    errorBorder: { borderColor: '#ef4444', color: '#ef4444' },
    inlineError: { color: '#ef4444', fontSize: 11, marginTop: 5, marginLeft: 2 }
});
