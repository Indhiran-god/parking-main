import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Admin Components
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import VehicleEntry from './components/admin/VehicleEntry';
import VehicleExit from './components/admin/VehicleExit';
import SlotManagement from './components/admin/SlotManagement';
import Reports from './components/admin/Reports';
import Settings from './components/admin/Settings';

// User Components
import UserLogin from './components/user/UserLogin';
import UserDashboard from './components/user/UserDashboard';
import UserHistory from './components/user/UserHistory';
import UserProfile from './components/user/UserProfile';

// Common Components
import Layout from './components/common/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/user/login" element={<UserLogin />} />
          
          {/* Admin Protected Routes */}
          <Route path="/admin" element={<ProtectedRoute role="admin" />}>
            <Route path="" element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Layout><AdminDashboard /></Layout>} />
            <Route path="entry" element={<Layout><VehicleEntry /></Layout>} />
            <Route path="exit" element={<Layout><VehicleExit /></Layout>} />
            <Route path="slots" element={<Layout><SlotManagement /></Layout>} />
            <Route path="reports" element={<Layout><Reports /></Layout>} />
            <Route path="settings" element={<Layout><Settings /></Layout>} />
          </Route>
          
          {/* User Protected Routes */}
          <Route path="/user" element={<ProtectedRoute role="user" />}>
            <Route path="" element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<UserDashboard />} />
            <Route path="history" element={<UserHistory />} />
            <Route path="profile" element={<UserProfile />} />
          </Route>
          
          {/* Default Route */}
          <Route path="/" element={<Navigate to="/admin/login" replace />} />
          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
