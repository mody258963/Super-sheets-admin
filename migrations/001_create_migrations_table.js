/**
 * Migration: Create migrations table
 * 
 * This migration creates the migrations table to track applied migrations
 */

module.exports = {
  up: async (db) => {
    // Create migrations table
    const createMigrationsTable = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    try {
      await db.execute(createMigrationsTable);
      console.log('✅ Migrations table created successfully');
      return true;
    } catch (error) {
      console.error('❌ Error creating migrations table:', error.message);
      return false;
    }
  },
  
  down: async (db) => {
    // Drop migrations table
    try {
      await db.execute('DROP TABLE IF EXISTS migrations');
      console.log('✅ Migrations table dropped successfully');
      return true;
    } catch (error) {
      console.error('❌ Error dropping migrations table:', error.message);
      return false;
    }
  }
};
