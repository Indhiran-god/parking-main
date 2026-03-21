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

// Get all parking slots
router.get('/slots', async (req, res) => {
    try {
        const [slots] = await db.promise().query(
            'SELECT * FROM parking_slots ORDER BY slot_number'
        );
        
        // Get current parking records for occupied slots
        const [occupiedRecords] = await db.promise().query(
            `SELECT pr.*, ps.slot_number 
             FROM parking_records pr 
             JOIN parking_slots ps ON pr.slot_id = ps.id 
             WHERE pr.exit_time IS NULL`
        );
        
        // Map occupied slots
        const occupiedMap = {};
        occupiedRecords.forEach(record => {
            occupiedMap[record.slot_id] = record;
        });
        
        const slotsWithDetails = slots.map(slot => ({
            ...slot,
            current_vehicle: occupiedMap[slot.id] || null
        }));
        
        res.json(slotsWithDetails);
        
    } catch (error) {
        console.error('Get slots error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Vehicle entry (admin only)
router.post('/entry', verifyAdmin, async (req, res) => {
    try {
        const { vehicle_registration, owner_name, contact_number, vehicle_type } = req.body;
        
        if (!vehicle_registration) {
            return res.status(400).json({ error: 'Vehicle registration number is required' });
        }
        
        // Check if vehicle is already parked
        const [existing] = await db.promise().query(
            `SELECT * FROM parking_records 
             WHERE vehicle_registration = ? AND exit_time IS NULL`,
            [vehicle_registration]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ 
                error: 'Vehicle is already parked',
                details: existing[0]
            });
        }
        
        // Find available slot
        const [availableSlots] = await db.promise().query(
            `SELECT * FROM parking_slots 
             WHERE status = 'Free' 
             ORDER BY slot_number 
             LIMIT 1`
        );
        
        if (availableSlots.length === 0) {
            return res.status(400).json({ error: 'No parking slots available' });
        }
        
        const slot = availableSlots[0];
        const entryTime = new Date();
        
        // Start transaction
        const connection = await db.promise().getConnection();
        await connection.beginTransaction();
        
        try {
            // Update slot status
            await connection.query(
                'UPDATE parking_slots SET status = "Occupied" WHERE id = ?',
                [slot.id]
            );
            
            // Create parking record
            const [result] = await connection.query(
                `INSERT INTO parking_records 
                 (vehicle_registration, slot_id, owner_name, contact_number, vehicle_type, entry_time) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [vehicle_registration, slot.id, owner_name, contact_number, vehicle_type || 'Car', entryTime]
            );
            
            await connection.commit();
            connection.release();
            
            // Get the complete record
            const [record] = await db.promise().query(
                `SELECT pr.*, ps.slot_number 
                 FROM parking_records pr 
                 JOIN parking_slots ps ON pr.slot_id = ps.id 
                 WHERE pr.id = ?`,
                [result.insertId]
            );
            
            res.json({
                message: 'Vehicle entry registered successfully',
                record: record[0],
                slot_assigned: slot.slot_number
            });
            
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
        
    } catch (error) {
        console.error('Vehicle entry error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Vehicle exit (admin only)
router.post('/exit', verifyAdmin, async (req, res) => {
    try {
        const { vehicle_registration, slot_number } = req.body;
        
        if (!vehicle_registration && !slot_number) {
            return res.status(400).json({ error: 'Vehicle registration or slot number is required' });
        }
        
        // Find the active parking record
        let query = `SELECT pr.*, ps.slot_number 
                     FROM parking_records pr 
                     JOIN parking_slots ps ON pr.slot_id = ps.id 
                     WHERE pr.exit_time IS NULL`;
        
        let params = [];
        
        if (vehicle_registration) {
            query += ' AND pr.vehicle_registration = ?';
            params.push(vehicle_registration);
        } else if (slot_number) {
            query += ' AND ps.slot_number = ?';
            params.push(slot_number);
        }
        
        const [records] = await db.promise().query(query, params);
        
        if (records.length === 0) {
            return res.status(404).json({ error: 'No active parking record found' });
        }
        
        const record = records[0];
        const exitTime = new Date();
        const entryTime = new Date(record.entry_time);
        const durationMs = exitTime - entryTime;
        const durationMinutes = Math.floor(durationMs / (1000 * 60));
        
        // Calculate fee (50 INR per hour, minimum 1 hour)
        const hourlyRate = 50;
        const hours = Math.max(1, Math.ceil(durationMinutes / 60));
        const feeAmount = hours * hourlyRate;
        
        // Start transaction
        const connection = await db.promise().getConnection();
        await connection.beginTransaction();
        
        try {
            // Update parking record
            await connection.query(
                `UPDATE parking_records 
                 SET exit_time = ?, parking_duration_minutes = ?, fee_amount = ?, payment_status = 'Paid'
                 WHERE id = ?`,
                [exitTime, durationMinutes, feeAmount, record.id]
            );
            
            // Update slot status
            await connection.query(
                'UPDATE parking_slots SET status = "Free" WHERE id = ?',
                [record.slot_id]
            );
            
            await connection.commit();
            connection.release();
            
            // Get updated record
            const [updatedRecord] = await db.promise().query(
                `SELECT * FROM parking_records WHERE id = ?`,
                [record.id]
            );
            
            res.json({
                message: 'Vehicle exit processed successfully',
                record: updatedRecord[0],
                duration_minutes: durationMinutes,
                fee_amount: feeAmount,
                slot_freed: record.slot_number
            });
            
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
        
    } catch (error) {
        console.error('Vehicle exit error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get currently parked vehicles
router.get('/current', async (req, res) => {
    try {
        const [records] = await db.promise().query(
            `SELECT pr.*, ps.slot_number 
             FROM parking_records pr 
             JOIN parking_slots ps ON pr.slot_id = ps.id 
             WHERE pr.exit_time IS NULL 
             ORDER BY pr.entry_time DESC`
        );
        
        res.json(records);
        
    } catch (error) {
        console.error('Get current vehicles error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get parking history with filters
router.get('/history', async (req, res) => {
    try {
        const { vehicle_registration, date_from, date_to, limit = 100 } = req.query;
        
        let query = `SELECT pr.*, ps.slot_number 
                     FROM parking_records pr 
                     JOIN parking_slots ps ON pr.slot_id = ps.id 
                     WHERE 1=1`;
        
        let params = [];
        
        if (vehicle_registration) {
            query += ' AND pr.vehicle_registration = ?';
            params.push(vehicle_registration);
        }
        
        if (date_from) {
            query += ' AND DATE(pr.entry_time) >= ?';
            params.push(date_from);
        }
        
        if (date_to) {
            query += ' AND DATE(pr.entry_time) <= ?';
            params.push(date_to);
        }
        
        query += ' ORDER BY pr.entry_time DESC LIMIT ?';
        params.push(parseInt(limit));
        
        const [records] = await db.promise().query(query, params);
        
        res.json(records);
        
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
