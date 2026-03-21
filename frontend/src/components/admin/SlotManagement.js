import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

const SlotManagement = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingSlot, setEditingSlot] = useState(null);
  const [bulkCreateCount, setBulkCreateCount] = useState(10);
  const [bulkCreatePrefix, setBulkCreatePrefix] = useState('A');
  const [bulkCreateType, setBulkCreateType] = useState('Car');

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSlots();
      setSlots(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load parking slots');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (slotId, newStatus) => {
    try {
      setError('');
      setSuccessMessage('');

      await adminAPI.updateSlot(slotId, { status: newStatus });
      
      setSuccessMessage(`Slot status updated successfully`);
      
      // Refresh slots
      fetchSlots();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update slot status');
    }
  };

  const handleTypeChange = async (slotId, newType) => {
    try {
      setError('');
      setSuccessMessage('');

      await adminAPI.updateSlot(slotId, { slot_type: newType });
      
      setSuccessMessage(`Slot type updated successfully`);
      
      // Refresh slots
      fetchSlots();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update slot type');
    }
  };

  const handleBulkCreate = async () => {
    if (bulkCreateCount <= 0 || bulkCreateCount > 100) {
      setError('Please enter a valid number between 1 and 100');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      const data = {
        count: bulkCreateCount,
        prefix: bulkCreatePrefix,
        slot_type: bulkCreateType
      };

      const response = await adminAPI.bulkCreateSlots(data);
      
      setSuccessMessage(`Created ${response.data.slots_created.length} new slots successfully`);
      setBulkCreateCount(10);
      
      // Refresh slots
      fetchSlots();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create slots');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Free': return 'bg-green-100 text-green-800';
      case 'Occupied': return 'bg-red-100 text-red-800';
      case 'Reserved': return 'bg-yellow-100 text-yellow-800';
      case 'Maintenance': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Car': return 'bg-blue-100 text-blue-800';
      case 'Bike': return 'bg-purple-100 text-purple-800';
      case 'SUV': return 'bg-orange-100 text-orange-800';
      case 'Truck': return 'bg-red-100 text-red-800';
      case 'Handicapped': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Slot Management Panel</h1>
      
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

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
        <p className="text-purple-800">
          This panel allows administrators to configure, monitor, and control individual parking slots.
        </p>
      </div>

      {/* Bulk Create Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Bulk Create Slots</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Slots</label>
            <input
              type="number"
              min="1"
              max="100"
              value={bulkCreateCount}
              onChange={(e) => setBulkCreateCount(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prefix</label>
            <input
              type="text"
              value={bulkCreatePrefix}
              onChange={(e) => setBulkCreatePrefix(e.target.value.toUpperCase())}
              className="w-full border border-gray-300 rounded p-2"
              placeholder="A, B, C, etc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slot Type</label>
            <select
              value={bulkCreateType}
              onChange={(e) => setBulkCreateType(e.target.value)}
              className="w-full border border-gray-300 rounded p-2"
            >
              <option value="Car">Car</option>
              <option value="Bike">Bike</option>
              <option value="SUV">SUV</option>
              <option value="Truck">Truck</option>
              <option value="Handicapped">Handicapped</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleBulkCreate}
              disabled={loading || bulkCreateCount <= 0}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Slots'}
            </button>
          </div>
        </div>
      </div>

      {/* Slots Grid */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800">All Parking Slots ({slots.length})</h2>
          <button
            onClick={fetchSlots}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading parking slots...</div>
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-600">No parking slots found</div>
            <p className="text-gray-500 text-sm mt-2">Use the bulk create form above to add slots</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {slots.map((slot) => (
              <div key={slot.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-lg">{slot.slot_number}</div>
                    <div className="text-sm text-gray-500">ID: {slot.id}</div>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(slot.status)}`}>
                      {slot.status}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(slot.slot_type)}`}>
                      {slot.slot_type}
                    </span>
                  </div>
                </div>

                {slot.current_vehicle && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-100 rounded">
                    <div className="text-sm font-medium text-blue-800">
                      {slot.current_vehicle.vehicle_registration}
                    </div>
                    <div className="text-xs text-blue-600">
                      Since: {new Date(slot.current_vehicle.entry_time).toLocaleTimeString()}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={slot.status}
                      onChange={(e) => handleStatusChange(slot.id, e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded p-1"
                      disabled={slot.status === 'Occupied' && slot.current_vehicle}
                    >
                      <option value="Free">Free</option>
                      <option value="Occupied">Occupied</option>
                      <option value="Reserved">Reserved</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={slot.slot_type}
                      onChange={(e) => handleTypeChange(slot.id, e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded p-1"
                    >
                      <option value="Car">Car</option>
                      <option value="Bike">Bike</option>
                      <option value="SUV">SUV</option>
                      <option value="Truck">Truck</option>
                      <option value="Handicapped">Handicapped</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  Updated: {new Date(slot.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SlotManagement;
