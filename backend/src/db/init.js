import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SCHEMA } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'logilink.db');

export async function initDatabase() {
  try {
    // Ensure data directory exists
    await fs.mkdir(DB_DIR, { recursive: true });

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Execute schema
          db.exec(SCHEMA, (err) => {
            if (err) {
              reject(err);
              return;
            }

            console.log('✓ Database initialized successfully at:', DB_PATH);
            db.close((err) => {
              if (err) {
                reject(err);
              } else {
                resolve(DB_PATH);
              }
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('✗ Database initialization failed:', error.message);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
