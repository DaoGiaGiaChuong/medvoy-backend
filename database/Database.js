const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    const dbPath = path.join(__dirname, '../data/medvoy.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('✅ Connected to SQLite database');
        this.createTables().then(() => {
          this.seedData();
        });
      }
    });
  }

  createTables() {
    return new Promise((resolve) => {
      let remainingTables = 5;
      const tableCreated = () => {
        remainingTables--;
        if (remainingTables === 0) {
          console.log('📊 Database tables created/verified');
          resolve();
        }
      };

      // Procedures table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS Procedures (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          base_cost_low REAL NOT NULL,
          base_cost_high REAL NOT NULL,
          recommended_countries TEXT, -- JSON array of countries
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, tableCreated);

      // Hospitals table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS Hospitals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          country TEXT NOT NULL,
          accreditation TEXT,
          rating REAL DEFAULT 0.0,
          specialties TEXT, -- JSON array of specialties
          price_multiplier REAL DEFAULT 1.0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, tableCreated);

      // Flights table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS Flights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          origin TEXT NOT NULL,
          destination TEXT NOT NULL,
          avg_cost_low REAL NOT NULL,
          avg_cost_high REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, tableCreated);

      // Hotels table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS Hotels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          country TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('budget', 'standard', 'premium')),
          nightly_low REAL NOT NULL,
          nightly_high REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, tableCreated);

      // UserIntakes table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS UserIntakes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          procedure TEXT NOT NULL,
          country TEXT NOT NULL,
          travelDate TEXT,
          budget TEXT,
          companions INTEGER DEFAULT 1,
          hotelType TEXT CHECK (hotelType IN ('budget', 'standard', 'premium')),
          estimateLow REAL,
          estimateHigh REAL,
          breakdown TEXT, -- JSON object
          recommendations TEXT, -- JSON array
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, tableCreated);
    });
  }

  async seedData() {
    // Check if data already exists
    this.db.get("SELECT COUNT(*) as count FROM Procedures", (err, row) => {
      if (err) {
        console.error('Error checking procedures:', err);
        return;
      }

      if (row.count > 0) {
        console.log('📋 Database already seeded');
        return;
      }

      // Seed procedures
      const procedures = [
        ['Heart Bypass Surgery', 25000, 45000, '["Thailand", "India", "Turkey"]'],
        ['Knee Replacement', 12000, 25000, '["Thailand", "India", "Mexico"]'],
        ['Hip Replacement', 15000, 30000, '["Thailand", "India", "Turkey"]'],
        ['Dental Implants', 1500, 4000, '["Thailand", "Mexico", "Hungary"]'],
        ['IVF Treatment', 4000, 12000, '["Thailand", "India", "Mexico"]'],
        ['Cosmetic Surgery', 3000, 15000, '["Thailand", "Brazil", "Turkey"]'],
        ['Cancer Treatment', 20000, 100000, '["India", "Thailand", "Germany"]'],
        ['Spine Surgery', 18000, 40000, '["India", "Thailand", "Turkey"]']
      ];

      const procedureStmt = this.db.prepare("INSERT INTO Procedures (name, base_cost_low, base_cost_high, recommended_countries) VALUES (?, ?, ?, ?)");
      procedures.forEach(procedure => procedureStmt.run(procedure));
      procedureStmt.finalize();

      // Seed hospitals
      const hospitals = [
        ['Bumrungrad International Hospital', 'Thailand', 'JCI Accredited', 4.8, '["Heart Surgery", "Orthopedics", "Cancer Treatment"]', 1.2],
        ['Bangkok Hospital', 'Thailand', 'JCI Accredited', 4.7, '["Orthopedics", "Dental", "Cosmetic Surgery"]', 1.1],
        ['Apollo Hospitals', 'India', 'NABH Accredited', 4.6, '["Heart Surgery", "Cancer Treatment", "Spine Surgery"]', 0.8],
        ['Fortis Healthcare', 'India', 'NABH Accredited', 4.5, '["Orthopedics", "Heart Surgery", "IVF Treatment"]', 0.9],
        ['Acibadem Healthcare Group', 'Turkey', 'JCI Accredited', 4.7, '["Heart Surgery", "Cancer Treatment", "Orthopedics"]', 1.0],
        ['Anadolu Medical Center', 'Turkey', 'JCI Accredited', 4.6, '["Cancer Treatment", "Spine Surgery", "IVF Treatment"]', 0.95],
        ['Hospital Angeles', 'Mexico', 'Joint Commission International', 4.4, '["Dental", "Cosmetic Surgery", "Orthopedics"]', 0.7],
        ['Americano Hospital', 'Mexico', 'General Health Council', 4.3, '["Dental", "Cosmetic Surgery", "IVF Treatment"]', 0.65]
      ];

      const hospitalStmt = this.db.prepare("INSERT INTO Hospitals (name, country, accreditation, rating, specialties, price_multiplier) VALUES (?, ?, ?, ?, ?, ?)");
      hospitals.forEach(hospital => hospitalStmt.run(hospital));
      hospitalStmt.finalize();

      // Seed flights (from major US cities)
      const flights = [
        ['New York', 'Thailand', 800, 1500],
        ['Los Angeles', 'Thailand', 700, 1300],
        ['Chicago', 'Thailand', 850, 1600],
        ['New York', 'India', 900, 1800],
        ['Los Angeles', 'India', 1000, 1900],
        ['Chicago', 'India', 950, 1700],
        ['New York', 'Turkey', 600, 1200],
        ['Los Angeles', 'Turkey', 800, 1400],
        ['Chicago', 'Turkey', 700, 1300],
        ['New York', 'Mexico', 300, 600],
        ['Los Angeles', 'Mexico', 200, 500],
        ['Chicago', 'Mexico', 250, 550]
      ];

      const flightStmt = this.db.prepare("INSERT INTO Flights (origin, destination, avg_cost_low, avg_cost_high) VALUES (?, ?, ?, ?)");
      flights.forEach(flight => flightStmt.run(flight));
      flightStmt.finalize();

      // Seed hotels
      const hotels = [
        ['Thailand', 'budget', 25, 50],
        ['Thailand', 'standard', 60, 120],
        ['Thailand', 'premium', 150, 300],
        ['India', 'budget', 20, 40],
        ['India', 'standard', 40, 80],
        ['India', 'premium', 100, 200],
        ['Turkey', 'budget', 30, 60],
        ['Turkey', 'standard', 70, 140],
        ['Turkey', 'premium', 150, 250],
        ['Mexico', 'budget', 35, 70],
        ['Mexico', 'standard', 80, 160],
        ['Mexico', 'premium', 200, 400]
      ];

      const hotelStmt = this.db.prepare("INSERT INTO Hotels (country, type, nightly_low, nightly_high) VALUES (?, ?, ?, ?)");
      hotels.forEach(hotel => hotelStmt.run(hotel));
      hotelStmt.finalize();

      console.log('🌱 Database seeded with initial data');
    });
  }

  // Database query helper
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  close() {
    this.db.close((err) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log('📁 Database connection closed');
      }
    });
  }
}

module.exports = Database;