const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Middleware to verify user token
const verifyUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.role !== 'user') {
            return res.status(403).json({ error: 'User access required' });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// User dashboard - get current parking status
router.get('/dashboard', verifyUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const vehicleRegistration = req.user.vehicle_registration;
        
        // Get user details
        const [users] = await db.promise().query(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = users[0];
        
        // Get current parking record if any
        const [currentParking] = await db.promise().query(
            `SELECT pr.*, ps.slot_number 
             FROM parking_records pr 
             JOIN parking_slots ps ON pr.slot_id = ps.id 
             WHERE pr.vehicle_registration = ? AND pr.exit_time IS NULL`,
            [vehicleRegistration]
        );
        
        let parkingStatus = 'Not Parked';
        let currentRecord = null;
        let elapsedMinutes = 0;
        let estimatedFee = 0;
        
        if (currentParking.length > 0) {
            parkingStatus = 'Parked';
            currentRecord = currentParking[0];
            
            // Calculate elapsed time
            const entryTime = new Date(currentRecord.entry_time);
            const now = new Date();
            elapsedMinutes = Math.floor((now - entryTime) / (1000 * 60));
            
            // Calculate estimated fee (50 INR per hour, minimum 1 hour)
            const hourlyRate = 50;
            const hours = Math.max(1, Math.ceil(elapsedMinutes / 60));
            estimatedFee = hours * hourlyRate;
        }
        
        // Get recent parking history
        const [recentHistory] = await db.promise().query(
            `SELECT pr.*, ps.slot_number 
             FROM parking_records pr 
             JOIN parking_slots ps ON pr.slot_id = ps.id 
             WHERE pr.vehicle_registration = ? 
             ORDER BY pr.entry_time DESC 
             LIMIT 5`,
            [vehicleRegistration]
        );
        
        res.json({
            user: {
                id: user.id,
                vehicle_registration: user.vehicle_registration,
                owner_name: user.owner_name,
                contact_number: user.contact_number,
                email: user.email
            },
            parking_status: parkingStatus,
            current_parking: currentRecord,
            elapsed_minutes: elapsedMinutes,
            estimated_fee: estimatedFee,
            recent_history: recentHistory,
            alerts: elapsedMinutes > 60 * 8 ? 'Parking time exceeded 8 hours' : null
        });
        
    } catch (error) {
        console.error('User dashboard error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// User parking history
router.get('/history', verifyUser, async (req, res) => {
    try {
        const vehicleRegistration = req.user.vehicle_registration;
        const { limit = 20, offset = 0 } = req.query;
        
        const [history] = await db.promise().query(
            `SELECT pr.*, ps.slot_number 
             FROM parking_records pr 
             JOIN parking_slots ps ON pr.slot_id = ps.id 
             WHERE pr.vehicle_registration = ? 
             ORDER BY pr.entry_time DESC 
             LIMIT ? OFFSET ?`,
            [vehicleRegistration, parseInt(limit), parseInt(offset)]
        );
        
        // Get total count for pagination
        const [countResult] = await db.promise().query(
            `SELECT COUNT(*) as total 
             FROM parking_records 
             WHERE vehicle_registration = ?`,
            [vehicleRegistration]
        );
        
        const total = countResult[0].total;
        
        res.json({
            history,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                has_more: (parseInt(offset) + history.length) < total
            }
        });
        
    } catch (error) {
        console.error('User history error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user profile
router.put('/profile', verifyUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { owner_name, contact_number, email, password } = req.body;
        
        // Build update query
        let updateFields = [];
        let params = [];
        
        if (owner_name) {
            updateFields.push('owner_name = ?');
            params.push(owner_name);
        }
        
        if (contact_number) {
            updateFields.push('contact_number = ?');
            params.push(contact_number);
        }
        
        if (email) {
            updateFields.push('email = ?');
            params.push(email);
        }
        
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters' });
            }
            
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            
            updateFields.push('password_hash = ?');
            params.push(passwordHash);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        params.push(userId);
        
        const [result] = await db.promise().query(
            `UPDATE users 
             SET ${updateFields.join(', ')} 
             WHERE id = ?`,
            params
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get updated user
        const [updatedUser] = await db.promise().query(
            'SELECT id, vehicle_registration, owner_name, contact_number, email FROM users WHERE id = ?',
            [userId]
        );
        
        res.json({
            message: 'Profile updated successfully',
            user: updatedUser[0]
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Submit vehicle entry request (user side)
router.post('/entry-request', verifyUser, async (req, res) => {
    try {
        const vehicleRegistration = req.user.vehicle_registration;
        const { vehicle_type = 'Car' } = req.body;
        
        // Check if vehicle is already parked
        const [existing] = await db.promise().query(
            `SELECT * FROM parking_records 
             WHERE vehicle_registration = ? AND exit_time IS NULL`,
            [vehicleRegistration]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ 
                error: 'Vehicle is already parked',
                details: existing[0]
            });
        }
        
        // Check for available slots
        const [availableSlots] = await db.promise().query(
            `SELECT COUNT(*) as available 
             FROM parking_slots 
             WHERE status = 'Free'`
        );
        
        const available = availableSlots[0].available;
        
        if (available === 0) {
            return res.status(400).json({ 
                error: 'No parking slots available',
                message: 'Please try again later or contact parking administrator'
            });
        }
        
        // Get user details for pre-fill
        const [users] = await db.promise().query(
            'SELECT owner_name, contact_number FROM users WHERE vehicle_registration = ?',
            [vehicleRegistration]
        );
        
        const user = users[0] || {};
        
        res.json({
            message: 'Entry request submitted successfully',
            request_details: {
                vehicle_registration: vehicleRegistration,
                owner_name: user.owner_name || 'Not specified',
                contact_number: user.contact_number || 'Not specified',
                vehicle_type,
                available_slots: available
            },
            note: 'Please proceed to the parking entrance for slot assignment'
        });
        
    } catch (error) {
        console.error('Entry request error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get exit details and payment information
router.get('/exit-details', verifyUser, async (req, res) => {
    try {
        const vehicleRegistration = req.user.vehicle_registration;
        
        // Get current parking record
        const [currentParking] = await db.promise().query(
            `SELECT pr.*, ps.slot_number 
             FROM parking_records pr 
             JOIN parking_slots ps ON pr.slot_id = ps.id 
             WHERE pr.vehicle_registration = ? AND pr.exit_time IS NULL`,
            [vehicleRegistration]
        );
        
        if (currentParking.length === 0) {
            return res.status(404).json({ 
                error: 'No active parking record found',
                message: 'Your vehicle is not currently parked'
            });
        }
        
        const record = currentParking[0];
        const entryTime = new Date(record.entry_time);
        const now = new Date();
        const durationMs = now - entryTime;
        const durationMinutes = Math.floor(durationMs / (1000 * 60));
        
        // Calculate fee (50 INR per hour, minimum 1 hour)
        const hourlyRate = 50;
        const hours = Math.max(1, Math.ceil(durationMinutes / 60));
        const feeAmount = hours * hourlyRate;
        
        res.json({
            vehicle_details: {
                vehicle_registration: record.vehicle_registration,
                owner_name: record.owner_name,
                contact_number: record.contact_number
            },
            parking_details: {
                slot_number: record.slot_number,
                entry_time: record.entry_time,
                current_time: now,
                duration_minutes: durationMinutes
            },
            payment_details: {
                hourly_rate: hourlyRate,
                hours_parked: hours,
                fee_amount: feeAmount,
                currency: 'INR'
            },
            instructions: 'Proceed to exit gate for payment and vehicle release'
        });
        
    } catch (error) {
        console.error('Exit details error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
