import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { 
    User, FileText, Bell, LogOut, LayoutDashboard, 
    Calendar, HandHeart, Package, Bot, ShieldCheck, 
    ClipboardList
} from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';

import ProfileScreen from '../screens/main/ProfileScreen';
import CertificatesScreen from '../screens/main/CertificatesScreen';
import NoticesScreen from '../screens/main/NoticesScreen';
import AppointmentsScreen from '../screens/main/AppointmentsScreen';
import WelfareScreen from '../screens/main/WelfareScreen';
import DashboardScreen from '../screens/main/DashboardScreen';
import InventoryScreen from '../screens/main/InventoryScreen';
import ChatBotScreen from '../screens/main/ChatBotScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import VerifyCertificateScreen from '../screens/main/VerifyCertificateScreen';
import VerifyProfileScreen from '../screens/main/VerifyProfileScreen';
import SystemConfigScreen from '../screens/main/SystemConfigScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DashboardStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="DashboardMain" component={DashboardScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="VerifyCertificate" component={VerifyCertificateScreen} />
            <Stack.Screen name="VerifyProfile" component={VerifyProfileScreen} />
            <Stack.Screen name="SystemConfig" component={SystemConfigScreen} />
        </Stack.Navigator>
    );
}

export default function MainNavigator() {
    const { user } = useContext(AuthContext);
    const isOfficer = user?.role === 'officer';

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size, focused }) => {
                    const iconSize = focused ? size + 2 : size;
                    if (route.name === 'Profile' || route.name === 'Dashboard') return <LayoutDashboard size={iconSize} color={color} />;
                    if (route.name === 'Certificates') return <FileText size={iconSize} color={color} />;
                    if (route.name === 'Notices') return <Bell size={iconSize} color={color} />;
                    if (route.name === 'Appointments') return <Calendar size={iconSize} color={color} />;
                    if (route.name === 'Welfare') return <HandHeart size={iconSize} color={color} />;
                    if (route.name === 'Inventory') return <Package size={iconSize} color={color} />;
                    if (route.name === 'Assistant') return <Bot size={iconSize} color={color} />;
                },
                tabBarActiveTintColor: '#800000',
                tabBarInactiveTintColor: '#94a3b8',
                headerShown: false,
                tabBarStyle: {
                    height: 70,
                    paddingBottom: 12,
                    paddingTop: 8,
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderTopColor: '#f1f5f9',
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 10
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '700',
                }
            })}
        >
            <Tab.Screen 
                name={isOfficer ? "Dashboard" : "Profile"} 
                component={isOfficer ? DashboardStack : ProfileScreen} 
            />
            {!isOfficer && <Tab.Screen name="Certificates" component={CertificatesScreen} />}
            {isOfficer && <Tab.Screen name="Inventory" component={InventoryScreen} />}
            <Tab.Screen name="Notices" component={NoticesScreen} />
            <Tab.Screen name="Appointments" component={AppointmentsScreen} />
            <Tab.Screen name="Welfare" component={WelfareScreen} />
            {!isOfficer && <Tab.Screen name="Assistant" component={ChatBotScreen} />}
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    btn: { flexDirection: 'row', backgroundColor: '#800000', padding: 15, borderRadius: 10, gap: 10, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: 'bold' }
});
