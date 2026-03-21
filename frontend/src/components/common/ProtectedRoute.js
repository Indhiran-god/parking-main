import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ role }) => {
  // Check if user is authenticated
  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');
    return token && userRole === role;
  };

  if (!isAuthenticated()) {
    // Redirect to appropriate login page
    return <Navigate to={`/${role}/login`} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
