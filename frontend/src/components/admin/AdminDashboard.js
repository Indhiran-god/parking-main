import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDashboard();
      setDashboardData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  const { statistics, slot_status, recent_activities, alerts } = dashboardData || {};

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-600">Real-time overview of parking operations</p>
      </div>

      {alerts && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-6">
          ⚠️ <strong>Alert:</strong> {alerts}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg mr-4">
              <span className="text-2xl">🅿️</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Slots</p>
              <p className="text-2xl font-bold">{statistics?.total_slots || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg mr-4">
              <span className="text-2xl">✅</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Free Slots</p>
              <p className="text-2xl font-bold text-green-600">{statistics?.free_slots || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg mr-4">
              <span className="text-2xl">🚗</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Occupied Slots</p>
              <p className="text-2xl font-bold text-red-600">{statistics?.occupied_slots || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg mr-4">
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Today's Revenue</p>
              <p className="text-2xl font-bold text-purple-600">₹{statistics?.today_revenue || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Slot Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Slot Status Distribution</h2>
          <div className="space-y-3">
            {slot_status?.map((status) => (
              <div key={status.status} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    status.status === 'Free' ? 'bg-green-500' :
                    status.status === 'Occupied' ? 'bg-red-500' :
                    status.status === 'Reserved' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}></div>
                  <span className="text-gray-700">{status.status}</span>
                </div>
                <span className="font-semibold">{status.count} slots</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded text-left">
              🚗 Register Vehicle Entry
            </button>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded text-left">
              🚪 Process Vehicle Exit
            </button>
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded text-left">
              📊 Generate Reports
            </button>
            <button className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded text-left">
              ⚙️ System Settings
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activities</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slot</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recent_activities?.slice(0, 5).map((activity) => (
                <tr key={activity.id}>
                  <td className="px-4 py-3 text-sm">{activity.vehicle_registration}</td>
                  <td className="px-4 py-3 text-sm">{activity.slot_number}</td>
                  <td className="px-4 py-3 text-sm">{new Date(activity.entry_time).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      activity.exit_time ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {activity.exit_time ? 'Completed' : 'Parked'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
