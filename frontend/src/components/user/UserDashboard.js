import React, { useState, useEffect } from 'react';
import { userAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const UserDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentParking, setCurrentParking] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getDashboard();
      setDashboardData(response.data);
      
      // Check for current parking
      if (response.data.current_parking) {
        setCurrentParking(response.data.current_parking);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleEntryRequest = () => {
    navigate('/user/entry-request');
  };

  const handleViewHistory = () => {
    navigate('/user/history');
  };

  const handleUpdateProfile = () => {
    navigate('/user/profile');
  };

  const handleGetHelp = () => {
    // In a real app, this would open a help modal or page
    alert('For assistance, please contact support at support@parking.com or call 1800-123-4567');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">User Dashboard</h1>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
              ⚠️ {error}
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <p className="text-green-800">
              Welcome to your parking dashboard. Here you can view your current parking status, history, and manage your profile.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Parking Status</h2>
              
              {currentParking ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-4">🚗</div>
                  <div className="text-xl font-bold text-green-700 mb-2">Currently Parked</div>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vehicle:</span>
                      <span className="font-medium">{currentParking.vehicle_registration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Slot:</span>
                      <span className="font-medium">{currentParking.slot_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entry Time:</span>
                      <span className="font-medium">
                        {new Date(currentParking.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">
                        {Math.floor((new Date() - new Date(currentParking.entry_time)) / (1000 * 60 * 60))} hours
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/user/exit-details')}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
                  >
                    View Exit Details
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🅿️</div>
                  <div className="text-xl font-bold text-gray-700 mb-2">Not Currently Parked</div>
                  <p className="text-gray-600 mb-4">Your vehicle is not parked in our facility.</p>
                  <button 
                    onClick={handleEntryRequest}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded"
                  >
                    Request Parking Entry
                  </button>
                </div>
              )}
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button 
                  onClick={handleEntryRequest}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded text-left"
                >
                  🚗 Submit Entry Request
                </button>
                <button 
                  onClick={handleViewHistory}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded text-left"
                >
                  📋 View Parking History
                </button>
                <button 
                  onClick={handleUpdateProfile}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded text-left"
                >
                  👤 Update Profile
                </button>
                <button 
                  onClick={handleGetHelp}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded text-left"
                >
                  ℹ️ Get Help
                </button>
              </div>

              {dashboardData && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Account Summary</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Parkings:</span>
                      <span className="font-medium">{dashboardData.total_parkings || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Spent:</span>
                      <span className="font-medium">₹{dashboardData.total_spent || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Member Since:</span>
                      <span className="font-medium">
                        {dashboardData.member_since ? new Date(dashboardData.member_since).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Parking Activity</h2>
            
            {dashboardData?.recent_activity && dashboardData.recent_activity.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slot</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exit Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dashboardData.recent_activity.slice(0, 5).map((activity) => (
                      <tr key={activity.id}>
                        <td className="px-4 py-3 text-sm">{activity.vehicle_registration}</td>
                        <td className="px-4 py-3 text-sm">{activity.slot_number}</td>
                        <td className="px-4 py-3 text-sm">{new Date(activity.entry_time).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">
                          {activity.exit_time ? new Date(activity.exit_time).toLocaleString() : 'Still Parked'}
                        </td>
                        <td className="px-4 py-3 text-sm">₹{activity.fee_amount || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No recent parking activity found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
