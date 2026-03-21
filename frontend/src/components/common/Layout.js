import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('role');
  const userName = localStorage.getItem('username') || localStorage.getItem('vehicle_registration') || 'User';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('vehicle_registration');
    navigate(`/${userRole}/login`);
  };

  const adminMenuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/entry', label: 'Vehicle Entry', icon: '🚗' },
    { path: '/admin/exit', label: 'Vehicle Exit', icon: '🚪' },
    { path: '/admin/slots', label: 'Slot Management', icon: '🅿️' },
    { path: '/admin/reports', label: 'Reports', icon: '📈' },
    { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ];

  const userMenuItems = [
    { path: '/user/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/user/history', label: 'Parking History', icon: '📋' },
    { path: '/user/profile', label: 'Profile', icon: '👤' },
  ];

  const menuItems = userRole === 'admin' ? adminMenuItems : userMenuItems;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🅿️</span>
            <h1 className="text-xl font-bold">Vehicle Parking Management</h1>
            <span className="text-sm bg-blue-700 px-2 py-1 rounded">
              {userRole === 'admin' ? 'Admin Panel' : 'User Panel'}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm">Welcome, {userName}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md rounded-lg mr-6 p-4">
          <nav>
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="flex items-center space-x-3 p-3 rounded hover:bg-blue-50 text-gray-700 hover:text-blue-600"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* System Status */}
          <div className="mt-8 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold text-gray-700 mb-2">System Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Role:</span>
                <span className="text-sm font-medium">{userRole}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span className="text-sm font-medium text-green-600">Online</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="bg-white shadow-md rounded-lg p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-4 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} Vehicle Parking Management System. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Version 1.0.0 | Secure Parking Solutions
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
