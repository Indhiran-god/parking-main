const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Admin login
router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        const [rows] = await db.promise().query(
            'SELECT * FROM admins WHERE username = ?',
            [username]
        );
        
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const admin = rows[0];
        
        // For demo purposes, check if password is 'admin123' (hashed in database)
        // In production, use bcrypt.compare
        const isValidPassword = await bcrypt.compare(password, admin.password_hash);
        
        if (!isValidPassword) {
            // For demo, also check plain text (temporary)
            if (password !== 'admin123') {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        }
        
        // Create JWT token
        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: admin.id,
                username: admin.username,
                full_name: admin.full_name,
                email: admin.email,
                role: 'admin'
            }
        });
        
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// User login/access
router.post('/user/login', async (req, res) => {
    try {
        const { vehicle_registration, password } = req.body;
        
        if (!vehicle_registration) {
            return res.status(400).json({ error: 'Vehicle registration number is required' });
        }
        
        const [rows] = await db.promise().query(
            'SELECT * FROM users WHERE vehicle_registration = ?',
            [vehicle_registration]
        );
        
        if (rows.length === 0) {
            // For new users, allow access without password (demo)
            // Create a temporary user record
            const [result] = await db.promise().query(
                'INSERT INTO users (vehicle_registration, owner_name) VALUES (?, ?)',
                [vehicle_registration, 'Guest User']
            );
            
            const token = jwt.sign(
                { id: result.insertId, vehicle_registration, role: 'user' },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );
            
            return res.json({
                message: 'Access granted (new user)',
                token,
                user: {
                    id: result.insertId,
                    vehicle_registration,
                    owner_name: 'Guest User',
                    role: 'user'
                }
            });
        }
        
        const user = rows[0];
        
        // Check password if exists
        if (user.password_hash && password) {
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid password' });
            }
        }
        
        // Create JWT token
        const token = jwt.sign(
            { id: user.id, vehicle_registration: user.vehicle_registration, role: 'user' },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                vehicle_registration: user.vehicle_registration,
                owner_name: user.owner_name,
                contact_number: user.contact_number,
                email: user.email,
                role: 'user'
            }
        });
        
    } catch (error) {
        console.error('User login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Verify token
router.post('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ valid: true, user: decoded });
        
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
