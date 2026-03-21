import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.adminLogin(formData);
      const { token, user } = response.data;

      // Store auth data
      localStorage.setItem('token', token);
      localStorage.setItem('role', 'admin');
      localStorage.setItem('username', user.username);
      localStorage.setItem('full_name', user.full_name);

      // Redirect to admin dashboard
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <span className="text-3xl">🅿️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Login</h1>
          <p className="text-gray-600 mt-2">Vehicle Parking Management System</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="username">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter username"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className="mt-4 text-center text-sm text-gray-600">
            <p>Demo Credentials:</p>
            <p className="font-mono">Username: admin | Password: admin123</p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Need user access?{' '}
              <button
                type="button"
                onClick={() => navigate('/user/login')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Go to User Login
              </button>
            </p>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl">🅿️</div>
              <div className="text-xs text-gray-500 mt-1">Parking</div>
            </div>
            <div>
              <div className="text-2xl">🚗</div>
              <div className="text-xs text-gray-500 mt-1">Vehicle</div>
            </div>
            <div>
              <div className="text-2xl">📊</div>
              <div className="text-xs text-gray-500 mt-1">Management</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
