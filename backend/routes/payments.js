const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Middleware to verify admin token
const verifyAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Get all payments with filters
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const { status, payment_method, date_from, date_to, limit = 100 } = req.query;
        
        let query = `
            SELECT p.*, pr.vehicle_registration, ps.slot_number, pr.owner_name
            FROM payments p
            LEFT JOIN parking_records pr ON p.parking_record_id = pr.id
            LEFT JOIN parking_slots ps ON pr.slot_id = ps.id
            WHERE 1=1
        `;
        
        let params = [];
        
        if (status && status !== 'all') {
            query += ' AND p.status = ?';
            params.push(status);
        }
        
        if (payment_method && payment_method !== 'all') {
            query += ' AND p.payment_method = ?';
            params.push(payment_method);
        }
        
        if (date_from) {
            query += ' AND DATE(p.created_at) >= ?';
            params.push(date_from);
        }
        
        if (date_to) {
            query += ' AND DATE(p.created_at) <= ?';
            params.push(date_to);
        }
        
        query += ' ORDER BY p.created_at DESC LIMIT ?';
        params.push(parseInt(limit));
        
        const [payments] = await db.promise().query(query, params);
        
        res.json({ payments });
        
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single payment
router.get('/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const [payments] = await db.promise().query(
            `SELECT p.*, pr.vehicle_registration, ps.slot_number, pr.owner_name
             FROM payments p
             LEFT JOIN parking_records pr ON p.parking_record_id = pr.id
             LEFT JOIN parking_slots ps ON pr.slot_id = ps.id
             WHERE p.id = ?`,
            [id]
        );
        
        if (payments.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        res.json(payments[0]);
        
    } catch (error) {
        console.error('Get payment error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Manual payment update
router.put('/manual-update', verifyAdmin, async (req, res) => {
    try {
        const { payment_id, amount, payment_method, transaction_id, notes } = req.body;
        
        if (!payment_id || !amount || !payment_method) {
            return res.status(400).json({ error: 'Payment ID, amount, and payment method are required' });
        }
        
        // Check if payment exists
        const [existing] = await db.promise().query(
            'SELECT * FROM payments WHERE id = ?',
            [payment_id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        const updateData = {
            amount: parseFloat(amount),
            payment_method,
            transaction_id: transaction_id || null,
            notes: notes || null,
            status: 'completed',
            updated_at: new Date()
        };
        
        await db.promise().query(
            'UPDATE payments SET ? WHERE id = ?',
            [updateData, payment_id]
        );
        
        // Get updated payment
        const [updatedPayment] = await db.promise().query(
            `SELECT p.*, pr.vehicle_registration, pr.slot_number, pr.owner_name
             FROM payments p
             LEFT JOIN parking_records pr ON p.parking_record_id = pr.id
             WHERE p.id = ?`,
            [payment_id]
        );
        
        res.json({
            message: 'Payment updated successfully',
            payment: updatedPayment[0]
        });
        
    } catch (error) {
        console.error('Manual update error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Process refund
router.post('/:id/refund', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if payment exists and is completed
        const [payment] = await db.promise().query(
            'SELECT * FROM payments WHERE id = ? AND status = "completed"',
            [id]
        );
        
        if (payment.length === 0) {
            return res.status(404).json({ error: 'Completed payment not found' });
        }
        
        // Update payment status to refunded
        await db.promise().query(
            'UPDATE payments SET status = "refunded", updated_at = ? WHERE id = ?',
            [new Date(), id]
        );
        
        // Create refund record
        await db.promise().query(
            `INSERT INTO refunds 
             (payment_id, amount, refund_reason, processed_by, created_at) 
             VALUES (?, ?, ?, ?, ?)`,
            [id, payment[0].amount, 'Admin initiated refund', req.user.username, new Date()]
        );
        
        res.json({
            message: 'Refund processed successfully',
            refund_amount: payment[0].amount
        });
        
    } catch (error) {
        console.error('Refund error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get payment methods
router.get('/methods', verifyAdmin, async (req, res) => {
    try {
        const methods = [
            { id: 'cash', name: 'Cash', description: 'Physical cash payment' },
            { id: 'card', name: 'Credit/Debit Card', description: 'Card payment via terminal' },
            { id: 'upi', name: 'UPI', description: 'Unified Payments Interface' },
            { id: 'netbanking', name: 'Net Banking', description: 'Online banking transfer' },
            { id: 'wallet', name: 'Digital Wallet', description: 'Mobile wallet payment' }
        ];
        
        res.json({ methods });
        
    } catch (error) {
        console.error('Get payment methods error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get payment statistics
router.get('/stats', verifyAdmin, async (req, res) => {
    try {
        const [totalResult] = await db.promise().query(
            'SELECT COUNT(*) as total, SUM(amount) as total_amount FROM payments'
        );
        
        const [statusResult] = await db.promise().query(
            'SELECT status, COUNT(*) as count, SUM(amount) as amount FROM payments GROUP BY status'
        );
        
        const [methodResult] = await db.promise().query(
            'SELECT payment_method, COUNT(*) as count, SUM(amount) as amount FROM payments GROUP BY payment_method'
        );
        
        const [dailyResult] = await db.promise().query(
            `SELECT DATE(created_at) as date, COUNT(*) as transactions, SUM(amount) as revenue 
             FROM payments 
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY DATE(created_at) 
             ORDER BY date DESC`
        );
        
        res.json({
            total: totalResult[0].total || 0,
            total_amount: totalResult[0].total_amount || 0,
            by_status: statusResult,
            by_method: methodResult,
            daily_stats: dailyResult
        });
        
    } catch (error) {
        console.error('Get payment stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Export payments to CSV
router.get('/export', verifyAdmin, async (req, res) => {
    try {
        const { status, payment_method, date_from, date_to } = req.query;
        
        let query = `
            SELECT 
                p.id,
                p.transaction_id,
                pr.vehicle_registration,
                pr.slot_number,
                p.amount,
                p.payment_method,
                p.status,
                p.created_at,
                p.updated_at,
                p.notes
            FROM payments p
            LEFT JOIN parking_records pr ON p.parking_record_id = pr.id
            WHERE 1=1
        `;
        
        let params = [];
        
        if (status && status !== 'all') {
            query += ' AND p.status = ?';
            params.push(status);
        }
        
        if (payment_method && payment_method !== 'all') {
            query += ' AND p.payment_method = ?';
            params.push(payment_method);
        }
        
        if (date_from) {
            query += ' AND DATE(p.created_at) >= ?';
            params.push(date_from);
        }
        
        if (date_to) {
            query += ' AND DATE(p.created_at) <= ?';
            params.push(date_to);
        }
        
        query += ' ORDER BY p.created_at DESC';
        
        const [payments] = await db.promise().query(query, params);
        
        // Convert to CSV
        const headers = [
            'ID',
            'Transaction ID',
            'Vehicle Registration',
            'Slot Number',
            'Amount',
            'Payment Method',
            'Status',
            'Created At',
            'Updated At',
            'Notes'
        ];
        
        let csv = headers.join(',') + '\n';
        
        payments.forEach(payment => {
            const row = [
                payment.id,
                `"${payment.transaction_id || ''}"`,
                `"${payment.vehicle_registration || ''}"`,
                `"${payment.slot_number || ''}"`,
                payment.amount,
                payment.payment_method,
                payment.status,
                new Date(payment.created_at).toISOString(),
                new Date(payment.updated_at).toISOString(),
                `"${payment.notes || ''}"`
            ];
            csv += row.join(',') + '\n';
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=payments-export.csv');
        res.send(csv);
        
    } catch (error) {
        console.error('Export payments error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;