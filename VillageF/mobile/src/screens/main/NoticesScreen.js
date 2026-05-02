import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  TouchableOpacity, Modal, TextInput, Alert, ScrollView, RefreshControl
} from 'react-native';
import { 
  Megaphone, PlusCircle, Edit3, Trash2, Calendar, 
  Clock, X, Tag, AlertTriangle, Info
} from 'lucide-react-native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORIES = ['General', 'Welfare', 'Health', 'Development', 'Emergency'];

const translations = {
    en: {
        title: "Notice Board", add: "Post Notice", noData: "No notices available",
        cat: "Category", noticeTitle: "Title", desc: "Description", 
        si: "Sinhala", ta: "Tamil", en: "English",
        save: "Post Notice", edit: "Edit Notice", new: "New Notice",
        deleteConfirm: "Remove this notice permanently?", cancel: "Cancel", delete: "Delete"
    },
    si: {
        title: "දැන්වීම් පුවරුව", add: "දැන්වීමක් පළ කරන්න", noData: "දැන්වීම් නොමැත",
        cat: "වර්ගය", noticeTitle: "මාතෘකාව", desc: "විස්තරය", 
        si: "සිංහල", ta: "දෙමළ", en: "ඉංග්‍රීසි",
        save: "දැන්වීම පළ කරන්න", edit: "දැන්වීම සංස්කරණය", new: "නව දැන්වීමක්",
        deleteConfirm: "මෙම දැන්වීම මකා දැමීමට ඔබට විශ්වාසද?", cancel: "අවලංගු කරන්න", delete: "මකන්න"
    },
    ta: {
        title: "அறிவிப்பு பலகை", add: "அறிவிப்பு சேர்க்க", noData: "அறிவிப்புகள் எதுவும் இல்லை",
        cat: "வகை", noticeTitle: "தலைப்பு", desc: "விளக்கம்", 
        si: "சிங்களம்", ta: "தமிழ்", en: "ஆங்கிலம்",
        save: "அறிவிப்பை சேமி", edit: "அறிவிப்பை திருத்து", new: "புதிய அறிவிப்பு",
        deleteConfirm: "இந்த அறிவிப்பை நீக்க விரும்புகிறீர்களா?", cancel: "ரத்துசெய்", delete: "நீக்கு"
    }
};

