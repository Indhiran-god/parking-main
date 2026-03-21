import React, { useState, useEffect } from 'react';
import { paymentAPI } from '../../services/api';

const Payment = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showManualUpdateModal, setShowManualUpdateModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    payment_method: 'all',
    date_from: '',
    date_to: ''
  });
  const [manualUpdateData, setManualUpdateData] = useState({
    payment_id: '',
    amount: '',
    payment_method: 'cash',
    transaction_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.getAllPayments(filters);
      setPayments(response.data.payments || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load payments');
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

  const handleApplyFilters = () => {
    fetchPayments();
  };

  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      payment_method: 'all',
      date_from: '',
      date_to: ''
    });
    fetchPayments();
  };

  const handleViewPayment = (payment) => {
    setSelectedPayment(payment);
    setShowPaymentModal(true);
  };

  const handleManualUpdate = (payment) => {
    setManualUpdateData({
      payment_id: payment.id,
      amount: payment.amount || '',
      payment_method: payment.payment_method || 'cash',
      transaction_id: payment.transaction_id || '',
      notes: ''
    });
    setShowManualUpdateModal(true);
  };

  const handleManualUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      const response = await paymentAPI.manualUpdatePayment(manualUpdateData);
      
      setSuccessMessage('Payment manually updated successfully');
      setShowManualUpdateModal(false);
      fetchPayments();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update payment');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRefund = async (paymentId) => {
    if (!window.confirm('Are you sure you want to process a refund for this payment?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      const response = await paymentAPI.processRefund(paymentId);
      
      setSuccessMessage('Refund processed successfully');
      fetchPayments();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.exportPayments(filters);
      
      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to export payments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge-success">Completed</span>;
      case 'pending':
        return <span className="badge-warning">Pending</span>;
      case 'failed':
        return <span className="badge-danger">Failed</span>;
      case 'refunded':
        return <span className="badge-info">Refunded</span>;
      default:
        return <span className="badge-neutral">{status}</span>;
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'cash':
        return <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
          <span className="text-green-600 font-bold">C</span>
        </div>;
      case 'card':
        return <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <span className="text-blue-600 font-bold">💳</span>
        </div>;
      case 'upi':
        return <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
          <span className="text-purple-600 font-bold">UPI</span>
        </div>;
      case 'netbanking':
        return <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
          <span className="text-orange-600 font-bold">NB</span>
        </div>;
      default:
        return <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-gray-600 font-bold">$</span>
        </div>;
    }
  };

  const calculateStats = () => {
    const total = payments.length;
    const completed = payments.filter(p => p.status === 'completed').length;
    const pending = payments.filter(p => p.status === 'pending').length;
    const totalAmount = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    
    return { total, completed, pending, totalAmount };
  };

  const stats = calculateStats();

  return (
    <div className="animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-800">Payment Management</h1>
        <p className="text-neutral-600 mt-2">Manage all payment transactions and process manual updates</p>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 mb-6 animate-slideUp">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {successMessage}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-6 animate-slideUp">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card-professional p-6 animate-fadeIn stagger-1">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Total Payments</p>
              <p className="text-2xl font-bold text-neutral-800">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card-professional p-6 animate-fadeIn stagger-2">
          <div className="flex items-center">
            <div className="p-3 bg-emerald-100 rounded-xl mr-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Completed</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="card-professional p-6 animate-fadeIn stagger-3">
          <div className="flex items-center">
            <div className="p-3 bg-amber-100 rounded-xl mr-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="card-professional p-6 animate-fadeIn stagger-4">
          <div className="flex items-center">
            <div className="p-3 bg-indigo-100 rounded-xl mr-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Total Amount</p>
              <p className="text-2xl font-bold text-indigo-600">₹{stats.totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-professional p-6 mb-8 animate-slideUp">
        <h2 className="text-lg font-semibold text-neutral-800 mb-4">Filter Payments</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="input-professional"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Payment Method</label>
            <select
              name="payment_method"
              value={filters.payment_method}
              onChange={handleFilterChange}
              className="input-professional"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="netbanking">Net Banking</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">From Date</label>
            <input
              type="date"
              name="date_from"
              value={filters.date_from}
              onChange={handleFilterChange}
              className="input-professional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">To Date</label>
            <input
              type="date"
              name="date_to"
              value={filters.date_to}
              onChange={handleFilterChange}
              className="input-professional"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={handleClearFilters}
            className="btn-secondary-pro px-6 py-2"
          >
            Clear Filters
          </button>
          <button
            onClick={handleApplyFilters}
            className="btn-primary-pro px-6 py-2"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-neutral-800">Payment Transactions</h2>
        <div className="flex space-x-3">
          <button
            onClick={handleExportPayments}
            disabled={loading || payments.length === 0}
            className="btn-secondary-pro px-4 py-2 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card-professional overflow-hidden animate-scaleIn">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <div className="text-neutral-600">Loading payment data...</div>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-neutral-600 text-lg mb-2">No payments found</div>
            <p className="text-neutral-500">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-professional">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Vehicle</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="animate-fadeIn">
                    <td>
                      <div className="font-medium text-neutral-800">{payment.transaction_id || 'N/A'}</div>
                      <div className="text-xs text-neutral-500">ID: {payment.id}</div>
                    </td>
                    <td>
                      <div className="font-medium">{payment.vehicle_registration}</div>
                      <div className="text-xs text-neutral-500">{payment.slot_number}</div>
                    </td>
                    <td className="font-semibold text-neutral-800">₹{parseFloat(payment.amount || 0).toFixed(2)}</td>
                    <td>
                      <div className="flex items-center">
                        {getPaymentMethodIcon(payment.payment_method)}
                        <span className="ml-2 capitalize">{payment.payment_method}</span>
                      </div>
                    </td>
                    <td>{getStatusBadge(payment.status)}</td>
                    <td>
                      <div className="text-sm">{new Date(payment.created_at).toLocaleDateString()}</div>
                      <div className="text-xs text-neutral-500">{new Date(payment.created_at).toLocaleTimeString()}</div>
                    </td>
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewPayment(payment)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleManualUpdate(payment)}
                          className="text-emerald-600 hover:text-emerald-800 text-sm font-medium"
                        >
                          Update
                        </button>
                        {payment.status === 'completed' && (
                          <button
                            onClick={() => handleProcessRefund(payment.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-neutral-800">Payment Details</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-500">Transaction ID</label>
                    <div className="text-lg font-semibold text-neutral-800">{selectedPayment.transaction_id || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-500">Amount</label>
                    <div className="text-2xl font-bold text-emerald-600">₹{parseFloat(selectedPayment.amount || 0).toFixed(2)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-500">Vehicle</label>
                    <div className="text-lg font-medium text-neutral-800">{selectedPayment.vehicle_registration}</div>
                    <div className="text-sm text-neutral-500">Slot: {selectedPayment.slot_number}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-500">Payment Method</label>
                    <div className="flex items-center">
                      {getPaymentMethodIcon(selectedPayment.payment_method)}
                      <span className="ml-2 text-lg font-medium capitalize">{selectedPayment.payment_method}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-500">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-500">Date & Time</label>
                    <div className="text-lg font-medium text-neutral-800">
                      {new Date(selectedPayment.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {selectedPayment.notes && (
                  <div>
                    <label className="text-sm font-medium text-neutral-500">Notes</label>
                    <div className="mt-1 p-3 bg-neutral-50 rounded-lg text-neutral-700">
                      {selectedPayment.notes}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-neutral-200">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="w-full btn-secondary-pro py-3"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Update Modal */}
      {showManualUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-neutral-800">Manual Payment Update</h3>
                <button
                  onClick={() => setShowManualUpdateModal(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleManualUpdateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualUpdateData.amount}
                    onChange={(e) => setManualUpdateData(prev => ({ ...prev, amount: e.target.value }))}
                    className="input-professional"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Payment Method</label>
                  <select
                    value={manualUpdateData.payment_method}
                    onChange={(e) => setManualUpdateData(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="input-professional"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Credit/Debit Card</option>
                    <option value="upi">UPI</option>
                    <option value="netbanking">Net Banking</option>
                    <option value="wallet">Digital Wallet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Transaction ID</label>
                  <input
                    type="text"
                    value={manualUpdateData.transaction_id}
                    onChange={(e) => setManualUpdateData(prev => ({ ...prev, transaction_id: e.target.value }))}
                    className="input-professional"
                    placeholder="Enter transaction reference"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Notes</label>
                  <textarea
                    value={manualUpdateData.notes}
                    onChange={(e) => setManualUpdateData(prev => ({ ...prev, notes: e.target.value }))}
                    className="input-professional"
                    rows="3"
                    placeholder="Add any notes about this manual update..."
                  />
                </div>

                <div className="pt-4 flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowManualUpdateModal(false)}
                    className="flex-1 btn-secondary-pro py-3"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 btn-primary-pro py-3"
                  >
                    {loading ? 'Updating...' : 'Update Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payment;
