/**
 * Migration: Add new fields to users table
 * 
 * This migration adds password, role, status, and last_login fields to the users table
 */

module.exports = {
  up: async (db) => {
    // Add new columns to users table - using a safer approach
    // First check if columns exist, then add them if they don't
    const columnChecks = [
      { name: 'password', query: `ALTER TABLE users ADD COLUMN password VARCHAR(255)` },
      { name: 'role', query: `ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user'` },
      { name: 'status', query: `ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active'` },
      { name: 'last_login', query: `ALTER TABLE users ADD COLUMN last_login DATETIME` }
    ];
    
    try {
      for (const column of columnChecks) {
        // Check if column exists
        const [columnExists] = await db.execute(
          `SELECT COUNT(*) as count FROM information_schema.columns 
           WHERE table_schema = DATABASE() 
           AND table_name = 'users' 
           AND column_name = ?`,
          [column.name]
        );
        
        // Add column if it doesn't exist
        if (columnExists[0].count === 0) {
          await db.execute(column.query);
          console.log(`Column ${column.name} added to users table`);
        } else {
          console.log(`Column ${column.name} already exists, skipping`);
        }
      }
      console.log('✅ Added new fields to users table successfully');
      return true;
    } catch (error) {
      console.error('❌ Error adding fields to users table:', error.message);
      return false;
    }
  },
  
  down: async (db) => {
    // Remove the added columns - using a safer approach
    // First check if columns exist, then drop them if they do
    const columnChecks = [
      { name: 'password', query: `ALTER TABLE users DROP COLUMN password` },
      { name: 'role', query: `ALTER TABLE users DROP COLUMN role` },
      { name: 'status', query: `ALTER TABLE users DROP COLUMN status` },
      { name: 'last_login', query: `ALTER TABLE users DROP COLUMN last_login` }
    ];
    
    try {
      for (const column of columnChecks) {
        // Check if column exists
        const [columnExists] = await db.execute(
          `SELECT COUNT(*) as count FROM information_schema.columns 
           WHERE table_schema = DATABASE() 
           AND table_name = 'users' 
           AND column_name = ?`,
          [column.name]
        );
        
        // Drop column if it exists
        if (columnExists[0].count > 0) {
          await db.execute(column.query);
          console.log(`Column ${column.name} dropped from users table`);
        } else {
          console.log(`Column ${column.name} doesn't exist, skipping`);
        }
      }
      console.log('✅ Removed fields from users table successfully');
      return true;
    } catch (error) {
      console.error('❌ Error removing fields from users table:', error.message);
      return false;
    }
  }
};
