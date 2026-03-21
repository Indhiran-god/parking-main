import React, { useState, useEffect } from 'react';
import { settingsAPI, adminAPI } from '../../services/api';

const Settings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [systemInfo, setSystemInfo] = useState(null);
  const [hourlyRate, setHourlyRate] = useState(50);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    fetchSettings();
    fetchSystemInfo();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getAllSettings();
      const settingsData = response.data;

      // Convert object to array for display
      const settingsArray = Object.entries(settingsData).map(([key, value]) => ({
        id: value.id,
        setting_key: key,
        setting_value: value.value,
        description: value.description
      }));

      setSettings(settingsArray);

      // Extract hourly rate
      if (settingsData.hourly_rate) {
        setHourlyRate(parseFloat(settingsData.hourly_rate.value) || 50);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const response = await settingsAPI.getSystemInfo();
      setSystemInfo(response.data.system_info);
    } catch (err) {
      console.error('Failed to load system info:', err);
    }
  };

  const handleSettingUpdate = async (key, value) => {
    try {
      setError('');
      setSuccessMessage('');

      await settingsAPI.updateSettings({ [key]: value });

      setSuccessMessage(`Setting "${key}" updated successfully`);

      // Refresh settings
      fetchSettings();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update setting');
    }
  };

  const handleHourlyRateUpdate = async () => {
    try {
      setError('');
      setSuccessMessage('');

      await settingsAPI.updateHourlyRate({ hourly_rate: hourlyRate });

      setSuccessMessage(`Hourly rate updated to ₹${hourlyRate}`);

      // Refresh settings
      fetchSettings();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update hourly rate');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      await adminAPI.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });

      setSuccessMessage('Password changed successfully');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      const response = await settingsAPI.createBackup();

      // Create download link for binary file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `parking-system-backup-${new Date().toISOString().split('T')[0]}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccessMessage('System backup created and downloaded successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings Panel</h1>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 mb-6">
          ✅ {successMessage}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <p className="text-gray-800">
          This panel enables configuration and maintenance of system-level settings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">System Settings</h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-600">Loading settings...</div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hourly Parking Rate (₹)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="10"
                    max="500"
                    step="10"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 50)}
                    className="flex-1 border border-gray-300 rounded p-2"
                  />
                  <button
                    onClick={handleHourlyRateUpdate}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
                  >
                    Update
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Current rate: ₹{hourlyRate} per hour
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Other Settings</h3>
                {settings
                  .filter(s => s.setting_key !== 'hourly_rate')
                  .map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-700">{setting.setting_key}</div>
                        <div className="text-xs text-gray-500">{setting.description}</div>
                      </div>
                      <div className="text-sm text-gray-900">{setting.setting_value}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* System Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">System Information</h2>

          {systemInfo ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">System Name:</span>
                <span className="text-sm font-medium">{systemInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Version:</span>
                <span className="text-sm font-medium">{systemInfo.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Slots:</span>
                <span className="text-sm font-medium">{systemInfo.database?.total_slots || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Records:</span>
                <span className="text-sm font-medium">{systemInfo.database?.total_records || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Users:</span>
                <span className="text-sm font-medium">{systemInfo.database?.total_users || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Server Time:</span>
                <span className="text-sm font-medium">
                  {new Date(systemInfo.server_time).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">System Uptime:</span>
                <span className="text-sm font-medium">
                  {systemInfo.uptime ? Math.floor(systemInfo.uptime / 60) + ' minutes' : 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-600">Loading system information...</div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleBackup}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded disabled:bg-gray-400"
            >
              {loading ? 'Creating Backup...' : 'Create System Backup'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Downloads the full SQLite database file
            </p>
          </div>
        </div>

        {/* Password Change */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Change Admin Password</h2>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                  className="w-full border border-gray-300 rounded p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                  className="w-full border border-gray-300 rounded p-2"
                  required
                  minLength="6"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                  className="w-full border border-gray-300 rounded p-2"
                  required
                  minLength="6"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded disabled:bg-gray-400"
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
