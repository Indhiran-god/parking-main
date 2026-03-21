import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';

const UserLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    vehicle_registration: '',
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
      const response = await authAPI.userLogin(formData);
      const { token, user } = response.data;

      // Store auth data
      localStorage.setItem('token', token);
      localStorage.setItem('role', 'user');
      localStorage.setItem('vehicle_registration', user.vehicle_registration);
      localStorage.setItem('owner_name', user.owner_name);

      // Redirect to user dashboard
      navigate('/user/dashboard');
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <span className="text-3xl">🚗</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">User Access</h1>
          <p className="text-gray-600 mt-2">Vehicle Parking Management System</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="vehicle_registration">
              Vehicle Registration Number
            </label>
            <input
              type="text"
              id="vehicle_registration"
              name="vehicle_registration"
              value={formData.vehicle_registration}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter vehicle registration"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="password">
              Password (Optional)
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter password if registered"
            />
            <p className="text-xs text-gray-500 mt-1">Leave blank for first-time access</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Accessing...' : 'Access Parking System'}
          </button>

          <div className="mt-4 text-center text-sm text-gray-600">
            <p>First-time users can enter just their vehicle registration number.</p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Admin access?{' '}
              <button
                type="button"
                onClick={() => navigate('/admin/login')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Go to Admin Login
              </button>
            </p>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl">🅿️</div>
              <div className="text-xs text-gray-500 mt-1">Find Slot</div>
            </div>
            <div>
              <div className="text-2xl">💰</div>
              <div className="text-xs text-gray-500 mt-1">Pay Fee</div>
            </div>
            <div>
              <div className="text-2xl">📱</div>
              <div className="text-xs text-gray-500 mt-1">Easy Access</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
