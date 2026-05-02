import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  TouchableOpacity, Modal, TextInput, Alert, ScrollView, RefreshControl,
  Platform, Dimensions
} from 'react-native';
import { 
  CalendarCheck, PlusCircle, Edit3, Trash2, Calendar as CalendarIcon, 
  Clock, X, Check, Search, Info, User, ChevronRight, AlertCircle,
  FileText, ArrowLeft, Filter, Download, Plus, Layout
} from 'lucide-react-native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

const { width } = Dimensions.get('window');

const translations = {
    en: {
        title: "Appointments", subTitle: "Smart Scheduling System", 
        book: "Book Appointment", noData: "No appointments found",
        nic: "NIC Number", reason: "Purpose of Visit", date: "Preferred Date", 
        time: "Available Slot", save: "Confirm Booking", update: "Update Booking", 
        cancel: "Cancel", deleteConfirm: "Are you sure you want to cancel this visit?",
        delete: "Yes, Cancel", no: "No", approve: "Approve", reject: "Reject", 
        edit: "Edit", updateTitle: "Modify Appointment", addTitle: "New Appointment", 
        status: "Status", report: "Download Report", search: "Search appointments...",
        successBook: "Appointment request sent successfully!",
        pending: "Pending Approval", approved: "Confirmed", rejected: "Declined"
    },
    si: {
        title: "පත්වීම් සේවාව", subTitle: "ස්මාර්ට් පත්වීම් කළමනාකරණය",
        book: "වේලාවක් වෙන්කරන්න", noData: "පත්වීම් කිසිවක් හමු නොවීය",
        nic: "ජාතික හැඳුනුම්පත් අංකය", reason: "පැමිණීමේ අරමුණ", date: "දිනය", 
        time: "වේලාව", save: "වෙන් කිරීම තහවුරු කරන්න", update: "යාවත්කාලීන කරන්න", 
        cancel: "අවලංගු කරන්න", deleteConfirm: "මෙම පත්වීම අවලංගු කිරීමට ඔබට සහතිකද?",
        delete: "ඔව්, අවලංගු කරන්න", no: "නැත", approve: "අනුමත කරන්න", reject: "ප්‍රතික්ෂේප කරන්න", 
        edit: "සංස්කරණය", updateTitle: "පත්වීම වෙනස් කිරීම", addTitle: "නව පත්වීමක්",
        status: "තත්ත්වය", report: "වාර්තාව බාගන්න", search: "සොයන්න...",
        successBook: "පත්වීම් ඉල්ලීම සාර්ථකව යොමු කරන ලදී!",
        pending: "අනුමැතිය අපේක්ෂාවෙන්", approved: "අනුමත කරන ලදී", rejected: "ප්‍රතික්ෂේපිතයි"
    },
    ta: {
        title: "சந்திப்புகள்", subTitle: "ஸ்மார்ட் சந்திப்பு மேலாண்மை",
        book: "முன்பதிவு", noData: "சந்திப்புகள் எதுவும் இல்லை",
        nic: "அடையாள அட்டை எண்", reason: "வருகைக்கான காரணம்", date: "தேதி", 
        time: "நேரம்", save: "முன்பதிவை உறுதிசெய்", update: "புதுப்பி", 
        cancel: "ரத்துசெய்", deleteConfirm: "இந்த சந்திப்பை ரத்து செய்ய விரும்புகிறீர்களா?",
        delete: "ஆம், ரத்துசெய்", no: "இல்லை", approve: "அங்கீகரி", reject: "நிராகரி", 
        edit: "திருத்து", updateTitle: "சந்திப்பை மாற்றவும்", addTitle: "புதிய சந்திப்பு",
        status: "நிலை", report: "அறிக்கை", search: "தேடுக...",
        successBook: "சந்திப்பு கோரிக்கை வெற்றிகரமாக அனுப்பப்பட்டது!",
        pending: "நிலுவையில்", approved: "அங்கீகரிக்கப்பட்டது", rejected: "நிராகரிக்கப்பட்டது"
    }
};

