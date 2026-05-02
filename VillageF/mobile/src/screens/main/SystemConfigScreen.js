import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    TextInput, Switch, Alert, ActivityIndicator, Dimensions,
    RefreshControl
} from 'react-native';
import { 
    Settings, Save, RefreshCcw, Calendar, FileText, Plus, 
    Trash2, Clock, User, Phone, MapPin, Briefcase, ShieldCheck,
    ChevronLeft, PlusCircle, Info, CheckCircle2
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

const { width } = Dimensions.get('window');

const translations = {
    en: {
        title: "System Config", sub: "Global Village Settings",
        general: "Office Info", appoint: "Appointments", welfare: "Welfare Rules",
        save: "Save Changes", refresh: "Refresh",
        officeName: "Grama Niladhari Name", division: "Division",
        contact: "Contact Number", hours: "Office Hours",
        maxApp: "Max Appointments/Day", advance: "Advance Booking (Days)",
        services: "Services & Duration", holidays: "Public Holidays",
        incomeReq: "Income Proof Required", maxWelfare: "Max Welfare Apps/Month",
        success: "Settings Saved", error: "Failed to save",
        add: "Add New", delete: "Remove"
    },
    si: {
        title: "පද්ධති සැකසුම්", sub: "පද්ධති පරාමිතීන් පාලනය",
        general: "කාර්යාල තොරතුරු", appoint: "පත්වීම් & නිවාඩු", welfare: "සුභසාධන නීති",
        save: "සුරකින්න", refresh: "යාවත්කාලීන",
        officeName: "නිලධාරී නම", division: "වසම",
        contact: "දුරකථන අංකය", hours: "වේලාවන්",
        maxApp: "දිනකට උපරිම පත්වීම්", advance: "කලින් වෙන් කළ හැකි දින",
        services: "සේවාවන් & කාලය", holidays: "නිවාඩු දින",
        incomeReq: "ආදායම් සහතික අනිවාර්යද", maxWelfare: "මසකට උපරිම අයදුම්පත්",
        success: "සුරැකීම සාර්ථකයි", error: "සුරැකීම අසාර්ථකයි",
        add: "එක් කරන්න", delete: "ඉවත් කරන්න"
    }
};

export default function SystemConfigScreen({ navigation }) {
    const [lang, setLang] = useState('si');
    const [activeTab, setActiveTab] = useState('general');
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    const [newHoliday, setNewHoliday] = useState('');
    const [newService, setNewService] = useState({ name: '', duration: '15' });

    const t = translations[lang] || translations.en;

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await api.get('/system/config');
            setConfig(res.data || {});
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/system/config', config);
            Alert.alert("Success", t.success);
        } catch (err) {
            Alert.alert("Error", t.error);
        } finally {
            setSaving(false);
        }
    };

    const updateField = (section, field, value) => {
        setConfig(prev => ({
            ...prev,
            [section]: { ...prev[section], [field]: value }
        }));
    };

    const addHoliday = () => {
        if (!newHoliday) return;
        const currentHolidays = config.holidays || [];
        if (currentHolidays.includes(newHoliday)) return;
        setConfig(prev => ({ ...prev, holidays: [...currentHolidays, newHoliday] }));
        setNewHoliday('');
    };

    const removeHoliday = (h) => {
        setConfig(prev => ({ ...prev, holidays: prev.holidays.filter(item => item !== h) }));
    };

    if (loading && !refreshing) return <View style={styles.center}><ActivityIndicator size="large" color="#800000" /></View>;
    if (!config) return null;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{flex: 1}}>
                    <Text style={styles.headerTitle}>{t.title}</Text>
                    <Text style={styles.headerSub}>{t.sub}</Text>
                </View>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Save size={20} color="#fff" />}
                </TouchableOpacity>
            </View>

            <View style={styles.tabBar}>
                <TouchableOpacity style={[styles.tab, activeTab === 'general' && styles.activeTab]} onPress={() => setActiveTab('general')}>
                    <Briefcase size={18} color={activeTab === 'general' ? '#800000' : '#94a3b8'} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'appoint' && styles.activeTab]} onPress={() => setActiveTab('appoint')}>
                    <Calendar size={18} color={activeTab === 'appoint' ? '#800000' : '#94a3b8'} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'welfare' && styles.activeTab]} onPress={() => setActiveTab('welfare')}>
                    <ShieldCheck size={18} color={activeTab === 'welfare' ? '#800000' : '#94a3b8'} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchConfig();}} />}
            >
                {activeTab === 'general' && (
                    <View style={styles.section}>
                        <Text style={styles.secTitle}>{t.general}</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t.officeName}</Text>
                            <TextInput style={styles.input} value={config.general?.gramaNiladhariName} onChangeText={v => updateField('general', 'gramaNiladhariName', v)} />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t.division}</Text>
                            <TextInput style={styles.input} value={config.general?.gramaNiladhariDivision} onChangeText={v => updateField('general', 'gramaNiladhariDivision', v)} />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t.contact}</Text>
                            <TextInput style={styles.input} value={config.general?.contactNumber} onChangeText={v => updateField('general', 'contactNumber', v)} />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t.hours}</Text>
                            <TextInput style={styles.input} value={config.general?.officeHours} onChangeText={v => updateField('general', 'officeHours', v)} />
                        </View>
                    </View>
                )}

                {activeTab === 'appoint' && (
                    <View style={styles.section}>
                        <Text style={styles.secTitle}>{t.appoint}</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t.maxApp}</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={String(config.appointment?.maxAppointmentsPerDay || 0)} onChangeText={v => updateField('appointment', 'maxAppointmentsPerDay', parseInt(v) || 0)} />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t.advance}</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={String(config.appointment?.advanceBookingDays || 0)} onChangeText={v => updateField('appointment', 'advanceBookingDays', parseInt(v) || 0)} />
                        </View>

                        <Text style={styles.secTitle}>{t.holidays}</Text>
                        <View style={styles.addRow}>
                            <TextInput style={[styles.input, {flex: 1}]} placeholder="YYYY-MM-DD" value={newHoliday} onChangeText={setNewHoliday} />
                            <TouchableOpacity style={styles.addBtn} onPress={addHoliday}>
                                <PlusCircle size={24} color="#800000" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.chipGrid}>
                            {config.holidays?.map(h => (
                                <View key={h} style={styles.chip}>
                                    <Text style={styles.chipText}>{h}</Text>
                                    <TouchableOpacity onPress={() => removeHoliday(h)}><Trash2 size={14} color="#ef4444" /></TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {activeTab === 'welfare' && (
                    <View style={styles.section}>
                        <Text style={styles.secTitle}>{t.welfare}</Text>
                        <View style={styles.switchGroup}>
                            <Text style={styles.label}>{t.incomeReq}</Text>
                            <Switch 
                                value={config.welfare?.incomeVerificationRequired} 
                                onValueChange={v => updateField('welfare', 'incomeVerificationRequired', v)}
                                trackColor={{ false: "#cbd5e1", true: "#800000" }}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t.maxWelfare}</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={String(config.welfare?.maxApplicationsPerMonth || 0)} onChangeText={v => updateField('welfare', 'maxApplicationsPerMonth', parseInt(v) || 0)} />
                        </View>
                        <View style={styles.infoBox}>
                            <Info size={16} color="#0369a1" />
                            <Text style={styles.infoText}>These rules are applied instantly across the entire system.</Text>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: '#800000', padding: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
    saveBtn: { padding: 12, backgroundColor: '#10b981', borderRadius: 12 },

    tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    tab: { flex: 1, padding: 15, alignItems: 'center' },
    activeTab: { borderBottomWidth: 3, borderBottomColor: '#800000' },

    scrollContent: { padding: 20 },
    section: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, elevation: 2 },
    secTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 10 },
    inputGroup: { marginBottom: 15 },
    label: { fontSize: 13, fontWeight: 'bold', color: '#64748b', marginBottom: 8 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 15, color: '#1e293b' },
    
    switchGroup: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingVertical: 10 },
    
    addRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
    addBtn: { padding: 5 },

    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
    chipText: { fontSize: 12, color: '#334155', fontWeight: 'bold' },

    infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f0f9ff', padding: 15, borderRadius: 12, marginTop: 10 },
    infoText: { fontSize: 12, color: '#0369a1', flex: 1 }
});
