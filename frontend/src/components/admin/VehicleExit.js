import React, { useState, useEffect } from 'react';
import { parkingAPI, paymentAPI } from '../../services/api';

const VehicleExit = () => {
  const [currentVehicles, setCurrentVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchType, setSearchType] = useState('registration');
  const [searchValue, setSearchValue] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [calculatedFee, setCalculatedFee] = useState(null);
  const [paymentData, setPaymentData] = useState({
    payment_method: 'cash',
    transaction_id: '',
    notes: ''
  });
  const [paymentMethods, setPaymentMethods] = useState([]);

  useEffect(() => {
    fetchCurrentVehicles();
    fetchPaymentMethods();
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

  const fetchPaymentMethods = async () => {
    try {
      const response = await paymentAPI.getPaymentMethods();
      setPaymentMethods(response.data.methods || []);
    } catch (err) {
      console.error('Failed to load payment methods:', err);
      // Fallback payment methods if API fails
      setPaymentMethods([
        { id: 'cash', name: 'Cash', description: 'Physical cash payment' },
        { id: 'card', name: 'Credit/Debit Card', description: 'Card payment via terminal' },
        { id: 'upi', name: 'UPI', description: 'Unified Payments Interface' },
        { id: 'netbanking', name: 'Net Banking', description: 'Online banking transfer' },
        { id: 'wallet', name: 'Digital Wallet', description: 'Mobile wallet payment' }
      ]);
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

  const handleCalculateFee = async () => {
    if (!selectedVehicle) {
      setError('Please select a vehicle first');
      return;
    }

    try {
      setProcessing(true);
      setError('');

      const feeData = {
        vehicle_registration: selectedVehicle.vehicle_registration,
        slot_number: selectedVehicle.slot_number
      };

      const response = await parkingAPI.calculateFee(feeData);
      
      setCalculatedFee(response.data);
      setShowPaymentModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate fee');
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessPaymentExit = async () => {
    if (!selectedVehicle || !calculatedFee) {
      setError('Please calculate fee first');
      return;
    }

    try {
      setProcessing(true);
      setError('');

      const paymentExitData = {
        vehicle_registration: selectedVehicle.vehicle_registration,
        slot_number: selectedVehicle.slot_number,
        payment_method: paymentData.payment_method,
        transaction_id: paymentData.transaction_id,
        notes: paymentData.notes
      };

      const response = await parkingAPI.processPaymentExit(paymentExitData);
      
      setSuccessMessage(`Payment processed and vehicle exit completed successfully. Fee: ₹${response.data.fee_amount} (${response.data.payment_method})`);
      setSelectedVehicle(null);
      setSearchValue('');
      setShowPaymentModal(false);
      setCalculatedFee(null);
      setPaymentData({
        payment_method: 'cash',
        transaction_id: '',
        notes: ''
      });
      
      // Refresh current vehicles list
      fetchCurrentVehicles();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process payment and exit');
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickExit = async (vehicle) => {
    try {
      setProcessing(true);
      setError('');
      setSelectedVehicle(vehicle);
      
      const feeData = {
        vehicle_registration: vehicle.vehicle_registration,
        slot_number: vehicle.slot_number
      };

      const response = await parkingAPI.calculateFee(feeData);
      
      setCalculatedFee(response.data);
      setShowPaymentModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate fee');
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
              onClick={handleCalculateFee}
              disabled={!selectedVehicle || processing}
            >
              {processing ? 'Calculating...' : 'Calculate Fee & Process Payment'}
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

      {/* Payment Modal */}
      {showPaymentModal && calculatedFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Manual Payment Gateway</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Fee Calculation Summary */}
                <div className="border border-blue-200 bg-blue-50 rounded p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Fee Calculation</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vehicle:</span>
                      <span className="font-medium">{calculatedFee.record.vehicle_registration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Slot:</span>
                      <span className="font-medium">{calculatedFee.record.slot_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entry Time:</span>
                      <span className="font-medium">{new Date(calculatedFee.record.entry_time).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{calculatedFee.duration_minutes} minutes ({calculatedFee.hours} hours)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Hourly Rate:</span>
                      <span className="font-medium">₹{calculatedFee.hourly_rate}/hour</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-300 pt-2 mt-2">
                      <span className="text-gray-800 font-semibold">Total Fee:</span>
                      <span className="text-2xl font-bold text-green-600">₹{calculatedFee.fee_amount}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <select
                      value={paymentData.payment_method}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, payment_method: e.target.value, transaction_id: '' }))}
                      className="w-full border border-gray-300 rounded p-3"
                      required
                    >
                      {paymentMethods.map(method => (
                        <option key={method.id} value={method.id}>
                          {method.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dynamic Fields Based on Payment Method */}
                  {paymentData.payment_method === 'cash' && (
                    <div className="border border-yellow-200 bg-yellow-50 rounded p-4">
                      <h4 className="font-semibold text-yellow-800 mb-2">Cash Payment</h4>
                      <p className="text-yellow-700 text-sm">Collect cash from the customer and enter the transaction details below.</p>
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cash Received From</label>
                        <input
                          type="text"
                          value={paymentData.transaction_id}
                          onChange={(e) => setPaymentData(prev => ({ ...prev, transaction_id: e.target.value }))}
                          className="w-full border border-gray-300 rounded p-3"
                          placeholder="Enter customer name or receipt number"
                        />
                      </div>
                    </div>
                  )}

                  {paymentData.payment_method === 'card' && (
                    <div className="border border-blue-200 bg-blue-50 rounded p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">Card Payment</h4>
                      <p className="text-blue-700 text-sm">Process card payment and enter the transaction details.</p>
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Card Transaction ID</label>
                          <input
                            type="text"
                            value={paymentData.transaction_id}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, transaction_id: e.target.value }))}
                            className="w-full border border-gray-300 rounded p-3"
                            placeholder="Enter card transaction reference"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Card Last 4 Digits</label>
                          <input
                            type="text"
                            maxLength="4"
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setPaymentData(prev => ({ 
                                ...prev, 
                                notes: prev.notes ? `${prev.notes}\nCard: ****${value}` : `Card: ****${value}`
                              }));
                            }}
                            className="w-full border border-gray-300 rounded p-3"
                            placeholder="Last 4 digits of card"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentData.payment_method === 'upi' && (
                    <div className="border border-purple-200 bg-purple-50 rounded p-4">
                      <h4 className="font-semibold text-purple-800 mb-2">UPI Payment</h4>
                      <p className="text-purple-700 text-sm">Scan UPI QR code or collect payment via UPI ID.</p>
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">UPI Transaction ID</label>
                          <input
                            type="text"
                            value={paymentData.transaction_id}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, transaction_id: e.target.value }))}
                            className="w-full border border-gray-300 rounded p-3"
                            placeholder="Enter UPI transaction reference"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID / Mobile Number</label>
                          <input
                            type="text"
                            onChange={(e) => {
                              const value = e.target.value;
                              setPaymentData(prev => ({ 
                                ...prev, 
                                notes: prev.notes ? `${prev.notes}\nUPI: ${value}` : `UPI: ${value}`
                              }));
                            }}
                            className="w-full border border-gray-300 rounded p-3"
                            placeholder="Enter UPI ID or mobile number"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentData.payment_method === 'netbanking' && (
                    <div className="border border-orange-200 bg-orange-50 rounded p-4">
                      <h4 className="font-semibold text-orange-800 mb-2">Net Banking</h4>
                      <p className="text-orange-700 text-sm">Process net banking payment.</p>
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Bank Transaction ID</label>
                          <input
                            type="text"
                            value={paymentData.transaction_id}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, transaction_id: e.target.value }))}
                            className="w-full border border-gray-300 rounded p-3"
                            placeholder="Enter bank transaction reference"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                          <input
                            type="text"
                            onChange={(e) => {
                              const value = e.target.value;
                              setPaymentData(prev => ({ 
                                ...prev, 
                                notes: prev.notes ? `${prev.notes}\nBank: ${value}` : `Bank: ${value}`
                              }));
                            }}
                            className="w-full border border-gray-300 rounded p-3"
                            placeholder="Enter bank name"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentData.payment_method === 'wallet' && (
                    <div className="border border-green-200 bg-green-50 rounded p-4">
                      <h4 className="font-semibold text-green-800 mb-2">Digital Wallet</h4>
                      <p className="text-green-700 text-sm">Process payment via digital wallet (Paytm, PhonePe, etc.)</p>
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Transaction ID</label>
                          <input
                            type="text"
                            value={paymentData.transaction_id}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, transaction_id: e.target.value }))}
                            className="w-full border border-gray-300 rounded p-3"
                            placeholder="Enter wallet transaction reference"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Name</label>
                          <select
                            onChange={(e) => {
                              const value = e.target.value;
                              setPaymentData(prev => ({ 
                                ...prev, 
                                notes: prev.notes ? `${prev.notes}\nWallet: ${value}` : `Wallet: ${value}`
                              }));
                            }}
                            className="w-full border border-gray-300 rounded p-3"
                          >
                            <option value="">Select Wallet</option>
                            <option value="Paytm">Paytm</option>
                            <option value="PhonePe">PhonePe</option>
                            <option value="Google Pay">Google Pay</option>
                            <option value="Amazon Pay">Amazon Pay</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes (Optional)</label>
                    <textarea
                      value={paymentData.notes}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full border border-gray-300 rounded p-3"
                      rows="2"
                      placeholder="Add any additional notes about this payment..."
                    />
                  </div>
                </div>

                <div className="pt-4 flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessPaymentExit}
                    disabled={processing}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded disabled:bg-gray-400"
                  >
                    {processing ? 'Processing...' : 'Confirm Payment & Exit Vehicle'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleExit;
