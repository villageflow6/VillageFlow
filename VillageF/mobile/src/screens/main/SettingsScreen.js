import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    TextInput, Switch, Alert, ActivityIndicator, Dimensions
} from 'react-native';
import { 
    Settings, Save, Calendar, ShieldCheck, Briefcase, 
    User, Phone, MapPin, Clock, PlusCircle, Trash2, ArrowLeft,
    ChevronRight, Bell, Shield, Info, HelpCircle
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

const { width } = Dimensions.get('window');

export default function SettingsScreen() {
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState('general');
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [newHoliday, setNewHoliday] = useState('');
    const [newService, setNewService] = useState({ name: '', duration: '15' });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await api.get('/system/config');
            setConfig(res.data);
        } catch (err) {
            console.error(err);
            Alert.alert("Connection Error", "Could not reach the server.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/system/config', config);
            Alert.alert("Settings Saved", "System configuration has been updated successfully.");
        } catch (err) {
            Alert.alert("Update Failed", "Changes could not be saved at this time.");
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (section, field, value) => {
        setConfig(prev => ({
            ...prev,
            [section]: { ...(prev[section] || {}), [field]: value }
        }));
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Control Center</Text>
                <TouchableOpacity 
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]} 
                    onPress={handleSave} 
                    disabled={saving}
                >
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
                </TouchableOpacity>
            </View>

            <View style={styles.tabContainer}>
                {[
                    { id: 'general', label: 'Office', icon: <Briefcase size={18} color={activeTab === 'general' ? '#800000' : '#64748b'} /> },
                    { id: 'appointment', label: 'Bookings', icon: <Calendar size={18} color={activeTab === 'appointment' ? '#800000' : '#64748b'} /> },
                    { id: 'welfare', label: 'Welfare', icon: <ShieldCheck size={18} color={activeTab === 'welfare' ? '#800000' : '#64748b'} /> }
                ].map(tab => (
                    <TouchableOpacity 
                        key={tab.id}
                        style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                        onPress={() => setActiveTab(tab.id)}
                    >
                        {tab.icon}
                        <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderSettingItem = (label, value, icon, onChange, keyboardType = 'default') => (
        <View style={styles.settingItem}>
            <View style={styles.itemHeader}>
                <View style={styles.iconBox}>{icon}</View>
                <Text style={styles.itemLabel}>{label}</Text>
            </View>
            <TextInput 
                style={styles.itemInput}
                value={String(value || '')}
                onChangeText={onChange}
                keyboardType={keyboardType}
                placeholder={`Enter ${label.toLowerCase()}`}
            />
        </View>
    );

    const renderToggleItem = (label, subLabel, value, onToggle) => (
        <View style={styles.toggleItem}>
            <View style={{flex: 1}}>
                <Text style={styles.toggleLabel}>{label}</Text>
                <Text style={styles.toggleSubLabel}>{subLabel}</Text>
            </View>
            <Switch 
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: "#e2e8f0", true: "#800000" }}
                thumbColor="#fff"
            />
        </View>
    );

    if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#800000" /></View>;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {renderHeader()}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {activeTab === 'general' && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Info size={18} color="#800000" />
                            <Text style={styles.sectionTitle}>Office Profile</Text>
                        </View>
                        
                        {renderSettingItem("Officer Name", config.general?.gramaNiladhariName, <User size={18} color="#64748b" />, t => handleInputChange('general', 'gramaNiladhariName', t))}
                        {renderSettingItem("Division", config.general?.gramaNiladhariDivision, <MapPin size={18} color="#64748b" />, t => handleInputChange('general', 'gramaNiladhariDivision', t))}
                        {renderSettingItem("Contact", config.general?.contactNumber, <Phone size={18} color="#64748b" />, t => handleInputChange('general', 'contactNumber', t), 'phone-pad')}
                        {renderSettingItem("Hours", config.general?.officeHours, <Clock size={18} color="#64748b" />, t => handleInputChange('general', 'officeHours', t))}
                    </View>
                )}

                {activeTab === 'appointment' && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Calendar size={18} color="#800000" />
                            <Text style={styles.sectionTitle}>Booking Configuration</Text>
                        </View>

                        {renderSettingItem("Max Daily Cap", config.appointment?.maxAppointmentsPerDay, <Clock size={18} color="#64748b" />, t => handleInputChange('appointment', 'maxAppointmentsPerDay', parseInt(t) || 0), 'number-pad')}
                        {renderSettingItem("Booking Window (Days)", config.appointment?.advanceBookingDays, <Calendar size={18} color="#64748b" />, t => handleInputChange('appointment', 'advanceBookingDays', parseInt(t) || 0), 'number-pad')}

                        <Text style={styles.subHeader}>Services Offered</Text>
                        <View style={styles.listContainer}>
                            {config.services?.map((s, i) => (
                                <View key={i} style={styles.listItem}>
                                    <View>
                                        <Text style={styles.listItemMain}>{s.name}</Text>
                                        <Text style={styles.listItemSub}>{s.duration} min duration</Text>
                                    </View>
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => setConfig(prev => ({...prev, services: prev.services.filter((_, idx) => idx !== i)}))}>
                                        <Trash2 size={16} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>

                        <View style={styles.addSection}>
                            <TextInput 
                                style={[styles.itemInput, {flex: 1}]}
                                placeholder="Add Service..."
                                value={newService.name}
                                onChangeText={t => setNewService({...newService, name: t})}
                            />
                            <TouchableOpacity style={styles.addIconButton} onPress={() => {
                                if(newService.name) {
                                    setConfig(prev => ({...prev, services: [...(prev.services || []), { ...newService, duration: 15 }]}));
                                    setNewService({name: '', duration: '15'});
                                }
                            }}>
                                <PlusCircle size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {activeTab === 'welfare' && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Shield size={18} color="#800000" />
                            <Text style={styles.sectionTitle}>Welfare Governance</Text>
                        </View>

                        {renderToggleItem(
                            "Income Verification", 
                            "Require citizens to submit proof of income for all welfare schemes.",
                            config.welfare?.incomeVerificationRequired,
                            v => handleInputChange('welfare', 'incomeVerificationRequired', v)
                        )}

                        <View style={styles.divider} />

                        {renderSettingItem(
                            "Monthly Application Limit", 
                            config.welfare?.maxApplicationsPerMonth, 
                            <Briefcase size={18} color="#64748b" />, 
                            t => handleInputChange('welfare', 'maxApplicationsPerMonth', parseInt(t) || 0), 
                            'number-pad'
                        )}
                    </View>
                )}

                <View style={styles.footerInfo}>
                    <HelpCircle size={14} color="#94a3b8" />
                    <Text style={styles.footerText}>Changes are applied globally to all citizen dashboards.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
    saveBtn: { backgroundColor: '#800000', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    
    tabContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 15, gap: 10 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9' },
    activeTab: { backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#fee2e2' },
    tabText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    activeTabText: { color: '#800000' },

    content: { padding: 20 },
    section: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    
    settingItem: { marginBottom: 20 },
    itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    iconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
    itemLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
    itemInput: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, fontSize: 14, color: '#1e293b', borderWidth: 1, borderColor: '#f1f5f9' },
    
    toggleItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
    toggleLabel: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    toggleSubLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 18 },
    
    subHeader: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginTop: 10, marginBottom: 15 },
    listContainer: { gap: 10, marginBottom: 15 },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 15, borderRadius: 16 },
    listItemMain: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
    listItemSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    deleteBtn: { padding: 8 },
    
    addSection: { flexDirection: 'row', gap: 10 },
    addIconButton: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
    
    divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 15 },
    footerInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
    footerText: { fontSize: 12, color: '#94a3b8', textAlign: 'center' }
});
