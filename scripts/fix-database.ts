#!/usr/bin/env tsx

/**
 * Database Fix Script
 * 
 * This script helps fix common database issues like:
 * - DatabaseClosedError
 * - Index creation conflicts
 * - Corrupted database state
 * 
 * Usage: tsx scripts/fix-database.ts
 */

import { db } from '../repositories/local/db';

async function fixDatabase() {

  try {
    // Check if database is open and close it
    if (db.isOpen()) {
      db.close();
    }

    // Delete the existing database
    await db.delete();

    // Reinitialize the database
    await db.initialize();

    
  } catch (error) {
    process.exit(1);
  } finally {
    if (db.isOpen()) {
      db.close();
    }
    process.exit(0);
  }
}

// Run the fix
fixDatabase().catch((error) => {
  process.exit(1);
});