export default function AppointmentsScreen() {
    const { user } = useContext(AuthContext);
    const isOfficer = user?.role === 'officer';
    
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lang, setLang] = useState('en');
    const t = translations[lang] || translations.en;
    
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [availableSlots, setAvailableSlots] = useState([]);
    const [maxDays, setMaxDays] = useState(14);
    const [statusFilter, setStatusFilter] = useState('All');

    const [formData, setFormData] = useState({ 
        nic: user?.nic || '', 
        reason: '', 
        date: new Date().toISOString().split('T')[0], 
        time: '' 
    });

    useEffect(() => {
        fetchAppointments();
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const res = await api.get('/system/public-config');
            if (res.data.appointment) {
                setAvailableSlots(res.data.appointment.availableTimeSlots || []);
                setMaxDays(res.data.appointment.advanceBookingDays || 14);
            }
        } catch (err) {
            setAvailableSlots(['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM']);
        }
    };

    const fetchAppointments = async () => {
        try {
            const res = await api.get('/appointments/all');
            let data = res.data;
            if (!isOfficer) {
                const userId = user?.id || user?._id;
                data = data.filter(app => app.userId === userId);
            }
            setAppointments(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSave = async () => {
        let newErrors = {};
        if (!formData.reason.trim() || formData.reason.length < 3) newErrors.reason = "Invalid reason";
        if (!formData.date.trim()) newErrors.date = "Date is required";
        else {
            const dateParts = formData.date.split('-');
            const d = new Date(formData.date);
            const today = new Date(); today.setHours(0,0,0,0);
            const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + maxDays);
            
            // Format & Reality Check
            if (dateParts.length !== 3 || isNaN(d.getTime())) {
                newErrors.date = "Use YYYY-MM-DD format";
            } else if (d < today) {
                newErrors.date = "Cannot book in the past";
            } else if (d > maxDate) {
                newErrors.date = `Max ${maxDays} days in advance`;
            } else if (d.getDay() === 0 || d.getDay() === 6) {
                newErrors.date = "Office closed on weekends";
            }
        }
        if (!formData.time.trim()) newErrors.time = "Time required";

        const hasPending = appointments.some(app => 
            app.nic === formData.nic && app.date === formData.date && app.status === 'Pending' && app._id !== isEditing
        );
        if (hasPending) newErrors.nic = "Existing pending request";

        if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

        setSubmitting(true);
        try {
            const payload = { 
                ...formData, 
                userId: user._id || user.id,
                userName: user.fullName || user.name || "Citizen",
                userEmail: user.email || ""
            };
            if (isEditing) {
                await api.put(`/appointments/update/${isEditing}`, payload);
            } else {
                await api.post('/appointments/book', payload);
            }
            Alert.alert("Success", t.successBook);
            resetForm();
            fetchAppointments();
        } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Booking failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await api.put(`/appointments/status/${id}`, { status });
            fetchAppointments();
        } catch (err) {
            Alert.alert("Error", "Update failed");
        }
    };

    const downloadReport = async () => {
        try {
            const filtered = appointments.filter(app => (app.reason || "").toLowerCase().includes(searchQuery.toLowerCase()) || (app.nic || "").includes(searchQuery));
            const html = `
                <html><body style="font-family:Helvetica;padding:40px;">
                    <h1 style="color:#800000;text-align:center;">VillageFlow Appointment Report</h1>
                    <table style="width:100%;border-collapse:collapse;margin-top:20px;">
                        <tr style="background:#800000;color:white;">
                            <th style="padding:10px;border:1px solid #ddd;">NIC</th>
                            <th style="padding:10px;border:1px solid #ddd;">Reason</th>
                            <th style="padding:10px;border:1px solid #ddd;">Date/Time</th>
                            <th style="padding:10px;border:1px solid #ddd;">Status</th>
                        </tr>
                        ${filtered.map(app => `
                            <tr>
                                <td style="padding:10px;border:1px solid #ddd;">${app.nic}</td>
                                <td style="padding:10px;border:1px solid #ddd;">${app.reason}</td>
                                <td style="padding:10px;border:1px solid #ddd;">${app.date} | ${app.time}</td>
                                <td style="padding:10px;border:1px solid #ddd;">${app.status}</td>
                            </tr>
                        `).join('')}
                    </table>
                </body></html>
            `;
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri);
        } catch (err) { Alert.alert("Error", "Failed to generate report"); }
    };

    const downloadReceipt = async (app) => {
        try {
            const html = `
                <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica', sans-serif; padding: 0; margin: 0; background: #fff; }
                        .header { background: #800000; color: white; padding: 40px 20px; text-align: center; }
                        .emblem { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8; }
                        .title { font-size: 24px; font-weight: bold; margin-top: 10px; }
                        .content { padding: 40px; }
                        .card { border: 2px solid #800000; border-radius: 15px; padding: 30px; position: relative; }
                        .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 60px; color: rgba(128,0,0,0.05); font-weight: bold; z-index: -1; white-space: nowrap; }
                        .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                        .label { color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase; }
                        .value { color: #1e293b; font-size: 16px; font-weight: bold; }
                        .footer { margin-top: 50px; text-align: center; color: #94a3b8; font-size: 10px; }
                        .qr-placeholder { text-align: center; margin-top: 30px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="emblem">Republic of Sri Lanka</div>
                        <div class="title">APPOINTMENT CONFIRMATION</div>
                    </div>
                    <div class="content">
                        <div class="card">
                            <div class="watermark">VILLAGEFLOW APPROVED</div>
                            <div class="info-row"><span class="label">Reference No</span> <span class="value">#APP-${app._id.substring(18).toUpperCase()}</span></div>
                            <div class="info-row"><span class="label">Citizen Name</span> <span class="value">${app.userName || 'N/A'}</span></div>
                            <div class="info-row"><span class="label">NIC Number</span> <span class="value">${app.nic}</span></div>
                            <div class="info-row"><span class="label">Purpose</span> <span class="value">${app.reason}</span></div>
                            <div class="info-row"><span class="label">Date</span> <span class="value">${app.date}</span></div>
                            <div class="info-row"><span class="label">Time Slot</span> <span class="value">${app.time}</span></div>
                            <div class="info-row"><span class="label">Status</span> <span style="color: #15803d; font-weight: bold;">APPROVED</span></div>
                        </div>
                        <div class="footer">
                            <p>This is an electronically generated document. No signature is required.</p>
                            <p>Please present this slip at the Grama Niladhari Office at your scheduled time.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri);
        } catch (err) {
            Alert.alert("Error", "Could not generate receipt");
        }
    };

    const resetForm = () => {
        setFormData({ nic: user?.nic || '', reason: '', date: new Date().toISOString().split('T')[0], time: '' });
        setIsEditing(null); setShowForm(false); setErrors({});
    };

    const getStatusTheme = (status) => {
        switch(status) {
            case 'Approved': return { bg: '#dcfce7', text: '#15803d', label: t.approved };
            case 'Rejected': return { bg: '#fee2e2', text: '#b91c1c', label: t.rejected };
            default: return { bg: '#fef3c7', text: '#b45309', label: t.pending };
        }
    };

    const renderCard = ({ item }) => {
        const theme = getStatusTheme(item.status);
        return (
            <View style={styles.premiumCard}>
                <View style={styles.cardHeader}>
                    <View style={styles.iconCircle}><CalendarCheck size={22} color="#800000" /></View>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.reason}</Text>
                        <Text style={styles.cardSubtitle}>{item.nic}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: theme.bg }]}><Text style={[styles.badgeText, { color: theme.text }]}>{theme.label}</Text></View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.detailRow}>
                        <View style={styles.pill}><CalendarIcon size={14} color="#64748b" /><Text style={styles.pillText}>{item.date}</Text></View>
                        <View style={styles.pill}><Clock size={14} color="#64748b" /><Text style={styles.pillText}>{item.time}</Text></View>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    {isOfficer ? (
                        <View style={styles.actionGroup}>
                            {item.status === 'Pending' && (
                                <>
                                    <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleStatusUpdate(item._id, 'Approved')}><Check size={16} color="#fff" /><Text style={styles.btnLabel}>Approve</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleStatusUpdate(item._id, 'Rejected')}><X size={16} color="#fff" /><Text style={styles.btnLabel}>Reject</Text></TouchableOpacity>
                                </>
                            )}
                            <TouchableOpacity style={styles.deleteIcon} onPress={() => handleStatusUpdate(item._id, 'Rejected')}><Trash2 size={18} color="#ef4444" /></TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.citizenActionGroup}>
                            {item.status === 'Approved' && (
                                <TouchableOpacity style={styles.receiptBtn} onPress={() => downloadReceipt(item)}>
                                    <FileText size={16} color="#800000" />
                                    <Text style={styles.receiptBtnText}>Download Slip</Text>
                                </TouchableOpacity>
                            )}
                            {item.status === 'Pending' && (
                                <>
                                    <TouchableOpacity style={styles.editIcon} onPress={() => { setFormData(item); setIsEditing(item._id); setShowForm(true); }}><Edit3 size={18} color="#2563eb" /></TouchableOpacity>
                                    <TouchableOpacity style={styles.deleteIcon} onPress={() => handleStatusUpdate(item._id, 'Rejected')}><Trash2 size={18} color="#ef4444" /></TouchableOpacity>
                                </>
                            )}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#800000" /></View>;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.headerPremium}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.titlePremium}>{t.title}</Text>
                        <Text style={styles.subtitlePremium}>{t.subTitle}</Text>
                    </View>
                    <View style={styles.langSelectorMini}>
                        {['si', 'en', 'ta'].map(l => (
                            <TouchableOpacity key={l} onPress={() => setLang(l)} style={[styles.langChip, lang === l && styles.langChipActive]}><Text style={[styles.langChipText, lang === l && styles.langChipTextActive]}>{l.toUpperCase()}</Text></TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.searchBarPremium}>
                    <Search size={20} color="#94a3b8" />
                    <TextInput style={styles.searchInp} placeholder={t.search} value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#94a3b8" />
                    {isOfficer && <TouchableOpacity style={styles.reportIcon} onPress={downloadReport}><Download size={20} color="#800000" /></TouchableOpacity>}
                </View>

                {isOfficer && (
                    <View style={styles.statsContainer}>
                        <View style={styles.statBox}>
                            <Text style={styles.statVal}>{appointments.filter(a => a.status === 'Pending').length}</Text>
                            <Text style={styles.statLab}>{t.pending}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statVal, {color: '#10b981'}]}>{appointments.filter(a => a.status === 'Approved').length}</Text>
                            <Text style={styles.statLab}>{t.approved}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statVal, {color: '#ef4444'}]}>{appointments.filter(a => a.status === 'Rejected').length}</Text>
                            <Text style={styles.statLab}>{t.rejected}</Text>
                        </View>
                    </View>
                )}
            </View>

            {isOfficer && (
                <View style={styles.filterBar}>
                    {['All', 'Pending', 'Approved', 'Rejected'].map(f => (
                        <TouchableOpacity key={f} onPress={() => setStatusFilter(f)} style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}>
                            <Text style={[styles.filterText, statusFilter === f && styles.filterTextActive]}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <FlatList 
                data={appointments
                    .filter(a => statusFilter === 'All' || a.status === statusFilter)
                    .filter(a => (a.reason||"").toLowerCase().includes(searchQuery.toLowerCase()) || (a.nic||"").includes(searchQuery))
                }
                keyExtractor={item => item._id}
                renderItem={renderCard}
                contentContainerStyle={styles.listContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchAppointments();}} colors={['#800000']} />}
                ListEmptyComponent={<View style={styles.emptyContainer}><Layout size={50} color="#e2e8f0" /><Text style={styles.emptyText}>{t.noData}</Text></View>}
            />

            {!isOfficer && (
                <TouchableOpacity style={styles.fabPremium} onPress={() => setShowForm(true)}><Plus size={28} color="#fff" /></TouchableOpacity>
            )}

            <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalBody}>
                    <View style={styles.modalTop}>
                        <Text style={styles.modalTitle}>{isEditing ? t.updateTitle : t.addTitle}</Text>
                        <TouchableOpacity style={styles.closeBtn} onPress={resetForm}><X size={24} color="#64748b" /></TouchableOpacity>
                    </View>
                    <ScrollView style={{ padding: 20 }}>
                        <Text style={styles.formLabel}>{t.reason} *</Text>
                        <TextInput style={[styles.formInput, { height: 80 }, errors.reason && styles.errorInp]} value={formData.reason} multiline onChangeText={v => setFormData({...formData, reason: v})} />
                        {errors.reason && <Text style={styles.errorText}>{errors.reason}</Text>}
                        
                        <Text style={styles.formLabel}>{t.date} *</Text>
                        <TextInput style={[styles.formInput, errors.date && styles.errorInp]} value={formData.date} placeholder="YYYY-MM-DD" onChangeText={v => setFormData({...formData, date: v})} />
                        {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}

                        <Text style={styles.formLabel}>{t.nic} *</Text>
                        <TextInput style={[styles.formInput, errors.nic && styles.errorInp]} value={formData.nic} autoCapitalize="characters" onChangeText={v => setFormData({...formData, nic: v})} />
                        {errors.nic && <Text style={styles.errorText}>{errors.nic}</Text>}
                        
                        <Text style={styles.formLabel}>{t.time} *</Text>
                        <View style={[styles.slotGrid, errors.time && styles.errorBorder]}>
                            {availableSlots.map(s => (
                                <TouchableOpacity key={s} style={[styles.slotItem, formData.time === s && styles.slotActive]} onPress={() => setFormData({...formData, time: s})}><Text style={[styles.slotText, formData.time === s && styles.slotTextActive]}>{s}</Text></TouchableOpacity>
                            ))}
                        </View>
                        {errors.time && <Text style={styles.errorText}>{errors.time}</Text>}

                        <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={submitting}>
                            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{isEditing ? t.update : t.save}</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerPremium: { backgroundColor: '#800000', padding: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, elevation: 10 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    titlePremium: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
    subtitlePremium: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
    langSelectorMini: { flexDirection: 'row', gap: 5 },
    langChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)' },
    langChipActive: { backgroundColor: '#fbc531' },
    langChipText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    langChipTextActive: { color: '#800000' },
    searchBarPremium: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, paddingHorizontal: 15, alignItems: 'center', height: 50 },
    searchInp: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1e293b' },
    reportIcon: { padding: 8, backgroundColor: '#fef2f2', borderRadius: 10 },
    listContainer: { padding: 20, paddingBottom: 100 },
    premiumCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    iconCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#fff1f1', justifyContent: 'center', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
    cardSubtitle: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' },
    cardBody: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15 },
    detailRow: { flexDirection: 'row', gap: 10 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    pillText: { fontSize: 12, color: '#475569', fontWeight: '500' },
    cardFooter: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15 },
    actionGroup: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    citizenActionGroup: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
    actionBtn: { flex: 1, flexDirection: 'row', height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
    approveBtn: { backgroundColor: '#10b981' },
    rejectBtn: { backgroundColor: '#ef4444' },
    btnLabel: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    deleteIcon: { padding: 10, backgroundColor: '#fef2f2', borderRadius: 12 },
    editIcon: { padding: 10, backgroundColor: '#eff6ff', borderRadius: 12 },
    receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#800000' },
    receiptBtnText: { color: '#800000', fontSize: 12, fontWeight: 'bold' },
    fabPremium: { position: 'absolute', bottom: 30, right: 30, width: 65, height: 65, borderRadius: 32.5, backgroundColor: '#800000', justifyContent: 'center', alignItems: 'center', elevation: 12 },
    modalBody: { flex: 1, backgroundColor: '#fff' },
    modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    formLabel: { fontSize: 13, fontWeight: 'bold', color: '#64748b', marginBottom: 10, marginTop: 20 },
    formInput: { backgroundColor: '#f8fafc', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 15 },
    slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    slotItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    slotActive: { backgroundColor: '#800000', borderColor: '#800000' },
    slotText: { fontSize: 11, color: '#64748b' },
    slotTextActive: { color: '#fff', fontWeight: 'bold' },
    submitBtn: { backgroundColor: '#800000', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 30 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: '#94a3b8', marginTop: 15, fontSize: 16 },
    errorInp: { borderColor: '#ef4444' },
    errorText: { color: '#ef4444', fontSize: 11, marginTop: 4, marginLeft: 4, fontWeight: '500' },
    errorBorder: { borderColor: '#ef4444', borderWidth: 1, borderRadius: 10, padding: 5 },
    
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 10 },
    statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 15, alignItems: 'center' },
    statVal: { color: '#fbc531', fontSize: 18, fontWeight: 'bold' },
    statLab: { color: '#fff', fontSize: 9, textTransform: 'uppercase', marginTop: 4, fontWeight: 'bold' },
    
    filterBar: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 15, gap: 10 },
    filterChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
    filterChipActive: { backgroundColor: '#800000', borderColor: '#800000' },
    filterText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
    filterTextActive: { color: '#fff', fontWeight: 'bold' }
});
