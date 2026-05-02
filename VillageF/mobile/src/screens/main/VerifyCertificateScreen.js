import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    ActivityIndicator, TextInput, Dimensions, Animated, Alert
} from 'react-native';
import { 
    ShieldCheck, CheckCircle2, XCircle, Search, 
    FileText, User, Calendar, Shield, ArrowLeft,
    AlertCircle, Info
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

const { width } = Dimensions.get('window');

export default function VerifyCertificateScreen() {
    const navigation = useNavigation();
    const [certId, setCertId] = useState('');
    const [certData, setCertData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = async (idToVerify) => {
        const id = idToVerify || certId;
        if (!id.trim()) return;

        setLoading(true);
        setError('');
        setCertData(null);

        try {
            const res = await api.get(`/certificates/verify/${id.trim()}`);
            if (res.data && res.data.valid) {
                setCertData({
                    ...res.data.data,
                    _id: id // Keep the ID for display
                });
            } else {
                setError(res.data.message || 'Document Not Found: No certificate matches this ID in the VillageFlow registry.');
            }
        } catch (err) {
            if (err.response && err.response.status === 404) {
                setError('Document Not Found: No certificate matches this ID in the VillageFlow registry.');
            } else if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('System Connectivity Error: Please check your internet and try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Validator</Text>
                <View style={{width: 44}} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.heroCard}>
                    <View style={styles.heroIconBox}>
                        <ShieldCheck size={40} color="#800000" />
                    </View>
                    <Text style={styles.heroTitle}>Trust & Verification</Text>
                    <Text style={styles.heroSub}>Authenticate official Grama Niladhari documents instantly.</Text>
                    
                    <View style={styles.searchBox}>
                        <Search size={20} color="#94a3b8" />
                        <TextInput 
                            style={styles.searchInput}
                            placeholder="Enter 24-digit Document ID"
                            value={certId}
                            onChangeText={setCertId}
                            autoCapitalize="none"
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.verifyBtn, loading && styles.btnDisabled]} 
                        onPress={() => handleVerify()}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <ShieldCheck size={20} color="#fff" />
                                <Text style={styles.verifyBtnText}>Verify Authenticity</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {error ? (
                    <View style={styles.errorCard}>
                        <View style={styles.errorIconBox}>
                            <AlertCircle size={32} color="#ef4444" />
                        </View>
                        <Text style={styles.errorTitle}>Validation Failed</Text>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={() => {setError(''); setCertId('');}}>
                            <Text style={styles.retryText}>Clear and Try Again</Text>
                        </TouchableOpacity>
                    </View>
                ) : certData ? (
                    <View style={styles.successCard}>
                        <View style={styles.successHeader}>
                            <View style={styles.successIconBox}>
                                <CheckCircle2 size={32} color="#10b981" />
                            </View>
                            <View>
                                <Text style={styles.successTitle}>Verified Document</Text>
                                <Text style={styles.successSub}>VillageFlow Official Record</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.dataGrid}>
                            <View style={styles.dataItem}>
                                <Text style={styles.dataLabel}>HOLDER NAME</Text>
                                <Text style={styles.dataValue}>{certData.name || 'N/A'}</Text>
                            </View>
                            <View style={styles.dataItem}>
                                <Text style={styles.dataLabel}>DOCUMENT TYPE</Text>
                                <Text style={styles.dataValue}>{certData.type}</Text>
                            </View>
                            <View style={styles.dataItem}>
                                <Text style={styles.dataLabel}>NIC NUMBER</Text>
                                <Text style={styles.dataValue}>{certData.nic}</Text>
                            </View>
                            <View style={styles.dataItem}>
                                <Text style={styles.dataLabel}>ISSUED DATE</Text>
                                <Text style={styles.dataValue}>{new Date(certData.date).toLocaleDateString()}</Text>
                            </View>
                        </View>

                        <View style={styles.securitySeal}>
                            <Shield size={16} color="#047857" />
                            <Text style={styles.sealText}>Blockchain Secured Fingerprint: {certData._id.substring(0, 12)}...</Text>
                        </View>
                        
                        <TouchableOpacity style={styles.viewDocBtn} onPress={() => Alert.alert("Digital Vault", "Accessing official repository...")}>
                            <FileText size={18} color="#fff" />
                            <Text style={styles.viewDocText}>View Original Document</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.placeholder}>
                        <Info size={20} color="#94a3b8" />
                        <Text style={styles.placeholderText}>Certificates generated after Jan 2024 include a unique ID at the bottom right corner.</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
    
    scrollContent: { padding: 20 },
    heroCard: { backgroundColor: '#fff', borderRadius: 32, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 20, elevation: 3, borderWidth: 1, borderColor: '#f1f5f9' },
    heroIconBox: { width: 80, height: 80, borderRadius: 30, backgroundColor: '#fff5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    heroTitle: { fontSize: 24, fontWeight: '900', color: '#1e293b', marginBottom: 8 },
    heroSub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 30 },
    
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, paddingHorizontal: 15, borderWidth: 1, borderColor: '#e2e8f0', width: '100%', marginBottom: 15 },
    searchInput: { flex: 1, padding: 16, fontSize: 15, fontWeight: '600', color: '#1e293b' },
    
    verifyBtn: { backgroundColor: '#800000', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16, width: '100%', gap: 10, shadowColor: '#800000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
    btnDisabled: { opacity: 0.7 },
    verifyBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    
    successCard: { backgroundColor: '#fff', borderRadius: 32, padding: 25, marginTop: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20, elevation: 5, borderLeftWidth: 6, borderLeftColor: '#10b981' },
    successHeader: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    successIconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#ecfdf5', justifyContent: 'center', alignItems: 'center' },
    successTitle: { fontSize: 18, fontWeight: '800', color: '#065f46' },
    successSub: { fontSize: 12, color: '#059669', fontWeight: '600' },
    
    divider: { height: 1, backgroundColor: '#f1f5f9', width: '100%', marginVertical: 20 },
    
    dataGrid: { gap: 15 },
    dataItem: { gap: 4 },
    dataLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
    dataValue: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    
    securitySeal: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', padding: 12, borderRadius: 12, marginTop: 20 },
    sealText: { fontSize: 11, color: '#047857', fontWeight: '700' },
    
    viewDocBtn: { backgroundColor: '#1e293b', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 16, marginTop: 20, gap: 10 },
    viewDocText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    errorCard: { backgroundColor: '#fff', borderRadius: 32, padding: 30, marginTop: 25, alignItems: 'center', borderLeftWidth: 6, borderLeftColor: '#ef4444' },
    errorIconBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    errorTitle: { fontSize: 18, fontWeight: '800', color: '#991b1b' },
    errorText: { fontSize: 13, color: '#b91c1c', textAlign: 'center', marginTop: 8, lineHeight: 20 },
    retryBtn: { marginTop: 20, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#fef2f2' },
    retryText: { color: '#ef4444', fontWeight: '800', fontSize: 13 },

    placeholder: { marginTop: 40, paddingHorizontal: 30, alignItems: 'center', gap: 10 },
    placeholderText: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 }
});
