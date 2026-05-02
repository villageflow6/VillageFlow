import React, { useState, useEffect, useContext } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    FlatList, ActivityIndicator, Alert, TextInput, Dimensions,
    Animated, Modal, RefreshControl
} from 'react-native';
import { 
    FileText, User, Clock, Check, X as CloseIcon, 
    Search, AlertCircle, Calendar, CreditCard, LogOut,
    Zap, Filter, TrendingUp, History, UserPlus, Award, Shield, Settings,
    ChevronRight, Download, Phone, MapPin, Mail, Home, Camera
} from 'lucide-react-native';
import { AuthContext } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../../services/api';

const { width } = Dimensions.get('window');

const translations = {
    en: {
        title: "Officer Command", welcome: "Grama Niladhari Console", logout: "Log Out",
        certTab: "Applications", citizenTab: "Directory", proxyTab: "Register",
        pending: "Pending", total: "Total", regCitizens: "Citizens",
        search: "Search NIC or Name...", approve: "Approve", reject: "Reject",
        confirmStatus: "Change application status to {status}?", confirmLogout: "Confirm Logout?",
        cancel: "Cancel", success: "Application {status}", errorUpdate: "Update failed",
        stats: "Overview", approvalRate: "Approval Rate", collected: "Revenue",
        timestamp: "Time", relationship: "Relation", village: "Village", city: "Town",
        occupation: "Job", emergency: "Contact", regSuccess: "Citizen Registered",
        all: "All", bulkApprove: "Bulk Verify", generateReport: "Export All Data", pendingReport: "Pending Applications Report",
        rejectReason: "Rejection Reason", mostPopular: "Top Service", mobileNumber: "Mobile",
        fullName: "Full Name", nic: "NIC Number", password: "Password", address: "Address",
        household: "Household No", gender: "Gender", dob: "Date of Birth"
    },
    si: {
        title: "නිලධාරී පර්යන්තය", welcome: "ග්‍රාම නිලධාරී පුවරුව", logout: "නික්ම යන්න",
        certTab: "අයදුම්පත්", citizenTab: "පුරවැසියන්", proxyTab: "ලියාපදිංචිය",
        pending: "විමර්ශනය වෙමින්", total: "මුළු ගණන", regCitizens: "පුරවැසියන්",
        search: "නම හෝ හැඳුනුම්පතෙන් සොයන්න...", approve: "අනුමත කරන්න", reject: "ප්‍රතික්ෂේප කරන්න",
        confirmStatus: "අයදුම්පත {status} කිරීමට ඔබට විශ්වාසද?", confirmLogout: "ඔබට නික්ම යාමට අවශ්‍යද?",
        cancel: "අවලංගු කරන්න", success: "අයදුම්පත {status}", errorUpdate: "යාවත්කාලීන කිරීම අසාර්ථකයි",
        stats: "සාරාංශය", approvalRate: "අනුමත අනුපාතය", collected: "ආදායම",
        timestamp: "වේලාව", relationship: "සම්බන්ධතාවය", village: "ගම", city: "නගරය",
        occupation: "රැකියාව", emergency: "ඇමතුම්", regSuccess: "ලියාපදිංචිය සාර්ථකයි",
        all: "සියල්ල", bulkApprove: "තොග අනුමැතිය", generateReport: "සම්පූර්ණ වාර්තාව", pendingReport: "ප්‍රමාදිත වාර්තාව",
        rejectReason: "ප්‍රතික්ෂේප කිරීමට හේතුව", mostPopular: "වැඩිම ඉල්ලුම", mobileNumber: "දුරකථන",
        fullName: "සම්පූර්ණ නම", nic: "NIC අංකය", password: "මුරපදය", address: "ලිපිනය",
        household: "ගෘහ අංකය", gender: "ස්ත්‍රී/පුරුෂ", dob: "උපන් දිනය"
    }
};

