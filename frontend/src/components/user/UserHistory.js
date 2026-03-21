import React, { useState, useEffect } from 'react';
import { userAPI } from '../../services/api';

const UserHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    vehicle_type: ''
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getHistory(filters);
      setHistory(response.data.history || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load parking history');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchHistory();
  };

  const clearFilters = () => {
    setFilters({
      date_from: '',
      date_to: '',
      vehicle_type: ''
    });
    fetchHistory();
  };

  const calculateTotalSpent = () => {
    return history.reduce((total, record) => total + (parseFloat(record.fee_amount) || 0), 0);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Parking History</h1>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
              ⚠️ {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <p className="text-blue-800">
              View your past parking usage, including entry/exit times, slot numbers, and fees paid.
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Filter History</h2>
            <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  name="date_from"
                  value={filters.date_from}
                  onChange={handleFilterChange}
                  className="w-full border border-gray-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  name="date_to"
                  value={filters.date_to}
                  onChange={handleFilterChange}
                  className="w-full border border-gray-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                <select
                  name="vehicle_type"
                  value={filters.vehicle_type}
                  onChange={handleFilterChange}
                  className="w-full border border-gray-300 rounded p-2"
                >
                  <option value="">All Types</option>
                  <option value="Car">Car</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Truck">Truck</option>
                  <option value="SUV">SUV</option>
                </select>
              </div>
              <div className="flex items-end space-x-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
                >
                  Apply Filters
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="text-2xl font-bold text-green-800 mb-2">{history.length}</div>
              <div className="text-sm text-green-600">Total Parking Sessions</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="text-2xl font-bold text-blue-800 mb-2">₹{calculateTotalSpent().toFixed(2)}</div>
              <div className="text-sm text-blue-600">Total Amount Spent</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="text-2xl font-bold text-purple-800 mb-2">
                {history.filter(h => !h.exit_time).length}
              </div>
              <div className="text-sm text-purple-600">Active Parkings</div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Parking Records</h2>
            
            {loading ? (
              <div className="text-center py-12">
                <div className="text-gray-600">Loading parking history...</div>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-600">No parking history found.</div>
                <p className="text-sm text-gray-500 mt-2">
                  {filters.date_from || filters.date_to || filters.vehicle_type 
                    ? 'Try clearing your filters' 
                    : 'Your parking history will appear here once you use the parking facility'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slot</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exit Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {history.map((record) => (
                      <tr key={record.id}>
                        <td className="px-4 py-3 text-sm">{record.vehicle_registration}</td>
                        <td className="px-4 py-3 text-sm">{record.slot_number}</td>
                        <td className="px-4 py-3 text-sm">{new Date(record.entry_time).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">
                          {record.exit_time ? new Date(record.exit_time).toLocaleString() : 'Still Parked'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {record.parking_duration_minutes 
                            ? `${Math.floor(record.parking_duration_minutes / 60)}h ${record.parking_duration_minutes % 60}m`
                            : 'N/A'
                          }
                        </td>
                        <td className="px-4 py-3 text-sm">₹{record.fee_amount || 0}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            record.exit_time 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {record.exit_time ? 'Completed' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserHistory;
