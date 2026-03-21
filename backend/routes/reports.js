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

// Get currently parked vehicles report
router.get('/current-vehicles', verifyAdmin, async (req, res) => {
    try {
        const { search, vehicle_type, sort_by = 'entry_time', sort_order = 'DESC' } = req.query;
        
        let query = `SELECT pr.*, ps.slot_number 
                     FROM parking_records pr 
                     JOIN parking_slots ps ON pr.slot_id = ps.id 
                     WHERE pr.exit_time IS NULL`;
        
        let params = [];
        
        if (search) {
            query += ' AND (pr.vehicle_registration LIKE ? OR pr.owner_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (vehicle_type) {
            query += ' AND pr.vehicle_type = ?';
            params.push(vehicle_type);
        }
        
        // Validate sort column to prevent SQL injection
        const validSortColumns = ['entry_time', 'vehicle_registration', 'slot_number', 'owner_name'];
        const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'entry_time';
        const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        
        query += ` ORDER BY ${sortColumn} ${sortDirection}`;
        
        const [vehicles] = await db.promise().query(query, params);
        
        res.json({
            count: vehicles.length,
            vehicles
        });
        
    } catch (error) {
        console.error('Current vehicles report error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get parking history report with filters
router.get('/parking-history', verifyAdmin, async (req, res) => {
    try {
        const { 
            vehicle_registration, 
            date_from, 
            date_to, 
            vehicle_type,
            payment_status,
            limit = 100,
            offset = 0
        } = req.query;
        
        let query = `SELECT pr.*, ps.slot_number 
                     FROM parking_records pr 
                     JOIN parking_slots ps ON pr.slot_id = ps.id 
                     WHERE 1=1`;
        
        let countQuery = `SELECT COUNT(*) as total 
                          FROM parking_records pr 
                          JOIN parking_slots ps ON pr.slot_id = ps.id 
                          WHERE 1=1`;
        
        let params = [];
        let countParams = [];
        
        if (vehicle_registration) {
            query += ' AND pr.vehicle_registration LIKE ?';
            countQuery += ' AND pr.vehicle_registration LIKE ?';
            params.push(`%${vehicle_registration}%`);
            countParams.push(`%${vehicle_registration}%`);
        }
        
        if (date_from) {
            query += ' AND DATE(pr.entry_time) >= ?';
            countQuery += ' AND DATE(pr.entry_time) >= ?';
            params.push(date_from);
            countParams.push(date_from);
        }
        
        if (date_to) {
            query += ' AND DATE(pr.entry_time) <= ?';
            countQuery += ' AND DATE(pr.entry_time) <= ?';
            params.push(date_to);
            countParams.push(date_to);
        }
        
        if (vehicle_type) {
            query += ' AND pr.vehicle_type = ?';
            countQuery += ' AND pr.vehicle_type = ?';
            params.push(vehicle_type);
            countParams.push(vehicle_type);
        }
        
        if (payment_status) {
            query += ' AND pr.payment_status = ?';
            countQuery += ' AND pr.payment_status = ?';
            params.push(payment_status);
            countParams.push(payment_status);
        }
        
        query += ' ORDER BY pr.entry_time DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [records] = await db.promise().query(query, params);
        const [countResult] = await db.promise().query(countQuery, countParams);
        
        const total = countResult[0].total;
        
        res.json({
            records,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                has_more: (parseInt(offset) + records.length) < total
            }
        });
        
    } catch (error) {
        console.error('Parking history report error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get revenue report
router.get('/revenue', verifyAdmin, async (req, res) => {
    try {
        const { period = 'daily', date_from, date_to } = req.query;
        
        let revenueQuery = '';
        let params = [];
        
        switch (period) {
            case 'daily':
                revenueQuery = `
                    SELECT 
                        DATE(exit_time) as date,
                        COUNT(*) as transactions,
                        SUM(fee_amount) as total_revenue,
                        AVG(fee_amount) as average_fee
                    FROM parking_records 
                    WHERE exit_time IS NOT NULL AND payment_status = 'Paid'
                    GROUP BY DATE(exit_time)
                    ORDER BY date DESC
                    LIMIT 30
                `;
                break;
                
            case 'weekly':
                revenueQuery = `
                    SELECT 
                        YEARWEEK(exit_time) as week,
                        COUNT(*) as transactions,
                        SUM(fee_amount) as total_revenue,
                        AVG(fee_amount) as average_fee
                    FROM parking_records 
                    WHERE exit_time IS NOT NULL AND payment_status = 'Paid'
                    GROUP BY YEARWEEK(exit_time)
                    ORDER BY week DESC
                    LIMIT 12
                `;
                break;
                
            case 'monthly':
                revenueQuery = `
                    SELECT 
                        DATE_FORMAT(exit_time, '%Y-%m') as month,
                        COUNT(*) as transactions,
                        SUM(fee_amount) as total_revenue,
                        AVG(fee_amount) as average_fee
                    FROM parking_records 
                    WHERE exit_time IS NOT NULL AND payment_status = 'Paid'
                    GROUP BY DATE_FORMAT(exit_time, '%Y-%m')
                    ORDER BY month DESC
                    LIMIT 12
                `;
                break;
                
            case 'custom':
                if (!date_from || !date_to) {
                    return res.status(400).json({ error: 'date_from and date_to are required for custom period' });
                }
                revenueQuery = `
                    SELECT 
                        DATE(exit_time) as date,
                        COUNT(*) as transactions,
                        SUM(fee_amount) as total_revenue,
                        AVG(fee_amount) as average_fee
                    FROM parking_records 
                    WHERE exit_time IS NOT NULL 
                      AND payment_status = 'Paid'
                      AND DATE(exit_time) BETWEEN ? AND ?
                    GROUP BY DATE(exit_time)
                    ORDER BY date
                `;
                params.push(date_from, date_to);
                break;
                
            default:
                return res.status(400).json({ error: 'Invalid period. Use daily, weekly, monthly, or custom' });
        }
        
        const [revenueData] = await db.promise().query(revenueQuery, params);
        
        // Calculate summary statistics
        const totalRevenue = revenueData.reduce((sum, item) => sum + parseFloat(item.total_revenue || 0), 0);
        const totalTransactions = revenueData.reduce((sum, item) => sum + (item.transactions || 0), 0);
        const averageRevenue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
        
        res.json({
            period,
            date_range: {
                from: date_from,
                to: date_to
            },
            summary: {
                total_revenue: totalRevenue,
                total_transactions: totalTransactions,
                average_per_transaction: averageRevenue
            },
            data: revenueData
        });
        
    } catch (error) {
        console.error('Revenue report error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get slot utilization report
router.get('/slot-utilization', verifyAdmin, async (req, res) => {
    try {
        const { date_from, date_to } = req.query;
        
        // Get slot utilization statistics
        const [utilization] = await db.promise().query(`
            SELECT 
                ps.slot_number,
                ps.slot_type,
                ps.status as current_status,
                COUNT(pr.id) as total_usage,
                COALESCE(SUM(pr.parking_duration_minutes), 0) as total_minutes_occupied,
                COALESCE(AVG(pr.parking_duration_minutes), 0) as avg_minutes_per_use
            FROM parking_slots ps
            LEFT JOIN parking_records pr ON ps.id = pr.slot_id
            WHERE (? IS NULL OR DATE(pr.entry_time) >= ?)
              AND (? IS NULL OR DATE(pr.entry_time) <= ?)
            GROUP BY ps.id, ps.slot_number, ps.slot_type, ps.status
            ORDER BY ps.slot_number
        `, [date_from, date_from, date_to, date_to]);
        
        // Get overall statistics
        const [overallStats] = await db.promise().query(`
            SELECT 
                COUNT(*) as total_slots,
                SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) as occupied_slots,
                SUM(CASE WHEN status = 'Free' THEN 1 ELSE 0 END) as free_slots,
                SUM(CASE WHEN status = 'Reserved' THEN 1 ELSE 0 END) as reserved_slots,
                SUM(CASE WHEN status = 'Maintenance' THEN 1 ELSE 0 END) as maintenance_slots
            FROM parking_slots
        `);
        
        res.json({
            date_range: {
                from: date_from,
                to: date_to
            },
            overall: overallStats[0],
            slot_utilization: utilization
        });
        
    } catch (error) {
        console.error('Slot utilization report error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Export report data (simplified - returns JSON)
router.get('/export', verifyAdmin, async (req, res) => {
    try {
        const { report_type, format = 'json', ...filters } = req.query;
        
        let data;
        
        switch (report_type) {
            case 'current-vehicles':
                const [currentVehicles] = await db.promise().query(
                    `SELECT pr.*, ps.slot_number 
                     FROM parking_records pr 
                     JOIN parking_slots ps ON pr.slot_id = ps.id 
                     WHERE pr.exit_time IS NULL 
                     ORDER BY pr.entry_time DESC`
                );
                data = currentVehicles;
                break;
                
            case 'parking-history':
                const [history] = await db.promise().query(
                    `SELECT pr.*, ps.slot_number 
                     FROM parking_records pr 
                     JOIN parking_slots ps ON pr.slot_id = ps.id 
                     WHERE pr.exit_time IS NOT NULL 
                     ORDER BY pr.entry_time DESC 
                     LIMIT 1000`
                );
                data = history;
                break;
                
            case 'revenue':
                const [revenue] = await db.promise().query(`
                    SELECT 
                        DATE(exit_time) as date,
                        COUNT(*) as transactions,
                        SUM(fee_amount) as total_revenue
                    FROM parking_records 
                    WHERE exit_time IS NOT NULL AND payment_status = 'Paid'
                    GROUP BY DATE(exit_time)
                    ORDER BY date DESC
                    LIMIT 90
                `);
                data = revenue;
                break;
                
            default:
                return res.status(400).json({ error: 'Invalid report type' });
        }
        
        if (format === 'csv') {
            // Simple CSV conversion
            if (data.length === 0) {
                return res.status(400).json({ error: 'No data to export' });
            }
            
            const headers = Object.keys(data[0]).join(',');
            const rows = data.map(row => 
                Object.values(row).map(value => 
                    typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
                ).join(',')
            ).join('\n');
            
            const csv = `${headers}\n${rows}`;
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${report_type}-${new Date().toISOString().split('T')[0]}.csv"`);
            return res.send(csv);
        }
        
        // Default JSON response
        res.json({
            report_type,
            format,
            generated_at: new Date().toISOString(),
            record_count: data.length,
            data
        });
        
    } catch (error) {
        console.error('Export report error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
