import React, { useState, useEffect } from 'react';
import { parkingAPI } from '../../services/api';

const VehicleEntry = () => {
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    vehicle_registration: '',
    owner_name: '',
    contact_number: '',
    vehicle_type: 'Car'
  });

  useEffect(() => {
    fetchAvailableSlots();
  }, []);

  const fetchAvailableSlots = async () => {
    try {
      setLoading(true);
      const response = await parkingAPI.getSlots();
      const slots = response.data;
      
      // Filter for available slots
      const available = slots.filter(slot => 
        slot.status === 'Free' && !slot.current_vehicle
      );
      
      setAvailableSlots(available);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load available slots');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.vehicle_registration.trim()) {
      setError('Vehicle registration number is required');
      return;
    }

    if (availableSlots.length === 0) {
      setError('No available parking slots');
      return;
    }

    try {
      setProcessing(true);
      setError('');
      setSuccessMessage('');

      const response = await parkingAPI.vehicleEntry(formData);
      
      setSuccessMessage(`Vehicle entry registered successfully. Assigned slot: ${response.data.slot_assigned}`);
      
      // Reset form
      setFormData({
        vehicle_registration: '',
        owner_name: '',
        contact_number: '',
        vehicle_type: 'Car'
      });
      
      // Refresh available slots
      fetchAvailableSlots();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register vehicle entry');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Vehicle Entry Panel</h1>
      
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <p className="text-blue-800">
          This panel allows administrators to register incoming vehicles and assign parking slots.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Entry Form</h2>
          <p className="text-gray-600 mb-4">Register new vehicle entry and assign parking slot.</p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Registration Number *
              </label>
              <input
                type="text"
                name="vehicle_registration"
                value={formData.vehicle_registration}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded p-3"
                placeholder="e.g., MH-12-AB-1234"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Name
              </label>
              <input
                type="text"
                name="owner_name"
                value={formData.owner_name}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded p-3"
                placeholder="Enter owner name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Number
              </label>
              <input
                type="tel"
                name="contact_number"
                value={formData.contact_number}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded p-3"
                placeholder="Enter contact number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Type
              </label>
              <select
                name="vehicle_type"
                value={formData.vehicle_type}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded p-3"
              >
                <option value="Car">Car</option>
                <option value="Bike">Bike</option>
                <option value="SUV">SUV</option>
                <option value="Truck">Truck</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded disabled:bg-gray-400"
              disabled={processing || availableSlots.length === 0}
            >
              {processing ? 'Processing...' : 'Register Vehicle Entry'}
            </button>
          </form>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Available Slots</h2>
          <p className="text-gray-600 mb-4">
            {availableSlots.length} parking slots available for assignment.
          </p>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-600">Loading available slots...</div>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-red-600 font-medium">No available parking slots</div>
              <p className="text-gray-600 text-sm mt-2">Please wait for slots to become available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableSlots.slice(0, 10).map((slot) => (
                <div key={slot.id} className="flex items-center justify-between p-3 border border-green-200 bg-green-50 rounded">
                  <div>
                    <span className="font-medium">{slot.slot_number}</span>
                    <span className="text-sm text-gray-600 ml-2">({slot.slot_type})</span>
                  </div>
                  <span className="text-green-600 text-sm font-medium">Available</span>
                </div>
              ))}
              
              {availableSlots.length > 10 && (
                <div className="text-center text-gray-500 text-sm mt-4">
                  + {availableSlots.length - 10} more slots available
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleEntry;
