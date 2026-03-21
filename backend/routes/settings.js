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

// Get all system settings
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const [settings] = await db.promise().query(
            'SELECT * FROM system_settings ORDER BY setting_key'
        );

        // Convert to key-value object
        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.setting_key] = {
                value: setting.setting_value,
                description: setting.description,
                id: setting.id
            };
        });

        res.json(settingsObj);

    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update system settings
router.put('/', verifyAdmin, async (req, res) => {
    try {
        const updates = req.body;

        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ error: 'Settings data is required' });
        }

        const results = [];
        const errors = [];

        for (const [key, value] of Object.entries(updates)) {
            try {
                const [result] = await db.promise().query(
                    'UPDATE system_settings SET setting_value = ? WHERE setting_key = ?',
                    [String(value), key]
                );

                if (result.affectedRows === 0) {
                    // Try to insert if doesn't exist
                    await db.promise().query(
                        'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)',
                        [key, String(value)]
                    );
                }

                results.push({ key, value, status: 'updated' });
            } catch (error) {
                errors.push({ key, error: error.message });
            }
        }

        res.json({
            message: 'Settings updated successfully',
            results,
            errors: errors.length > 0 ? errors : null
        });

    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});



// Update parking rate (hourly rate)
router.put('/hourly-rate', verifyAdmin, async (req, res) => {
    try {
        const { hourly_rate } = req.body;

        if (!hourly_rate || isNaN(parseFloat(hourly_rate)) || parseFloat(hourly_rate) <= 0) {
            return res.status(400).json({ error: 'Valid hourly rate is required' });
        }

        const rate = parseFloat(hourly_rate);

        const [result] = await db.promise().query(
            'UPDATE system_settings SET setting_value = ? WHERE setting_key = "hourly_rate"',
            [rate]
        );

        if (result.affectedRows === 0) {
            await db.promise().query(
                'INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)',
                ['hourly_rate', rate, 'Parking fee per hour in local currency']
            );
        }

        res.json({
            message: 'Hourly rate updated successfully',
            hourly_rate: rate
        });

    } catch (error) {
        console.error('Update hourly rate error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get system information
router.get('/system/info', verifyAdmin, async (req, res) => {
    try {
        // Get database statistics
        const [totalSlots] = await db.promise().query('SELECT COUNT(*) as count FROM parking_slots');
        const [totalRecords] = await db.promise().query('SELECT COUNT(*) as count FROM parking_records');
        const [totalUsers] = await db.promise().query('SELECT COUNT(*) as count FROM users');
        const [totalAdmins] = await db.promise().query('SELECT COUNT(*) as count FROM admins');

        // Get current settings
        const [settings] = await db.promise().query(
            'SELECT setting_key, setting_value FROM system_settings'
        );

        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.setting_key] = setting.setting_value;
        });

        res.json({
            system_info: {
                name: settingsObj.system_name || 'Vehicle Parking Management System',
                version: '1.0.0',
                database: {
                    total_slots: totalSlots[0].count,
                    total_records: totalRecords[0].count,
                    total_users: totalUsers[0].count,
                    total_admins: totalAdmins[0].count
                },
                settings: settingsObj,
                server_time: new Date().toISOString(),
                uptime: process.uptime()
            }
        });

    } catch (error) {
        console.error('Get system info error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create system backup (downloads SQLite database file)
router.get('/backup', verifyAdmin, async (req, res) => {
    try {
        const path = require('path');
        const dbPath = path.resolve(__dirname, '../parking.db');
        const filename = `parking-system-backup-${new Date().toISOString().split('T')[0]}.db`;

        res.download(dbPath, filename, (err) => {
            if (err) {
                console.error('File download error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to download backup file' });
                }
            }
        });
    } catch (error) {
        console.error('Backup error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get specific setting (Wildcard - must be last)
router.get('/:key', verifyAdmin, async (req, res) => {
    try {
        const { key } = req.params;

        const [settings] = await db.promise().query(
            'SELECT * FROM system_settings WHERE setting_key = ?',
            [key]
        );

        if (settings.length === 0) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        res.json(settings[0]);

    } catch (error) {
        console.error('Get setting error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