export default function NoticesScreen() {
    const { user } = useContext(AuthContext);
    const isOfficer = user?.role === 'officer';
    
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lang, setLang] = useState('en');
    const t = translations[lang];
    
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({ 
        title: '', 
        desc_si: '', 
        desc_ta: '', 
        desc_en: '', 
        category: 'General' 
    });

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        try {
            const res = await api.get('/notices/all');
            setNotices(res.data.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate)));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSave = async () => {
        if (!formData.title || !formData.desc_si) {
            Alert.alert("Error", "Title and Sinhala description are required");
            return;
        }

        setSubmitting(true);
        try {
            if (isEditing) {
                await api.put(`/notices/update/${isEditing}`, formData);
                Alert.alert("Success", "Notice updated");
            } else {
                await api.post('/notices/add', formData);
                Alert.alert("Success", "Notice posted");
            }
            resetForm();
            fetchNotices();
        } catch (err) {
            Alert.alert("Error", "Failed to save notice");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (id) => {
        Alert.alert("Delete", t.deleteConfirm, [
            { text: t.cancel, style: "cancel" },
            { 
                text: t.delete, 
                style: "destructive",
                onPress: async () => {
                    try {
                        await api.delete(`/notices/delete/${id}`);
                        fetchNotices();
                    } catch (err) {
                        Alert.alert("Error", "Failed to delete");
                    }
                }
            }
        ]);
    };

    const resetForm = () => {
        setFormData({ 
            title: '', 
            desc_si: '', 
            desc_ta: '', 
            desc_en: '', 
            category: 'General' 
        });
        setIsEditing(null);
        setShowForm(false);
    };

    const renderNoticeCard = ({ item }) => {
        const desc = lang === 'si' ? item.desc_si : lang === 'ta' ? item.desc_ta : (item.desc_en || item.desc_si);

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.iconBox}>
                        <Megaphone size={24} color="#800000" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardSub}>{item.category} • {new Date(item.postedDate).toLocaleDateString()}</Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.descText}>{desc}</Text>
                </View>

                {isOfficer && (
                    <View style={styles.cardActions}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => { setFormData(item); setIsEditing(item._id); setShowForm(true); }}>
                            <Edit3 size={18} color="#2563eb" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item._id)}>
                            <Trash2 size={18} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    if (loading && !refreshing) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#800000" /></View>;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>{t.title}</Text>
                    <Text style={styles.headerSub}>{notices.length} Active announcements</Text>
                </View>
                <View style={styles.langSelector}>
                    <TouchableOpacity onPress={() => setLang('si')} style={[styles.langBtn, lang === 'si' && styles.langBtnActive]}><Text style={styles.langText}>SI</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setLang('en')} style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}><Text style={styles.langText}>EN</Text></TouchableOpacity>
                </View>
            </View>

            <FlatList 
                data={notices}
                keyExtractor={item => item._id}
                renderItem={renderNoticeCard}
                contentContainerStyle={styles.listPadding}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotices(); }} colors={['#800000']} />}
                ListEmptyComponent={<View style={styles.empty}><Info size={40} color="#cbd5e1" /><Text style={styles.emptyText}>{t.noData}</Text></View>}
            />

            {isOfficer && (
                <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)}>
                    <PlusCircle size={30} color="#fff" />
                </TouchableOpacity>
            )}

            <Modal visible={showForm} animationType="slide">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{isEditing ? t.edit : t.add}</Text>
                        <TouchableOpacity onPress={resetForm}><X size={24} color="#1e293b" /></TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalContent}>
                        <Text style={styles.label}>{t.noticeTitle}</Text>
                        <TextInput style={styles.input} value={formData.title} onChangeText={v => setFormData({...formData, title: v})} />

                        <Text style={styles.label}>{t.cat}</Text>
                        <View style={styles.pickerContainer}>
                            {CATEGORIES.map(cat => (
                                <TouchableOpacity 
                                    key={cat} 
                                    style={[styles.pickerItem, formData.category === cat && styles.pickerItemActive]}
                                    onPress={() => setFormData({...formData, category: cat})}
                                >
                                    <Text style={[styles.pickerText, formData.category === cat && styles.pickerTextActive]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>{t.desc} {t.si}</Text>
                        <TextInput style={[styles.input, styles.textArea]} multiline numberOfLines={4} value={formData.desc_si} onChangeText={v => setFormData({...formData, desc_si: v})} />

                        <Text style={styles.label}>{t.desc} {t.ta}</Text>
                        <TextInput style={[styles.input, styles.textArea]} multiline numberOfLines={4} value={formData.desc_ta} onChangeText={v => setFormData({...formData, desc_ta: v})} />

                        <Text style={styles.label}>{t.desc} {t.en}</Text>
                        <TextInput style={[styles.input, styles.textArea]} multiline numberOfLines={4} value={formData.desc_en} onChangeText={v => setFormData({...formData, desc_en: v})} />

                        <TouchableOpacity style={styles.btnPrimary} onPress={handleSave} disabled={submitting}>
                            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>{t.save}</Text>}
                        </TouchableOpacity>
                        <View style={{height: 40}} />
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { 
        backgroundColor: '#800000', padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 8
    },
    headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
    langSelector: { flexDirection: 'row', gap: 8 },
    langBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
    langBtnActive: { backgroundColor: '#f2b713' },
    langText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

    listPadding: { padding: 16, paddingBottom: 100 },
    card: { 
        backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16,
        elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#f1f5f9'
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    iconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#fff1f1', justifyContent: 'center', alignItems: 'center' },
    cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#1e293b' },
    cardSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
    
    cardBody: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15 },
    descText: { fontSize: 14, color: '#475569', lineHeight: 22 },

    cardActions: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15, flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    iconBtn: { padding: 10, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },

    fab: { 
        position: 'absolute', bottom: 30, right: 30, width: 64, height: 64, borderRadius: 32, 
        backgroundColor: '#800000', justifyContent: 'center', alignItems: 'center', elevation: 10 
    },

    modalContainer: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    modalContent: { padding: 24 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 8, marginTop: 16 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16 },
    textArea: { textAlignVertical: 'top' },
    
    pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
    pickerItem: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    pickerItemActive: { backgroundColor: '#800000', borderColor: '#800000' },
    pickerText: { fontSize: 13, color: '#64748b' },
    pickerTextActive: { color: '#fff', fontWeight: 'bold' },

    btnPrimary: { backgroundColor: '#800000', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 32 },
    btnPrimaryText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    
    empty: { alignItems: 'center', marginTop: 100, gap: 15 },
    emptyText: { color: '#94a3b8', fontSize: 16, fontWeight: '500' }
});
