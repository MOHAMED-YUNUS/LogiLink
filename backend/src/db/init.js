import { getDatabase } from './connection.js';
import { SCHEMA } from './schema.js';

export async function initDatabase() {
  try {
    console.log('Database initialization triggered from server.js');
    // Database is already initialized in connection.js
    // This is just a safety check
    const db = getDatabase();
    if (db) {
      console.log('✓ Database already initialized');
    }
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
