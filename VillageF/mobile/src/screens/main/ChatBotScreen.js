import React, { useState, useRef, useEffect, useContext } from 'react';
import { 
    View, Text, StyleSheet, TextInput, TouchableOpacity, 
    FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
    ScrollView, Dimensions, Animated
} from 'react-native';
import { 
    Send, Bot, User, Trash2, Sparkles, MessageCircle, 
    Zap, HelpCircle, Loader2, Info, ChevronRight,
    Search, Globe, Shield
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export default function ChatBotScreen() {
    const { user } = useContext(AuthContext);
    const [chatLang, setChatLang] = useState('en');
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const flatListRef = useRef();

    const uiText = {
        si: {
            title: "VillageFlow AI සහායක",
            online: "සබැඳිව",
            typePlaceholder: "ඔබගේ ප්‍රශ්නය ලියන්න...",
            thinking: "පිළිතුර සකසමින්...",
            welcome: "👋 **ආයුබෝවන්!** මම **VillageFlow AI සහායක** වෙමි.\n\n🏛️ **ශ්‍රී ලංකා රජයේ ඩිජිටල් සේවා පද්ධතිය** වෙත ඔබව සාදරයෙන් පිළිගනිමු.\n\n📌 **මට ඔබට උදව් කළ හැකි ක්‍රම:**\n✅ ගිණුම් ලියාපදිංචිය\n✅ සහතික අයදුම්පත්\n✅ සහනාධර අයදුම්පත්\n✅ පත්වීම් වෙන්කරවා ගැනීම\n✅ ප්‍රොක්සි ලියාපදිංචිය\n\n💬 **ඔබට ඕනෑම ප්‍රශ්නයක් අසන්න පුළුවන්!**",
            suggestions: "ඉක්මන් ප්‍රශ්න"
        },
        en: {
            title: "VillageFlow AI Assistant",
            online: "Online",
            typePlaceholder: "Type your question...",
            thinking: "Thinking...",
            welcome: "👋 **Welcome!** I'm **VillageFlow AI Assistant**.\n\n🏛️ **Sri Lanka Digital Services**\n\n📌 **How I can help you:**\n✅ Account Registration\n✅ Certificate Applications\n✅ Welfare Applications\n✅ Appointment Booking\n✅ Proxy Registration\n\n💬 **Ask me anything!**",
            suggestions: "Quick Questions"
        },
        ta: {
            title: "VillageFlow AI உதவியாளர்",
            online: "இணையத்தில்",
            typePlaceholder: "உங்கள் கேள்வியை தட்டச்சு செய்யவும்...",
            thinking: "சிந்தித்துக் கொண்டிருக்கிறது...",
            welcome: "👋 **வணக்கம்!** நான் **VillageFlow AI உதவியாளர்**.\n\n🏛️ **இலங்கை அரசாங்க டிஜிட்டல் சேவைகள்**\n\n📌 **நான் உதவக்கூடிய வழிகள்:**\n✅ பதிவு & உள்நுழைவு\n✅ சான்றிதழ் விண்ணப்பங்கள்\n✅ நலன்புரி விண்ணப்பங்கள்\n✅ சந்திப்பு முன்பதிவு\n✅ ப்ராக்ஸி பதிவு\n\n💬 **என்னை எதையும் கேளுங்கள்!**",
            suggestions: "விரைவு கேள்விகள்"
        }
    };

    const t = uiText[chatLang];

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{ 
                id: 'welcome', 
                text: t.welcome, 
                isBot: true,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        }
    }, []);

    const suggestions = [
        chatLang === 'si' ? 'ලියාපදිංචි වෙන්නේ කෙසේද?' : (chatLang === 'ta' ? 'எவ்வாறு பதிவு செய்வது?' : 'How to register?'),
        chatLang === 'si' ? 'සහතිකයක් ලබා ගන්නේ කෙසේද?' : (chatLang === 'ta' ? 'சான்றிதழை எவ்வாறு பெறுவது?' : 'How to get certificate?'),
        chatLang === 'si' ? 'සහනාධර ගැන විස්තර' : (chatLang === 'ta' ? 'நலன்புரி விவரங்கள்' : 'Welfare details'),
        chatLang === 'si' ? 'ග්‍රාම නිලධාරී අමතන්න' : (chatLang === 'ta' ? 'கிராம அதிகாரியை தொடர்பு கொள்ள' : 'Contact GN officer')
    ];

    const handleSend = async (textToSend) => {
        const text = textToSend || inputText;
        if (!text.trim() || loading) return;

        const userMsg = { 
            id: Date.now().toString(), 
            text: text, 
            isBot: false,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMsg]);
        if (!textToSend) setInputText('');
        setLoading(true);

        try {
            const res = await api.post('/chatbot/chat', { 
                message: text,
                userRole: user?.role || 'citizen',
                lang: chatLang
            });
            
            const botMsg = { 
                id: (Date.now() + 1).toString(), 
                text: res.data.reply || "I'm sorry, I couldn't understand that.", 
                isBot: true,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (err) {
            const errorMsg = { 
                id: (Date.now() + 1).toString(), 
                text: "❌ Network error. Please try again later.", 
                isBot: true,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setMessages([{ 
            id: Date.now().toString(), 
            text: t.welcome, 
            isBot: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
    };

    const formatText = (text) => {
        // Simple markdown handling for bold and emojis
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <Text key={index} style={{fontWeight: 'bold'}}>{part.slice(2, -2)}</Text>;
            }
            return part;
        });
    };

    const renderMessage = ({ item }) => (
        <View style={[styles.msgContainer, item.isBot ? styles.msgBot : styles.msgUser]}>
            <View style={[styles.bubble, item.isBot ? styles.bubbleBot : styles.bubbleUser]}>
                {item.isBot && (
                    <View style={styles.botTag}>
                        <Bot size={12} color="#800000" />
                        <Text style={styles.botTagText}>VillageFlow AI</Text>
                    </View>
                )}
                <Text style={[styles.msgText, item.isBot ? styles.msgTextBot : styles.msgTextUser]}>
                    {formatText(item.text)}
                </Text>
                <Text style={[styles.msgTime, item.isBot ? styles.msgTimeBot : styles.msgTimeUser]}>
                    {item.time}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.botIconCircle}>
                        <Bot size={24} color="#800000" />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>{t.title}</Text>
                        <View style={styles.statusContainer}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>{t.online}</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <View style={styles.langPill}>
                        {['si', 'en', 'ta'].map(l => (
                            <TouchableOpacity 
                                key={l} 
                                onPress={() => setChatLang(l)} 
                                style={[styles.langBtn, chatLang === l && styles.langBtnActive]}
                            >
                                <Text style={[styles.langBtnText, chatLang === l && styles.langBtnTextActive]}>
                                    {l.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity onPress={handleClear} style={styles.iconActionBtn}>
                        <Trash2 size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Chat Body */}
            <FlatList 
                ref={flatListRef}
                data={messages}
                keyExtractor={i => i.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.chatList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({animated: true})}
                showsVerticalScrollIndicator={false}
            />

            {/* Typing & Suggestions */}
            <View style={styles.footer}>
                {loading && (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="small" color="#800000" />
                        <Text style={styles.loadingText}>{t.thinking}</Text>
                    </View>
                )}

                <View style={styles.suggestionsHeader}>
                    <HelpCircle size={14} color="#64748b" />
                    <Text style={styles.suggestionsTitle}>{t.suggestions}</Text>
                </View>
                
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.suggestionsScroll}
                >
                    {suggestions.map((s, idx) => (
                        <TouchableOpacity key={idx} style={styles.suggestionBtn} onPress={() => handleSend(s)}>
                            <Text style={styles.suggestionText}>{s}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                >
                    <View style={styles.inputArea}>
                        <TextInput 
                            style={styles.input}
                            placeholder={t.typePlaceholder}
                            value={inputText}
                            onChangeText={setInputText}
                            onSubmitEditing={() => handleSend()}
                            placeholderTextColor="#94a3b8"
                        />
                        <TouchableOpacity 
                            style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]} 
                            onPress={() => handleSend()} 
                            disabled={loading || !inputText.trim()}
                        >
                            {loading ? <Loader2 size={20} color="#fff" /> : <Send size={20} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { 
        backgroundColor: '#800000', 
        paddingHorizontal: 20, 
        paddingVertical: 15, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    botIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
    statusText: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    langPill: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 2 },
    langBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
    langBtnActive: { backgroundColor: '#fbc531' },
    langBtnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    langBtnTextActive: { color: '#800000' },
    iconActionBtn: { padding: 5 },
    
    chatList: { padding: 20, paddingBottom: 30 },
    msgContainer: { marginBottom: 20, maxWidth: '85%' },
    msgBot: { alignSelf: 'flex-start' },
    msgUser: { alignSelf: 'flex-end' },
    
    bubble: { padding: 15, borderRadius: 24, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
    bubbleBot: { backgroundColor: '#fff', borderTopLeftRadius: 4, borderLeftWidth: 4, borderLeftColor: '#800000' },
    bubbleUser: { backgroundColor: '#800000', borderTopRightRadius: 4 },
    
    botTag: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
    botTagText: { fontSize: 10, fontWeight: 'bold', color: '#800000', textTransform: 'uppercase' },
    
    msgText: { fontSize: 15, lineHeight: 22 },
    msgTextBot: { color: '#1e293b' },
    msgTextUser: { color: '#fff' },
    
    msgTime: { fontSize: 9, marginTop: 8, opacity: 0.5 },
    msgTimeBot: { color: '#64748b', textAlign: 'left' },
    msgTimeUser: { color: '#fff', textAlign: 'right' },

    footer: { backgroundColor: '#fff', padding: 15, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15 },
    loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginLeft: 10 },
    loadingText: { color: '#64748b', fontSize: 12, fontStyle: 'italic' },
    
    suggestionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginLeft: 5 },
    suggestionsTitle: { fontSize: 11, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' },
    suggestionsScroll: { paddingBottom: 15, gap: 10 },
    suggestionBtn: { backgroundColor: '#f8fafc', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
    suggestionText: { fontSize: 13, color: '#334155', fontWeight: '500' },
    
    inputArea: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f1f5f9', borderRadius: 30, paddingHorizontal: 10, paddingVertical: 5 },
    input: { flex: 1, height: 50, paddingHorizontal: 15, fontSize: 16, color: '#1e293b' },
    sendBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#800000', justifyContent: 'center', alignItems: 'center' },
    sendBtnDisabled: { opacity: 0.5 }
});
