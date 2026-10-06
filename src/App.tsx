import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './part1-user-system/auth/AuthContext';
import LoginScreen from './part1-user-system/auth/LoginScreen';
import RoleSelectScreen from './part1-user-system/auth/RoleSelectScreen';
import HomeScreen from './part1-user-system/sos/HomeScreen';
import ProfileCreateScreen from './part1-user-system/profile/ProfileCreateScreen';
import ProfileViewScreen from './part1-user-system/profile/ProfileViewScreen';
import TrackerHomeScreen from './part1-user-system/menstrual-tracker/TrackerHomeScreen';
import ChatEntryScreen from './part1-user-system/world-chat/ChatEntryScreen';
import DistrictChatScreen from './part1-user-system/world-chat/DistrictChatScreen';
import SOSConditionsScreen from './part1-user-system/sos/SOSConditionsScreen';
import SOSShelterSelectScreen from './part1-user-system/sos/SOSShelterSelectScreen';
import ConnectivityBadge from './part1-user-system/components/ConnectivityBadge';

import ServiceProviderRegistrationScreen from './part3-service-provider/registration/ServiceProviderRegistrationScreen';
import ServiceDashboardScreen from './part3-service-provider/dashboard/ServiceDashboardScreen';
import OrderCreationScreen from './part3-service-provider/orders/OrderCreationScreen';
import OrderDetailScreen from './part3-service-provider/orders/OrderDetailScreen';
import DispatchScreen from './part3-service-provider/dispatch/DispatchScreen';
import DeliveryConfirmationScreen from './part3-service-provider/dispatch/DeliveryConfirmationScreen';
import SOSDecodeScreen from './part3-service-provider/sos-decode/SOSDecodeScreen';

import './shared/design-tokens/tokens.css';
import './part1-user-system/styles/part1-base.css';
import './part3-service-provider/styles/part3-base.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, vyntraUser, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>;
  if (!user && !vyntraUser) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <div className="app-shell">
      <ConnectivityBadge />
      <Routes>
        {/* Auth Routes */}
        <Route path="/auth/login" element={<LoginScreen />} />
        <Route path="/auth/role-select" element={<ProtectedRoute><RoleSelectScreen /></ProtectedRoute>} />

        {/* User Routes */}
        <Route path="/user/home" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
        <Route path="/user/profile/create" element={<ProtectedRoute><ProfileCreateScreen /></ProtectedRoute>} />
        <Route path="/user/profile" element={<ProtectedRoute><ProfileViewScreen /></ProtectedRoute>} />

        {/* Menstrual Tracker */}
        <Route path="/user/cycle-tracker" element={<ProtectedRoute><TrackerHomeScreen /></ProtectedRoute>} />

        {/* World Chat */}
        <Route path="/chat" element={<ProtectedRoute><ChatEntryScreen /></ProtectedRoute>} />
        <Route path="/chat/:districtCode" element={<ProtectedRoute><DistrictChatScreen /></ProtectedRoute>} />

        {/* SOS */}
        <Route path="/sos/conditions" element={<ProtectedRoute><SOSConditionsScreen /></ProtectedRoute>} />
        <Route path="/sos/shelters" element={<ProtectedRoute><SOSShelterSelectScreen /></ProtectedRoute>} />

        {/* Part 2 Placeholder */}
        <Route path="/shelter/*" element={<div className="placeholder-screen"><h2>Shelter Provider Module</h2><p>Part 2 — Coming Soon</p></div>} />

        {/* Part 3: Service Provider, Orders & Dispatch */}
        <Route path="/service/register" element={<ProtectedRoute><ServiceProviderRegistrationScreen /></ProtectedRoute>} />
        <Route path="/service/dashboard" element={<ProtectedRoute><ServiceDashboardScreen /></ProtectedRoute>} />
        <Route path="/service/sos-decode" element={<ProtectedRoute><SOSDecodeScreen /></ProtectedRoute>} />
        <Route path="/service" element={<Navigate to="/service/dashboard" replace />} />

        {/* Part 3: Orders */}
        <Route path="/orders/create" element={<ProtectedRoute><OrderCreationScreen /></ProtectedRoute>} />
        <Route path="/orders/:orderId" element={<ProtectedRoute><OrderDetailScreen /></ProtectedRoute>} />

        {/* Part 3: Dispatch & Delivery */}
        <Route path="/dispatch/:orderId" element={<ProtectedRoute><DispatchScreen /></ProtectedRoute>} />
        <Route path="/dispatch/confirm/:orderId" element={<ProtectedRoute><DeliveryConfirmationScreen /></ProtectedRoute>} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/auth/login" replace />} />
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
