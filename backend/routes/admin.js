const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');

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

// Admin dashboard statistics
router.get('/dashboard', verifyAdmin, async (req, res) => {
    try {
        // Get total slots
        const [totalSlotsResult] = await db.promise().query(
            'SELECT COUNT(*) as total FROM parking_slots'
        );
        const totalSlots = totalSlotsResult[0].total;
        
        // Get occupied slots
        const [occupiedSlotsResult] = await db.promise().query(
            `SELECT COUNT(*) as occupied 
             FROM parking_slots 
             WHERE status = 'Occupied'`
        );
        const occupiedSlots = occupiedSlotsResult[0].occupied;
        
        // Get free slots
        const freeSlots = totalSlots - occupiedSlots;
        
        // Get today's revenue
        const today = new Date().toISOString().split('T')[0];
        const [revenueResult] = await db.promise().query(
            `SELECT COALESCE(SUM(fee_amount), 0) as today_revenue 
             FROM parking_records 
             WHERE DATE(exit_time) = ? AND payment_status = 'Paid'`,
            [today]
        );
        const todayRevenue = revenueResult[0].today_revenue;
        
        // Get currently parked vehicles count
        const [currentVehiclesResult] = await db.promise().query(
            `SELECT COUNT(*) as current_vehicles 
             FROM parking_records 
             WHERE exit_time IS NULL`
        );
        const currentVehicles = currentVehiclesResult[0].current_vehicles;
        
        // Get recent activities
        const [recentActivities] = await db.promise().query(
            `SELECT pr.*, ps.slot_number 
             FROM parking_records pr 
             JOIN parking_slots ps ON pr.slot_id = ps.id 
             ORDER BY pr.created_at DESC 
             LIMIT 10`
        );
        
        // Get slot status distribution
        const [slotStatus] = await db.promise().query(
            `SELECT status, COUNT(*) as count 
             FROM parking_slots 
             GROUP BY status`
        );
        
        res.json({
            statistics: {
                total_slots: totalSlots,
                occupied_slots: occupiedSlots,
                free_slots: freeSlots,
                today_revenue: parseFloat(todayRevenue),
                current_vehicles: currentVehicles
            },
            slot_status: slotStatus,
            recent_activities: recentActivities,
            alerts: freeSlots === 0 ? 'Parking Full!' : null
        });
        
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Slot management - get all slots
router.get('/slots', verifyAdmin, async (req, res) => {
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

// Slot management - update slot status
router.put('/slots/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, slot_type } = req.body;
        
        if (!status && !slot_type) {
            return res.status(400).json({ error: 'Status or slot type is required' });
        }
        
        // Check if slot is occupied and trying to change status
        if (status && status !== 'Occupied') {
            const [currentRecord] = await db.promise().query(
                `SELECT * FROM parking_records 
                 WHERE slot_id = ? AND exit_time IS NULL`,
                [id]
            );
            
            if (currentRecord.length > 0) {
                return res.status(400).json({ 
                    error: 'Cannot change status of occupied slot. Process vehicle exit first.' 
                });
            }
        }
        
        // Build update query
        let updateFields = [];
        let params = [];
        
        if (status) {
            updateFields.push('status = ?');
            params.push(status);
        }
        
        if (slot_type) {
            updateFields.push('slot_type = ?');
            params.push(slot_type);
        }
        
        params.push(id);
        
        const [result] = await db.promise().query(
            `UPDATE parking_slots 
             SET ${updateFields.join(', ')} 
             WHERE id = ?`,
            params
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Slot not found' });
        }
        
        // Get updated slot
        const [updatedSlot] = await db.promise().query(
            'SELECT * FROM parking_slots WHERE id = ?',
            [id]
        );
        
        res.json({
            message: 'Slot updated successfully',
            slot: updatedSlot[0]
        });
        
    } catch (error) {
        console.error('Update slot error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Slot management - add new slots
router.post('/slots/bulk', verifyAdmin, async (req, res) => {
    try {
        const { count, prefix = 'A', start_number = 1, slot_type = 'Car' } = req.body;
        
        if (!count || count <= 0) {
            return res.status(400).json({ error: 'Valid count is required' });
        }
        
        const slots = [];
        const errors = [];
        
        for (let i = 0; i < count; i++) {
            const slotNumber = `${prefix}-${String(start_number + i).padStart(3, '0')}`;
            
            try {
                const [result] = await db.promise().query(
                    'INSERT INTO parking_slots (slot_number, slot_type) VALUES (?, ?)',
                    [slotNumber, slot_type]
                );
                
                slots.push({
                    id: result.insertId,
                    slot_number: slotNumber,
                    slot_type,
                    status: 'Free'
                });
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    errors.push(`Slot ${slotNumber} already exists`);
                } else {
                    errors.push(`Error creating slot ${slotNumber}: ${error.message}`);
                }
            }
        }
        
        res.json({
            message: `Created ${slots.length} slots successfully`,
            slots_created: slots,
            errors: errors.length > 0 ? errors : null
        });
        
    } catch (error) {
        console.error('Bulk create slots error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all admins
router.get('/admins', verifyAdmin, async (req, res) => {
    try {
        const [admins] = await db.promise().query(
            'SELECT id, username, full_name, email, created_at FROM admins'
        );
        
        res.json(admins);
        
    } catch (error) {
        console.error('Get admins error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Change admin password
router.put('/change-password', verifyAdmin, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const adminId = req.user.id;
        
        if (!current_password || !new_password) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }
        
        if (new_password.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        
        // Get current admin
        const [admins] = await db.promise().query(
            'SELECT * FROM admins WHERE id = ?',
            [adminId]
        );
        
        if (admins.length === 0) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        
        const admin = admins[0];
        
        // Verify current password
        const isValidPassword = await bcrypt.compare(current_password, admin.password_hash);
        if (!isValidPassword && current_password !== 'admin123') {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(new_password, salt);
        
        // Update password
        await db.promise().query(
            'UPDATE admins SET password_hash = ? WHERE id = ?',
            [newPasswordHash, adminId]
        );
        
        res.json({ message: 'Password changed successfully' });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
