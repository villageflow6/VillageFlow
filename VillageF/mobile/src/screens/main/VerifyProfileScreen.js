import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, Alert, 
    ActivityIndicator, Dimensions, Image, ScrollView 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { 
    ShieldCheck, X, Camera, RefreshCw, User, 
    Shield, MapPin, CheckCircle2, ArrowLeft 
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

const { width } = Dimensions.get('window');

export default function VerifyProfileScreen({ navigation }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState(null);

    if (!permission) return <View />;
    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.btn}>
                    <Text style={styles.btnText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarCodeScanned = async ({ data }) => {
        if (scanned) return;
        setScanned(true);
        setLoading(true);

        try {
            // Data expected is the user ID from QR
            const res = await api.get(`/auth/user/${data}`);
            if (res.data) {
                setUserData(res.data);
            } else {
                Alert.alert("Error", "User not found in registry");
                setScanned(false);
            }
        } catch (err) {
            Alert.alert("Error", "Invalid QR code or network error");
            setScanned(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Digital ID Scanner</Text>
            </View>

            {!userData ? (
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={styles.camera}
                        facing="back"
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr"],
                        }}
                    >
                        <View style={styles.overlay}>
                            <View style={styles.unfocusedContainer}></View>
                            <View style={styles.focusedRow}>
                                <View style={styles.unfocusedContainer}></View>
                                <View style={styles.focusedContainer}>
                                    <View style={[styles.corner, styles.topLeft]} />
                                    <View style={[styles.corner, styles.topRight]} />
                                    <View style={[styles.corner, styles.bottomLeft]} />
                                    <View style={[styles.corner, styles.bottomRight]} />
                                </View>
                                <View style={styles.unfocusedContainer}></View>
                            </View>
                            <View style={styles.unfocusedContainer}>
                                <Text style={styles.hint}>Align QR Code within the frame</Text>
                            </View>
                        </View>
                    </CameraView>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.resultContent}>
                    <View style={styles.profileCard}>
                        <View style={styles.profileHeader}>
                            <View style={styles.avatarBox}>
                                <User size={40} color="#800000" />
                            </View>
                            <View style={styles.statusBadge}>
                                <CheckCircle2 size={16} color="#10b981" />
                                <Text style={styles.statusText}>VERIFIED</Text>
                            </View>
                        </View>

                        <Text style={styles.nameText}>{userData.fullName}</Text>
                        <Text style={styles.nicText}>NIC: {userData.nic}</Text>

                        <View style={styles.divider} />

                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Shield size={16} color="#64748b" />
                                <Text style={styles.infoLabel}>Role</Text>
                                <Text style={styles.infoValue}>{userData.role.toUpperCase()}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <MapPin size={16} color="#64748b" />
                                <Text style={styles.infoLabel}>Division</Text>
                                <Text style={styles.infoValue}>{userData.gnDivision}</Text>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={styles.resetBtn} 
                            onPress={() => { setUserData(null); setScanned(false); }}
                        >
                            <RefreshCw size={20} color="#fff" />
                            <Text style={styles.resetBtnText}>Scan Another</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#800000" />
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
    backBtn: { padding: 8, borderRadius: 12, backgroundColor: '#f1f5f9' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginLeft: 15 },
    
    cameraContainer: { flex: 1 },
    camera: { flex: 1 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    unfocusedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    focusedRow: { flexDirection: 'row', height: width * 0.7 },
    focusedContainer: { width: width * 0.7, position: 'relative' },
    corner: { position: 'absolute', width: 40, height: 40, borderColor: '#f2b713', borderWidth: 4 },
    topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    hint: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 20 },
    
    resultContent: { padding: 20 },
    profileCard: { backgroundColor: '#fff', borderRadius: 32, padding: 30, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20 },
    profileHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    avatarBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff5f5', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#800000' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ecfdf5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusText: { color: '#10b981', fontWeight: 'bold', fontSize: 12 },
    nameText: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', textAlign: 'center' },
    nicText: { fontSize: 16, color: '#64748b', marginTop: 5 },
    divider: { width: '100%', height: 1, backgroundColor: '#f1f5f9', marginVertical: 25 },
    infoGrid: { width: '100%', flexDirection: 'row', gap: 20 },
    infoItem: { flex: 1, backgroundColor: '#f8fafc', padding: 15, borderRadius: 16, alignItems: 'center' },
    infoLabel: { fontSize: 12, color: '#94a3b8', marginTop: 5 },
    infoValue: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
    resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#800000', paddingVertical: 16, paddingHorizontal: 30, borderRadius: 16, marginTop: 30 },
    resetBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' }
});
