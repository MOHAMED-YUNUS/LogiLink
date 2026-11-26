import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { SCHEMA } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/logilink.db');

let db = null;
let initPromise = null;

// Initialize database once
async function ensureDatabase() {
  if (db) return db;
  
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      // Create data directory
      const dbDir = path.dirname(DB_PATH);
      await fs.mkdir(dbDir, { recursive: true });
      
      return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
          if (err) {
            console.error('Failed to open database:', err);
            reject(err);
            return;
          }
          
          console.log(`✓ Database opened at: ${DB_PATH}`);
          
          // Enable foreign keys
          db.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) {
              console.error('Failed to enable foreign keys:', err);
              reject(err);
              return;
            }
            
            // Create schema
            db.exec(SCHEMA, (err) => {
              if (err) {
                console.error('Failed to create schema:', err);
                reject(err);
                return;
              }
              
              console.log('✓ Database schema created successfully');
              resolve(db);
            });
          });
        });
      });
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  })();
  
  return initPromise;
}

export function getDatabase() {
  if (!db) {
    console.warn('⚠ Database not initialized, calling ensureDatabase()');
  }
  return db;
}

// Promisified database methods with auto-init
export async function dbRun(sql, params = []) {
  await ensureDatabase();
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

export async function dbGet(sql, params = []) {
  await ensureDatabase();
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

export async function dbAll(sql, params = []) {
  await ensureDatabase();
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

export async function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✓ Database connection closed');
          db = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

// Initialize on import
await ensureDatabase();