const DashboardScreen = ({ navigation }) => {
    const { user, logout } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('certificates');
    const [applications, setApplications] = useState([]);
    const [citizens, setCitizens] = useState([]);
    const [stats, setStats] = useState({
        totalThisWeek: 0,
        approvalRate: 0,
        totalCollected: 0,
        mostPopular: 'N/A'
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [lang, setLang] = useState('en');
    const t = translations[lang] || translations.en;

    const [proxyForm, setProxyForm] = useState({
        fullName: '', nic: '', password: '', relationship: 'Relative',
        gender: 'Male', address: '', householdNo: '',
        mobileNumber: '', dateOfBirth: '', village: '', city: '',
        occupation: '', emergencyContact: ''
    });

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectId, setRejectId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [appRes, citRes] = await Promise.all([
                api.get('/certificates/all'),
                api.get('/auth/citizens')
            ]);
            setApplications(appRes.data);
            setCitizens(citRes.data);
            calculateStats(appRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const confirmRejection = async () => {
        if (!rejectReason.trim()) {
            Alert.alert("Required", "Please provide a reason for rejection.");
            return;
        }
        try {
            await api.put(`/certificates/update/${rejectId}`, { 
                status: 'Rejected', 
                rejectionReason: rejectReason,
                officerName: user.fullName 
            });
            setShowRejectModal(false);
            setRejectReason('');
            fetchData();
        } catch (err) {
            Alert.alert("Error", "Rejection failed");
        }
    };

    const calculateStats = (apps) => {
        const approved = apps.filter(app => app.status === 'Approved').length;
        const rate = apps.length ? (approved / apps.length) * 100 : 0;
        setStats({
            totalThisWeek: apps.filter(app => new Date(app.createdAt) > new Date(Date.now() - 7 * 86400000)).length,
            approvalRate: Math.round(rate),
            totalCollected: approved * 250,
            mostPopular: 'Residency'
        });
    };

    const handleUpdateStatus = async (id, status) => {
        if (status === 'Rejected') {
            setRejectId(id);
            setShowRejectModal(true);
            return;
        }

        try {
            await api.put(`/certificates/update/${id}`, { status, officerName: user.fullName });
            fetchData();
        } catch (err) {
            Alert.alert("Error", "Update failed");
        }
    };

    const handleProxyRegister = async () => {
        if (!proxyForm.fullName || !proxyForm.nic) {
            Alert.alert("Error", "Name and NIC are required");
            return;
        }
        try {
            await api.post('/auth/register', { ...proxyForm, role: 'citizen' });
            Alert.alert("Success", t.regSuccess);
            setProxyForm({
                fullName: '', nic: '', password: '', relationship: 'Relative',
                gender: 'Male', address: '', householdNo: '',
                mobileNumber: '', dateOfBirth: '', village: '', city: '',
                occupation: '', emergencyContact: ''
            });
            fetchData();
        } catch (err) {
            Alert.alert("Error", "Registration failed");
        }
    };

    const handleExportPendingReport = async () => {
        try {
            setLoading(true);
            const pendingApps = applications.filter(a => a.status === 'Pending');
            const htmlContent = `
                <html>
                <head>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        h1 { color: #800000; text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
                        th { backgroundColor: #fff1f1; color: #800000; font-size: 12px; text-transform: uppercase; }
                        .status { font-weight: bold; color: #f59e0b; }
                    </style>
                </head>
                <body>
                    <h1>VillageFlow Pending Requests Report</h1>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                    <p>Total Pending: ${pendingApps.length}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Citizen Name</th>
                                <th>NIC</th>
                                <th>Certificate Type</th>
                                <th>Applied Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pendingApps.map(a => `
                                <tr>
                                    <td>${a.userId?.fullName || 'N/A'}</td>
                                    <td>${a.nic}</td>
                                    <td>${a.certificateType}</td>
                                    <td>${new Date(a.createdAt).toLocaleDateString()}</td>
                                    <td class="status">PENDING</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            `;
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (err) {
            Alert.alert("Error", "Could not generate report");
        } finally {
            setLoading(false);
        }
    };

    const handleExportReport = async () => {
        try {
            setLoading(true);
            // Export all applications instead of just pending
            const allApps = applications;
            const htmlContent = `
                <html>
                <head>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        h1 { color: #800000; text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
                        th { backgroundColor: #f8fafc; color: #64748b; font-size: 12px; text-transform: uppercase; }
                        .status { font-weight: bold; }
                        .status-Pending { color: #f59e0b; }
                        .status-Approved { color: #10b981; }
                        .status-Rejected { color: #ef4444; }
                    </style>
                </head>
                <body>
                    <h1>VillageFlow All Applications Report</h1>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                    <p>Total Applications: ${allApps.length}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Citizen Name</th>
                                <th>NIC</th>
                                <th>Certificate Type</th>
                                <th>Applied Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allApps.map(a => `
                                <tr>
                                    <td>${a.userId?.fullName || 'N/A'}</td>
                                    <td>${a.nic}</td>
                                    <td>${a.certificateType}</td>
                                    <td>${new Date(a.createdAt).toLocaleDateString()}</td>
                                    <td class="status status-${a.status}">${a.status}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            `;
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (err) {
            Alert.alert("Error", "Could not generate report");
        } finally {
            setLoading(false);
        }
    };

    const renderStatCard = (title, value, icon, color) => (
        <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: `${color}15` }]}>{icon}</View>
            <View>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{title}</Text>
            </View>
        </View>
    );

    const renderApplication = ({ item }) => {
        const statusColor = item.status === 'Approved' ? '#10b981' : item.status === 'Rejected' ? '#ef4444' : '#f59e0b';
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{item.userId?.fullName?.charAt(0) || 'U'}</Text></View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.cardTitle}>{item.userId?.fullName || 'Citizen'}</Text>
                        <Text style={styles.cardSub}>{item.certificateType}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                    </View>
                </View>
                {item.status === 'Pending' && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.actionBtn, styles.btnApprove]} onPress={() => handleUpdateStatus(item._id, 'Approved')}>
                            <Check size={16} color="#fff" />
                            <Text style={styles.btnTextWhite}>{t.approve}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.btnReject]} onPress={() => handleUpdateStatus(item._id, 'Rejected')}>
                            <CloseIcon size={16} color="#fff" />
                            <Text style={styles.btnTextWhite}>{t.reject}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    const renderCitizen = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.avatar, { backgroundColor: '#f1f5f9' }]}><User size={20} color="#64748b" /></View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.cardTitle}>{item.fullName}</Text>
                    <Text style={styles.cardSub}>{item.nic}</Text>
                </View>
                <TouchableOpacity onPress={() => Alert.alert("Contact", `Phone: ${item.mobileNumber || 'N/A'}`)}>
                    <Phone size={20} color="#800000" />
                </TouchableOpacity>
            </View>
            <View style={styles.detailsGrid}>
                <View style={styles.detailItem}><Home size={12} color="#64748b" /><Text style={styles.detailText}>{item.householdNo}</Text></View>
                <View style={styles.detailItem}><MapPin size={12} color="#64748b" /><Text style={styles.detailText}>{item.village}</Text></View>
            </View>
        </View>
    );

    if (loading && !refreshing) return <View style={styles.center}><ActivityIndicator size="large" color="#800000" /></View>;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.topHeader}>
                <View>
                    <Text style={styles.welcome}>{t.welcome}</Text>
                    <Text style={styles.userName}>{user?.fullName}</Text>
                </View>
                <View style={{flexDirection: 'row', gap: 10}}>
                    <TouchableOpacity onPress={() => navigation.navigate('VerifyProfile')} style={styles.headerBtn}><Camera size={20} color="#fff" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('SystemConfig')} style={styles.headerBtn}><Settings size={20} color="#fff" /></TouchableOpacity>
                    <TouchableOpacity onPress={logout} style={styles.logoutBtn}><LogOut size={20} color="#fff" /></TouchableOpacity>
                </View>
            </View>

            <View style={styles.tabBar}>
                <TouchableOpacity style={[styles.tab, activeTab === 'certificates' && styles.activeTab]} onPress={() => setActiveTab('certificates')}>
                    <FileText size={18} color={activeTab === 'certificates' ? '#800000' : '#94a3b8'} />
                    <Text style={[styles.tabText, activeTab === 'certificates' && styles.activeTabText]}>{t.certTab}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'citizens' && styles.activeTab]} onPress={() => setActiveTab('citizens')}>
                    <User size={18} color={activeTab === 'citizens' ? '#800000' : '#94a3b8'} />
                    <Text style={[styles.tabText, activeTab === 'citizens' && styles.activeTabText]}>{t.citizenTab}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'proxy' && styles.activeTab]} onPress={() => setActiveTab('proxy')}>
                    <UserPlus size={18} color={activeTab === 'proxy' ? '#800000' : '#94a3b8'} />
                    <Text style={[styles.tabText, activeTab === 'proxy' && styles.activeTabText]}>{t.proxyTab}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}>
                {activeTab === 'certificates' && (
                    <>
                        <View style={styles.statsGrid}>
                            {renderStatCard(t.pending, applications.filter(a => a.status === 'Pending').length, <Clock size={20} color="#f59e0b" />, "#f59e0b")}
                            {renderStatCard(t.approvalRate, `${stats.approvalRate}%`, <TrendingUp size={20} color="#10b981" />, "#10b981")}
                            {renderStatCard(t.total, applications.length, <FileText size={20} color="#3b82f6" />, "#3b82f6")}
                            {renderStatCard(t.collected, `Rs.${stats.totalCollected}`, <CreditCard size={20} color="#800000" />, "#800000")}
                        </View>
                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={[styles.exportBtn, {flex: 1, marginBottom: 0}]} onPress={handleExportReport}>
                                <Download size={16} color="#800000" />
                                <Text style={[styles.exportBtnText, {fontSize: 12}]}>{t.generateReport}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.exportBtn, {flex: 1, marginBottom: 0, backgroundColor: '#fff1f1', borderColor: '#800000'}]} onPress={handleExportPendingReport}>
                                <Clock size={16} color="#800000" />
                                <Text style={[styles.exportBtnText, {fontSize: 12}]}>{t.pendingReport}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchBox}>
                            <Search size={20} color="#94a3b8" />
                            <TextInput style={styles.searchInput} placeholder={t.search} value={searchTerm} onChangeText={setSearchTerm} />
                        </View>
                        {applications.filter(a => a.nic.includes(searchTerm) || a.userId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                            <View key={item._id}>{renderApplication({ item })}</View>
                        ))}
                    </>
                )}

                {activeTab === 'citizens' && (
                    <>
                        <View style={styles.searchBox}>
                            <Search size={20} color="#94a3b8" />
                            <TextInput style={styles.searchInput} placeholder={t.search} value={searchTerm} onChangeText={setSearchTerm} />
                        </View>
                        {citizens.filter(c => c.nic.includes(searchTerm) || c.fullName.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                            <View key={item._id}>{renderCitizen({ item })}</View>
                        ))}
                    </>
                )}

                {activeTab === 'proxy' && (
                    <View style={styles.formContainer}>
                        <Text style={styles.formTitle}>{t.proxyTab}</Text>
                        <Text style={styles.label}>{t.fullName}</Text>
                        <TextInput style={styles.input} value={proxyForm.fullName} onChangeText={v => setProxyForm({...proxyForm, fullName: v})} />
                        <Text style={styles.label}>{t.nic}</Text>
                        <TextInput style={styles.input} value={proxyForm.nic} onChangeText={v => setProxyForm({...proxyForm, nic: v})} />
                        <Text style={styles.label}>{t.password}</Text>
                        <TextInput style={styles.input} value={proxyForm.password} secureTextEntry onChangeText={v => setProxyForm({...proxyForm, password: v})} />
                        <Text style={styles.label}>{t.mobileNumber}</Text>
                        <TextInput style={styles.input} value={proxyForm.mobileNumber} keyboardType="phone-pad" onChangeText={v => setProxyForm({...proxyForm, mobileNumber: v})} />
                        <Text style={styles.label}>{t.household}</Text>
                        <TextInput style={styles.input} value={proxyForm.householdNo} onChangeText={v => setProxyForm({...proxyForm, householdNo: v})} />
                        <TouchableOpacity style={styles.btnPrimary} onPress={handleProxyRegister}><Text style={styles.btnTextWhite}>{t.proxyTab}</Text></TouchableOpacity>
                        <View style={{height: 40}} />
                    </View>
                )}
            </ScrollView>

            <Modal visible={showRejectModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t.rejectReason}</Text>
                        <TextInput 
                            style={styles.reasonInput} 
                            placeholder="e.g. NIC address mismatch" 
                            multiline 
                            value={rejectReason} 
                            onChangeText={setRejectReason} 
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowRejectModal(false)}>
                                <Text style={styles.btnTextDark}>{t.cancel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnRejectAction} onPress={confirmRejection}>
                                <Text style={styles.btnTextWhite}>{t.reject}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    topHeader: { backgroundColor: '#800000', padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 10 },
    welcome: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
    userName: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    headerBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
    logoutBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
    
    tabBar: { flexDirection: 'row', backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 6, elevation: 4 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
    activeTab: { backgroundColor: '#fff1f1' },
    tabText: { fontWeight: 'bold', color: '#94a3b8', fontSize: 13 },
    activeTabText: { color: '#800000' },

    scrollContent: { padding: 16 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
    statCard: { width: (width - 44) / 2, backgroundColor: '#fff', padding: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 2 },
    statIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    statLabel: { fontSize: 11, color: '#64748b' },

    exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', padding: 14, borderRadius: 16, marginBottom: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#e2e8f0' },
    exportBtnText: { color: '#800000', fontWeight: 'bold', fontSize: 14 },
    buttonRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },

    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
    searchInput: { flex: 1, padding: 14, fontSize: 15 },

    card: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#800000', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontWeight: 'bold' },
    cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
    cardSub: { fontSize: 12, color: '#64748b' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    
    detailsGrid: { flexDirection: 'row', gap: 15, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    detailText: { fontSize: 12, color: '#64748b' },

    actionRow: { flexDirection: 'row', gap: 10, marginTop: 15 },
    actionBtn: { flex: 1, flexDirection: 'row', padding: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 6 },
    btnApprove: { backgroundColor: '#10b981' },
    btnReject: { backgroundColor: '#ef4444' },
    btnTextWhite: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

    formContainer: { backgroundColor: '#fff', padding: 24, borderRadius: 24, elevation: 4 },
    formTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 20 },
    label: { fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 8, marginTop: 12 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14 },
    btnPrimary: { backgroundColor: '#800000', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 24 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
    reasonInput: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 15, height: 100, textAlignVertical: 'top', marginBottom: 20 },
    modalActions: { flexDirection: 'row', gap: 10 },
    btnSecondary: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
    btnRejectAction: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center' },
    btnTextDark: { color: '#1e293b', fontWeight: 'bold' }
});

export default DashboardScreen;
