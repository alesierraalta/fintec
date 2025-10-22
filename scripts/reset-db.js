// Simple script to reset the database
const { db } = require('../repositories/local/db.ts');

async function resetDatabase() {
  try {
    console.log('Resetting database...');
    await db.resetDatabase();
    console.log('Database reset completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();
