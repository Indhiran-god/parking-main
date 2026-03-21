import React, { useState, useEffect } from 'react';
import { parkingAPI } from '../../services/api';

const VehicleExit = () => {
  const [currentVehicles, setCurrentVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchType, setSearchType] = useState('registration');
  const [searchValue, setSearchValue] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchCurrentVehicles();
  }, []);

  const fetchCurrentVehicles = async () => {
    try {
      setLoading(true);
      const response = await parkingAPI.getCurrentVehicles();
      setCurrentVehicles(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load current vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setError('Please enter a search value');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSelectedVehicle(null);

      // Filter from current vehicles
      const foundVehicle = currentVehicles.find(vehicle => {
        if (searchType === 'registration') {
          return vehicle.vehicle_registration.toLowerCase().includes(searchValue.toLowerCase());
        } else {
          return vehicle.slot_number.toLowerCase().includes(searchValue.toLowerCase());
        }
      });

      if (foundVehicle) {
        setSelectedVehicle(foundVehicle);
      } else {
        setError('No vehicle found with the specified criteria');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessExit = async () => {
    if (!selectedVehicle) {
      setError('Please select a vehicle first');
      return;
    }

    try {
      setProcessing(true);
      setError('');

      const exitData = {
        vehicle_registration: selectedVehicle.vehicle_registration,
        slot_number: selectedVehicle.slot_number
      };

      const response = await parkingAPI.vehicleExit(exitData);
      
      setSuccessMessage(`Vehicle exit processed successfully. Fee: ₹${response.data.fee_amount}`);
      setSelectedVehicle(null);
      setSearchValue('');
      
      // Refresh current vehicles list
      fetchCurrentVehicles();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process vehicle exit');
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickExit = async (vehicle) => {
    try {
      setProcessing(true);
      setError('');
      setSuccessMessage('');

      const exitData = {
        vehicle_registration: vehicle.vehicle_registration,
        slot_number: vehicle.slot_number
      };

      const response = await parkingAPI.vehicleExit(exitData);
      
      setSuccessMessage(`Vehicle ${vehicle.vehicle_registration} exit processed. Fee: ₹${response.data.fee_amount}`);
      
      // Refresh current vehicles list
      fetchCurrentVehicles();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process vehicle exit');
    } finally {
      setProcessing(false);
    }
  };

  const calculateFee = (entryTime) => {
    if (!entryTime) return { hours: 0, fee: 0 };
    
    const entry = new Date(entryTime);
    const now = new Date();
    const durationMs = now - entry;
    const durationMinutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.max(1, Math.ceil(durationMinutes / 60));
    const fee = hours * 50; // 50 INR per hour
    
    return { hours, fee };
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Vehicle Exit Panel</h1>
      
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

      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <p className="text-green-800">
          This panel allows administrators to process vehicle departures, calculate parking fees, and free up slots.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Exit Form</h2>
          <p className="text-gray-600 mb-4">Search for vehicle by registration or slot number to process exit.</p>
          
          <div className="space-y-4">
            <div className="flex space-x-2">
              <button
                className={`px-4 py-2 rounded ${searchType === 'registration' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setSearchType('registration')}
              >
                Registration
              </button>
              <button
                className={`px-4 py-2 rounded ${searchType === 'slot' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setSearchType('slot')}
              >
                Slot Number
              </button>
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded p-3"
                placeholder={`Enter vehicle ${searchType === 'registration' ? 'registration number' : 'slot number'}`}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded"
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {selectedVehicle && (
              <div className="border border-blue-200 bg-blue-50 rounded p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Vehicle Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Registration:</span>
                    <span className="font-medium">{selectedVehicle.vehicle_registration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Slot:</span>
                    <span className="font-medium">{selectedVehicle.slot_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Owner:</span>
                    <span className="font-medium">{selectedVehicle.owner_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Entry Time:</span>
                    <span className="font-medium">{new Date(selectedVehicle.entry_time).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Parking Duration:</span>
                    <span className="font-medium">
                      {calculateFee(selectedVehicle.entry_time).hours} hours
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Fee:</span>
                    <span className="font-medium text-green-600">
                      ₹{calculateFee(selectedVehicle.entry_time).fee}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded disabled:bg-gray-400"
              onClick={handleProcessExit}
              disabled={!selectedVehicle || processing}
            >
              {processing ? 'Processing...' : 'Process Vehicle Exit'}
            </button>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Currently Parked Vehicles</h2>
          <p className="text-gray-600 mb-4">List of vehicles currently parked for quick exit processing.</p>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-600">Loading current vehicles...</div>
            </div>
          ) : currentVehicles.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-600">No vehicles currently parked</div>
            </div>
          ) : (
            <div className="space-y-2">
              {currentVehicles.map((vehicle) => (
                <div key={vehicle.id} className="flex items-center justify-between p-3 border border-blue-200 bg-blue-50 rounded">
                  <div>
                    <div className="font-medium">{vehicle.vehicle_registration}</div>
                    <div className="text-sm text-gray-600">
                      Slot: {vehicle.slot_number} | 
                      Entry: {new Date(vehicle.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button
                    className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400"
                    onClick={() => handleQuickExit(vehicle)}
                    disabled={processing}
                  >
                    {processing ? 'Processing...' : 'Process Exit'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleExit;
