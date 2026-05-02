import React, { useState, useEffect, useContext } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    FlatList, ActivityIndicator, Alert, TextInput, Modal, 
    KeyboardAvoidingView, Platform, RefreshControl
} from 'react-native';
import { 
    Package, PlusCircle, Search, CheckCircle2, Clock, 
    AlertTriangle, X, Edit, Trash2, ArrowRight,
    MapPin, Tag, Calendar, Shield, Info, FileText,
    DollarSign, User, List, ChevronDown, Check,
    AlertCircle, TrendingUp, Search as SearchIcon,
    Printer, Filter, RefreshCw, LayoutDashboard, Truck, Bell, Download,
    RotateCcw, ShieldAlert, History, Activity, CalendarDays
} from 'lucide-react-native';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const GOVERNMENT_ASSET_LIST = [
    "Office Desk - Wooden", "Office Chair - Ergonomic", "Steel Cupboard", "Computer Desktop Set",
    "Laptop Computer", "Laser Printer", "Photocopy Machine", "Air Conditioner Unit",
    "Ceiling Fan", "Water Dispenser", "Conference Table", "File Rack",
    "Projector", "Scanner", "UPS Unit", "Telephone System", "Fire Extinguisher",
    "Wall Clock", "First Aid Box", "Paper Shredder", "Motor Vehicle", "Office Van",
    "Motorcycle", "Bicycle", "Office Sofa Set", "Whiteboard", "Notice Board",
    "Calculators", "Fingerprint Machine", "CCTV Camera", "Network Router", "Server Rack",
    "Public Address System", "Water Tank", "Generator", "Grass Cutter", "Electric Kettle",
    "Microphone Set", "Tool Kit", "Heavy Duty Stapler", "Library Cupboard", "Wooden Bench",
    "Digital Camera", "Refrigerator", "Microwave Oven", "Handheld GPS", "Binoculars",
    "Solar Panel System", "Extension Cord", "Emergency Lamp"
].sort();

const CATEGORIES = ['Office Equipment', 'Electronics', 'Vehicles', 'Furniture', 'Machinery', 'Safety Equipment', 'Other'];

