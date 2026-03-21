import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../../services/api';

const Reports = () => {
  const [reportType, setReportType] = useState('current-vehicles');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');

      let response;
      const params = {};

      if (reportType === 'parking-history' || reportType === 'revenue') {
        params.date_from = dateRange.startDate;
        params.date_to = dateRange.endDate;
      }

      switch (reportType) {
        case 'current-vehicles':
          response = await reportsAPI.getCurrentVehicles(params);
          break;
        case 'parking-history':
          response = await reportsAPI.getParkingHistory(params);
          break;
        case 'revenue':
          response = await reportsAPI.getRevenueReport(params);
          break;
        case 'slot-utilization':
          response = await reportsAPI.getSlotUtilization(params);
          break;
        default:
          response = await reportsAPI.getCurrentVehicles(params);
      }

      // Handle different response structures
      let data = [];
      if (response.data) {
        if (reportType === 'current-vehicles' && response.data.vehicles) {
          data = response.data.vehicles;
        } else if (reportType === 'parking-history' && response.data.records) {
          data = response.data.records;
        } else if (reportType === 'revenue' && response.data.data) {
          data = response.data.data;
        } else if (reportType === 'slot-utilization' && response.data.slot_utilization) {
          data = response.data.slot_utilization;
        } else if (Array.isArray(response.data)) {
          data = response.data;
        }
      }

      setReportData(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report data');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (reportType === 'parking-history' || reportType === 'revenue') {
        params.date_from = dateRange.startDate;
        params.date_to = dateRange.endDate;
      }

      const response = await reportsAPI.exportReport({ ...params, format: 'csv' });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  const renderReportTable = () => {
    if (reportData.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-600">No data available for this report</div>
        </div>
      );
    }

    switch (reportType) {
      case 'current-vehicles':
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slot</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportData.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm">{item.vehicle_registration}</td>
                  <td className="px-4 py-3 text-sm">{item.slot_number}</td>
                  <td className="px-4 py-3 text-sm">{item.owner_name || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">{new Date(item.entry_time).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">
                    {Math.floor((new Date() - new Date(item.entry_time)) / (1000 * 60 * 60))} hours
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'parking-history':
        return (
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
              {reportData.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm">{item.vehicle_registration}</td>
                  <td className="px-4 py-3 text-sm">{item.slot_number}</td>
                  <td className="px-4 py-3 text-sm">{new Date(item.entry_time).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">
                    {item.exit_time ? new Date(item.exit_time).toLocaleString() : 'Still Parked'}
                  </td>
                  <td className="px-4 py-3 text-sm">{item.parking_duration_minutes} min</td>
                  <td className="px-4 py-3 text-sm">₹{item.fee_amount || 0}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.exit_time ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {item.exit_time ? 'Completed' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'revenue':
        const totalRevenue = reportData.reduce((sum, item) => sum + (parseFloat(item.fee_amount) || 0), 0);
        return (
          <div>
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-lg font-semibold text-green-800">
                Total Revenue: ₹{totalRevenue.toFixed(2)}
              </div>
              <div className="text-sm text-green-600">
                Period: {dateRange.startDate} to {dateRange.endDate}
              </div>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg. Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportData.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm">{item.date || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{item.transactions || 0}</td>
                    <td className="px-4 py-3 text-sm">₹{parseFloat(item.revenue || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">₹{parseFloat(item.average_fee || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'slot-utilization':
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slot Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Slots</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Occupied</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Free</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilization %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportData.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm">{item.slot_type || 'All'}</td>
                  <td className="px-4 py-3 text-sm">{item.total_slots || 0}</td>
                  <td className="px-4 py-3 text-sm">{item.occupied || 0}</td>
                  <td className="px-4 py-3 text-sm">{item.free || 0}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${item.utilization || 0}%` }}
                        ></div>
                      </div>
                      <span>{parseFloat(item.utilization || 0).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Reports Panel</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mb-6">
        <p className="text-indigo-800">
          This panel provides analytical insights and historical data for monitoring parking operations and revenue.
        </p>
      </div>

      {/* Report Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full border border-gray-300 rounded p-2"
            >
              <option value="current-vehicles">Currently Parked Vehicles</option>
              <option value="parking-history">Parking History</option>
              <option value="revenue">Revenue Report</option>
              <option value="slot-utilization">Slot Utilization</option>
            </select>
          </div>

          {(reportType === 'parking-history' || reportType === 'revenue') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={dateRange.startDate}
                  onChange={handleDateChange}
                  className="w-full border border-gray-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={dateRange.endDate}
                  onChange={handleDateChange}
                  className="w-full border border-gray-300 rounded p-2"
                />
              </div>
            </>
          )}

          <div className="flex items-end space-x-2">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:bg-gray-400"
            >
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
            <button
              onClick={handleExport}
              disabled={loading || reportData.length === 0}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded disabled:bg-gray-400"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          Showing {reportData.length} records
          {(reportType === 'parking-history' || reportType === 'revenue') && 
            ` from ${dateRange.startDate} to ${dateRange.endDate}`}
        </div>
      </div>

      {/* Report Data */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-600">Loading report data...</div>
            </div>
          ) : (
            renderReportTable()
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
