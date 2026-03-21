const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbPath = path.resolve(__dirname, 'parking.db');

// Check if DB exists
const dbExists = fs.existsSync(dbPath);
if (dbExists) {
  console.log('Database file already exists.');
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database.');
});

async function setup() {
  try {
    const sqlFile = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');

    console.log('Executing schema...');

    // Execute the schema script
    await new Promise((resolve, reject) => {
      db.exec(sqlFile, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('Schema executed successfully.');

    // Insert Default Slots manually (since stored procedure was removed)
    console.log('Checking/Inserting default slots...');

    await new Promise((resolve, reject) => {
      db.serialize(() => {
        const stmt = db.prepare("INSERT OR IGNORE INTO parking_slots (slot_number, slot_type, status) VALUES (?, 'Car', 'Free')");

        for (let i = 1; i <= 50; i++) {
          const slotNum = `A-${String(i).padStart(3, '0')}`;
          stmt.run(slotNum);
        }

        stmt.finalize((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    console.log('✅ Database setup completed successfully!');
    console.log('\nDatabase Information:');
    console.log('- Database file: parking.db');
    console.log('- Default admin: admin / admin123');
    console.log('- 50 default parking slots verified/created');

  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    db.close();
  }
}

setup();