export default function InventoryScreen() {
    const { user } = useContext(AuthContext);
    const isOfficer = user?.role === 'officer';
    const [assets, setAssets] = useState([]);
    const [requests, setRequests] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('inventory');
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [showAssetModal, setShowAssetModal] = useState(false);
    const [isPickingItem, setIsPickingItem] = useState(false);
    const [itemSearch, setItemSearch] = useState('');
    const [showBorrowModal, setShowBorrowModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    // FULL STATE PARITY WITH WEB
    const [assetForm, setAssetForm] = useState({
        itemName: '', quantity: '', condition: 'Good', location: '', 
        assignedTo: '', purchaseValue: '', category: 'Office Equipment', 
        lastServiceDate: new Date().toISOString().split('T')[0], 
        warrantyExpiry: '', notes: ''
    });

    const [borrowForm, setBorrowForm] = useState({
        requestedBy: user?.fullName || '', requestedByNic: user?.nic || '',
        expectedReturnDate: '', purpose: '', quantityRequested: '1', notes: ''
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [assetsRes, reqRes, statsRes, remRes] = await Promise.all([
                api.get('/assets/all'),
                api.get('/assets/requests/all'),
                api.get('/assets/statistics/detailed'),
                isOfficer ? api.get('/assets/reminders/pending') : Promise.resolve({ data: [] })
            ]);
            setAssets(assetsRes.data || []);
            setRequests(isOfficer ? reqRes.data : reqRes.data.filter(r => r.requestedByNic === user?.nic));
            setStats(statsRes.data);
            setReminders(remRes.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); setRefreshing(false); }
    };

    const handleSaveAsset = async () => {
        if (!assetForm.itemName || !assetForm.quantity) { Alert.alert("Error", "Name and Qty are required"); return; }
        try {
            const payload = { ...assetForm, quantity: parseInt(assetForm.quantity), purchaseValue: assetForm.purchaseValue ? parseFloat(assetForm.purchaseValue) : 0 };
            if (selectedAsset) await api.put(`/assets/update/${selectedAsset._id}`, payload);
            else await api.post('/assets/add', payload);
            setShowAssetModal(false); fetchData();
            Alert.alert("Success", "Asset database updated.");
        } catch (err) { Alert.alert("Error", "Failed to save asset."); }
    };

    const handleDeleteAsset = (id) => {
        Alert.alert("Delete Asset", "Are you sure you want to permanently delete this asset from the inventory?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                try {
                    await api.delete(`/assets/delete/${id}`);
                    fetchData();
                    Alert.alert("Deleted", "Asset removed successfully.");
                } catch (err) { Alert.alert("Error", "Delete operation failed."); }
            }}
        ]);
    };

    const handleBorrowSubmit = async () => {
        if (!borrowForm.expectedReturnDate || !borrowForm.requestedBy) { Alert.alert("Required", "Fill mandatory fields"); return; }
        try {
            await api.post('/assets/requests/create', { ...borrowForm, assetId: selectedAsset._id, assetName: selectedAsset.itemName });
            setShowBorrowModal(false); fetchData();
            Alert.alert("Success", "Request submitted.");
        } catch (err) { Alert.alert("Error", "Failed to submit."); }
    };

    const handleResolveAlert = (id) => {
        api.put(`/assets/reminders/${id}/resolve`).then(() => { fetchData(); Alert.alert("Resolved", "Alert cleared."); }).catch(err => console.error(err));
    };

    const generatePDF = async () => {
        const html = `<html><body><h1 style="color:#800000;text-align:center;">Asset Report</h1><table border="1" style="width:100%;border-collapse:collapse;"><tr><th>Asset</th><th>Qty</th><th>Status</th></tr>${assets.map(a => `<tr><td>${a.itemName}</td><td>${a.quantity}</td><td>${a.condition}</td></tr>`).join('')}</table></body></html>`;
        try { const { uri } = await Print.printToFileAsync({ html }); await Sharing.shareAsync(uri); } catch (err) { Alert.alert("Error", "PDF failed"); }
    };

    const calculateHealth = (date, cond) => {
        if (!date) return 50;
        const diff = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
        let score = 100 - (diff / 10);
        if (cond === 'Damaged') score -= 50; else if (cond === 'Need Repair') score -= 25;
        return Math.max(0, Math.min(100, score));
    };

    const filteredAssets = assets.filter(a => {
        const matchesSearch = a.itemName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCat = filterCategory === 'All' || a.category === filterCategory;
        return matchesSearch && matchesCat;
    });

    const renderAsset = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardTop}>
                <View style={styles.iconBox}><Package size={22} color="#800000" /></View>
                <View style={{ flex: 1, marginLeft: 12 }}><Text style={styles.cardTitle}>{item.itemName}</Text><Text style={styles.cardSub}>{item.category} | Qty: {item.quantity}</Text></View>
                <View style={[styles.badge, item.condition === 'Good' ? styles.badgeGood : styles.badgeBad]}><Text style={styles.badgeText}>{item.condition}</Text></View>
            </View>
            <View style={styles.healthRow}>
                <View style={styles.healthBg}><View style={[styles.healthFill, { width: `${calculateHealth(item.lastServiceDate, item.condition)}%`, backgroundColor: calculateHealth(item.lastServiceDate, item.condition) > 70 ? '#10b981' : '#f59e0b' }]} /></View>
                <Text style={styles.healthText}>{Math.round(calculateHealth(item.lastServiceDate, item.condition))}% Health</Text>
            </View>
            <View style={styles.cardBtns}>
                <TouchableOpacity onPress={() => { setSelectedAsset(item); setBorrowForm({...borrowForm, quantityRequested:'1'}); setShowBorrowModal(true); }} style={styles.btnIcon}><Truck size={18} color="#8b5cf6" /></TouchableOpacity>
                {isOfficer && (
                    <>
                        <TouchableOpacity onPress={() => { setSelectedAsset(item); setAssetForm({...item, quantity: item.quantity.toString(), lastServiceDate: item.lastServiceDate?.split('T')[0] || '', purchaseValue: item.purchaseValue?.toString() || '', warrantyExpiry: item.warrantyExpiry?.split('T')[0] || ''}); setIsPickingItem(false); setShowAssetModal(true); }} style={styles.btnIcon}><Edit size={16} color="#2563eb" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteAsset(item._id)} style={styles.btnIcon}><Trash2 size={16} color="#ef4444" /></TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View><Text style={styles.headerTitle}>Asset Command</Text><Text style={styles.headerSub}>{assets.length} Total Items</Text></View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={() => api.post('/assets/reminders/check-all').then(fetchData)} style={styles.headerBtn}><RefreshCw size={18} color="#fff" /></TouchableOpacity>
                        <TouchableOpacity onPress={generatePDF} style={styles.headerBtn}><Printer size={18} color="#fff" /></TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.statsStrip}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:20, gap:12}}>
                    <View style={styles.statCard}><LayoutDashboard size={14} color="#800000" /><Text style={styles.statVal}>{assets.length}</Text><Text style={styles.statLabel}>Total</Text></View>
                    <View style={styles.statCard}><CheckCircle2 size={14} color="#10b981" /><Text style={styles.statVal}>{assets.filter(a => a.condition === 'Good').length}</Text><Text style={styles.statLabel}>Good</Text></View>
                    <View style={styles.statCard}><Truck size={14} color="#3b82f6" /><Text style={styles.statVal}>{requests.filter(r => r.status === 'Pending').length}</Text><Text style={styles.statLabel}>Reqs</Text></View>
                    <View style={styles.statCard}><Bell size={14} color="#ef4444" /><Text style={styles.statVal}>{reminders.length}</Text><Text style={styles.statLabel}>Alerts</Text></View>
                </ScrollView>
            </View>

            <View style={styles.tabs}>
                {['inventory', 'requests', 'alerts'].map(tab => (
                    <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab.toUpperCase()}</Text>
                        {tab === 'alerts' && reminders.length > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{reminders.length}</Text></View>}
                    </TouchableOpacity>
                ))}
            </View>

            {loading && !refreshing ? <ActivityIndicator style={{marginTop:50}} color="#800000" /> : (
                <FlatList 
                    data={activeTab === 'inventory' ? filteredAssets : activeTab === 'requests' ? requests : reminders}
                    renderItem={activeTab === 'inventory' ? renderAsset : activeTab === 'requests' ? (({item}) => (
                        <View style={styles.card}>
                            <View style={styles.cardTop}>
                                <View style={[styles.iconBox, {backgroundColor:'#fffbeb'}]}><Clock size={22} color="#f59e0b" /></View>
                                <View style={{ flex: 1, marginLeft: 12 }}><Text style={styles.cardTitle}>{item.assetName}</Text><Text style={styles.cardSub}>By: {item.requestedBy} | Qty: {item.quantityRequested}</Text></View>
                                <View style={[styles.badge, item.status === 'Approved' ? styles.badgeGood : styles.badgePending]}><Text style={styles.badgeText}>{item.status}</Text></View>
                            </View>
                            {isOfficer && item.status === 'Pending' && (
                                <View style={styles.cardBtns}>
                                    <TouchableOpacity onPress={() => api.put(`/assets/requests/${item._id}/approve`, { approvedBy: user.fullName }).then(fetchData)} style={[styles.btnPrimary, {backgroundColor:'#10b981'}]}><Text style={styles.btnText}>Approve</Text></TouchableOpacity>
                                    <TouchableOpacity onPress={() => api.put(`/assets/requests/${item._id}/reject`, { rejectedBy: user.fullName }).then(fetchData)} style={[styles.btnPrimary, {backgroundColor:'#ef4444'}]}><Text style={styles.btnText}>Reject</Text></TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )) : (({item}) => (
                        <View style={[styles.card, item.priority === 'High' && styles.cardUrgent]}>
                            <View style={styles.cardTop}>
                                <View style={[styles.iconBox, {backgroundColor:'#fef2f2'}]}><AlertTriangle size={22} color="#ef4444" /></View>
                                <View style={{ flex: 1, marginLeft: 12 }}><Text style={styles.cardTitle}>{item.assetName}</Text><Text style={styles.cardSub}>{item.type} ALERT • {item.priority}</Text></View>
                            </View>
                            <Text style={{marginTop:10, fontSize:12, color:'#334155'}}>{item.message}</Text>
                            <View style={styles.cardBtns}><TouchableOpacity onPress={() => handleResolveAlert(item._id)} style={[styles.btnPrimary, {backgroundColor:'#10b981', flex:1}]}><Check size={16} color="#fff" /><Text style={styles.btnText}> Resolve Alert</Text></TouchableOpacity></View>
                        </View>
                    ))}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchData();}} />}
                />
            )}

            {isOfficer && activeTab === 'inventory' && (
                <TouchableOpacity onPress={() => { setSelectedAsset(null); setAssetForm({itemName:'', quantity:'', condition:'Good', category:'Office Equipment', location:'', assignedTo:'', purchaseValue:'', lastServiceDate: new Date().toISOString().split('T')[0], warrantyExpiry:'', notes:''}); setIsPickingItem(false); setShowAssetModal(true); }} style={styles.fab}><PlusCircle size={30} color="#fff" /></TouchableOpacity>
            )}

            {/* FULL WEB PARITY FORMS PROTECTED */}
            <Modal visible={showAssetModal} animationType="slide" transparent={true}>
                <View style={styles.modalBackdrop}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBody}>
                        <View style={styles.modalHeader}><Text style={styles.modalTitle}>{isPickingItem ? "Select Name" : "Asset Registry"}</Text><TouchableOpacity onPress={() => isPickingItem ? setIsPickingItem(false) : setShowAssetModal(false)} style={styles.closeBtn}><X size={20} color="#000" /></TouchableOpacity></View>
                        {isPickingItem ? (
                            <View style={{ flex: 1, padding: 15 }}>
                                <View style={styles.searchBoxSmall}><SearchIcon size={16} color="#94a3b8" /><TextInput style={styles.searchInputSmall} placeholder="Search types..." value={itemSearch} onChangeText={setItemSearch} /></View>
                                <FlatList data={GOVERNMENT_ASSET_LIST.filter(i => i.toLowerCase().includes(itemSearch.toLowerCase()))} keyExtractor={i => i} renderItem={({item}) => (
                                    <TouchableOpacity onPress={() => { setAssetForm({...assetForm, itemName: item}); setIsPickingItem(false); }} style={styles.pickerItem}><Text style={styles.pickerItemText}>{item}</Text><ArrowRight size={14} color="#e2e8f0" /></TouchableOpacity>
                                )} />
                            </View>
                        ) : (
                            <ScrollView contentContainerStyle={styles.form}>
                                <Text style={styles.label}>Asset Name *</Text>
                                <TouchableOpacity onPress={() => setIsPickingItem(true)} style={styles.pickerTrigger}><Text>{assetForm.itemName || "-- Select Asset --"}</Text><ChevronDown size={18} color="#64748b" /></TouchableOpacity>
                                <View style={styles.formRow}>
                                    <View style={{flex:1}}><Text style={styles.label}>Quantity *</Text><TextInput style={styles.input} value={assetForm.quantity} onChangeText={v => setAssetForm({...assetForm, quantity:v})} keyboardType="numeric" /></View>
                                    <View style={{width:15}} /><View style={{flex:1}}><Text style={styles.label}>Condition</Text><TouchableOpacity style={styles.input} onPress={() => setAssetForm({...assetForm, condition: assetForm.condition === 'Good' ? 'Need Repair' : 'Good'})}><Text>{assetForm.condition}</Text></TouchableOpacity></View>
                                </View>
                                <Text style={styles.label}>Category</Text><View style={styles.categoryWrap}>{CATEGORIES.map(c => <TouchableOpacity key={c} onPress={() => setAssetForm({...assetForm, category:c})} style={[styles.catBtn, assetForm.category === c && styles.catBtnActive]}><Text style={[styles.catText, assetForm.category === c && styles.catTextActive]}>{c}</Text></TouchableOpacity>)}</View>
                                <Text style={styles.label}>Location</Text><TextInput style={styles.input} value={assetForm.location} onChangeText={v => setAssetForm({...assetForm, location:v})} />
                                <Text style={styles.label}>Assigned To</Text><TextInput style={styles.input} value={assetForm.assignedTo} onChangeText={v => setAssetForm({...assetForm, assignedTo:v})} />
                                <View style={styles.formRow}>
                                    <View style={{flex:1}}><Text style={styles.label}>Value (Rs)</Text><TextInput style={styles.input} value={assetForm.purchaseValue} onChangeText={v => setAssetForm({...assetForm, purchaseValue:v})} keyboardType="numeric" /></View>
                                    <View style={{width:15}} /><View style={{flex:1}}><Text style={styles.label}>Service Date</Text><TextInput style={styles.input} value={assetForm.lastServiceDate} onChangeText={v => setAssetForm({...assetForm, lastServiceDate:v})} placeholder="YYYY-MM-DD" /></View>
                                </View>
                                <Text style={styles.label}>Warranty Expiry</Text><TextInput style={styles.input} value={assetForm.warrantyExpiry} onChangeText={v => setAssetForm({...assetForm, warrantyExpiry:v})} placeholder="YYYY-MM-DD" />
                                <TouchableOpacity onPress={handleSaveAsset} style={styles.submitBtn}><Text style={styles.submitText}>Save to Inventory</Text></TouchableOpacity>
                            </ScrollView>
                        )}
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            <Modal visible={showBorrowModal} animationType="slide" transparent={true}>
                <View style={styles.modalBackdrop}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBody}>
                        <View style={styles.modalHeader}><Text style={styles.modalTitle}>Borrow Asset</Text><TouchableOpacity onPress={() => setShowBorrowModal(false)} style={styles.closeBtn}><X size={20} color="#000" /></TouchableOpacity></View>
                        <ScrollView contentContainerStyle={styles.form}>
                            <Text style={styles.label}>Full Name *</Text><TextInput style={styles.input} value={borrowForm.requestedBy} onChangeText={v => setBorrowForm({...borrowForm, requestedBy:v})} />
                            <Text style={styles.label}>NIC Number *</Text><TextInput style={styles.input} value={borrowForm.requestedByNic} onChangeText={v => setBorrowForm({...borrowForm, requestedByNic:v})} />
                            <View style={styles.formRow}>
                                <View style={{flex:1}}><Text style={styles.label}>Qty *</Text><TextInput style={styles.input} value={borrowForm.quantityRequested} onChangeText={v => setBorrowForm({...borrowForm, quantityRequested:v})} keyboardType="numeric" /></View>
                                <View style={{width:15}} /><View style={{flex:1}}><Text style={styles.label}>Return Date</Text><TextInput style={styles.input} value={borrowForm.expectedReturnDate} onChangeText={v => setBorrowForm({...borrowForm, expectedReturnDate:v})} placeholder="YYYY-MM-DD" /></View>
                            </View>
                            <TouchableOpacity onPress={handleBorrowSubmit} style={styles.submitBtn}><Text style={styles.submitText}>Submit Request</Text></TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { backgroundColor: '#800000', padding: 25, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, elevation: 10 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
    headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 },
    headerActions: { flexDirection: 'row', gap: 12 },
    headerBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    statsStrip: { marginTop: -25, zIndex: 10 },
    statCard: { backgroundColor: '#fff', padding: 12, borderRadius: 18, alignItems: 'center', width: 85, elevation: 5 },
    statVal: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginVertical: 2 },
    statLabel: { fontSize: 9, color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' },
    tabs: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, marginTop: 20, borderRadius: 20, padding: 5, elevation: 5 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', gap: 5 },
    tabActive: { backgroundColor: '#800000' },
    tabText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 12 },
    tabTextActive: { color: '#fff' },
    tabBadge: { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
    tabBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
    filtersRow: { marginTop: 20, marginHorizontal: 0, marginBottom: 15 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 15, borderRadius: 15, height: 48, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#0f172a' },
    filterScroll: { flexDirection: 'row' },
    filterChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
    filterChipActive: { backgroundColor: '#800000', borderColor: '#800000' },
    filterChipText: { fontSize: 10, color: '#64748b', fontWeight: 'bold' },
    filterChipTextActive: { color: '#fff' },
    list: { padding: 20, paddingBottom: 100 },
    card: { backgroundColor: '#fff', borderRadius: 24, padding: 18, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
    cardUrgent: { borderColor: '#ef4444', backgroundColor: '#fff1f1' },
    cardTop: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff1f1', justifyContent: 'center', alignItems: 'center' },
    cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
    cardSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeGood: { backgroundColor: '#dcfce7' },
    badgeBad: { backgroundColor: '#fee2e2' },
    badgePending: { backgroundColor: '#fef3c7' },
    badgeText: { fontSize: 9, fontWeight: 'bold', color: '#1e293b' },
    healthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 },
    healthBg: { flex: 1, height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' },
    healthFill: { height: '100%' },
    healthText: { fontSize: 10, color: '#64748b', fontWeight: 'bold' },
    cardBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
    btnIcon: { padding: 8, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
    btnPrimary: { backgroundColor: '#800000', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    btnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    fab: { position: 'absolute', bottom: 30, right: 25, width: 60, height: 60, borderRadius: 30, backgroundColor: '#800000', justifyContent: 'center', alignItems: 'center', elevation: 8 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalBody: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '94%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
    closeBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 10 },
    form: { padding: 20, paddingBottom: 100 },
    label: { fontSize: 11, fontWeight: 'bold', color: '#64748b', marginBottom: 6, marginTop: 15, textTransform: 'uppercase' },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 14, color: '#0f172a' },
    formRow: { flexDirection: 'row' },
    pickerTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12 },
    categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
    catBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    catBtnActive: { backgroundColor: '#800000', borderColor: '#800000' },
    catText: { fontSize: 10, color: '#64748b', fontWeight: '600' },
    catTextActive: { color: '#fff' },
    submitBtn: { backgroundColor: '#800000', padding: 16, borderRadius: 15, alignItems: 'center', marginTop: 30 },
    submitText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
    searchBoxSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 12, borderRadius: 10, marginBottom: 15, height: 40 },
    searchInputSmall: { flex: 1, marginLeft: 8, fontSize: 13 },
    pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    pickerItemText: { fontSize: 14, color: '#0f172a' }
});
