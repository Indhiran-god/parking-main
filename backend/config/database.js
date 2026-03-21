const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// SQLite database file path
const dbPath = path.resolve(__dirname, '../parking.db');

// Create SQLite connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to SQLite database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON');
    }
});

// Helper function to standardise query results
const queryExecute = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        const queryType = sql.trim().split(' ')[0].toUpperCase();
        
        if (queryType === 'SELECT' || queryType === 'PRAGMA') {
            db.all(sql, params, (err, rows) => {
                if (err) return reject(err);
                resolve([rows, []]); // Mimic [rows, fields] return signature of mysql2
            });
        } else {
            db.run(sql, params, function(err) {
                if (err) return reject(err);
                // Mimic mysql2 result object
                const result = {
                    insertId: this.lastID,
                    affectedRows: this.changes,
                    warningStatus: 0,
                };
                resolve([result, undefined]);
            });
        }
    });
};

// Transaction support simulation
const connectionObj = {
    query: (sql, params, cb) => {
         // Support callback style if needed, but mostly used with promise
         if (typeof params === 'function') { cb = params; params = []; }
         queryExecute(sql, params)
            .then(([rows]) => cb(null, rows)) // mysql2 callback receives (err, rows, fields) usually, but simple cb(err, rows) is safer for basic usage or we can do cb(null, rows, [])
            .catch(err => cb(err));
    },
    beginTransaction: () => queryExecute('BEGIN TRANSACTION'),
    commit: () => queryExecute('COMMIT'),
    rollback: () => queryExecute('ROLLBACK'),
    release: () => {}, // No-op for SQLite
    // Add Promise wrapper for the connection object itself
    promise: () => ({
        query: queryExecute,
        beginTransaction: () => queryExecute('BEGIN TRANSACTION'),
        commit: () => queryExecute('COMMIT'),
        rollback: () => queryExecute('ROLLBACK'),
        release: () => Promise.resolve() 
    })
};

// Main export object mimicking the pool
const pool = {
    promise: () => ({
        query: queryExecute,
        getConnection: () => Promise.resolve(connectionObj.promise()) // Returns the promisified connection
    }),
    getConnection: (cb) => {
        // Return null error and the connection object
        if (cb) cb(null, connectionObj);
    }
};

module.exports = pool;
