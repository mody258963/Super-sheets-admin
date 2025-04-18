/**
 * Database Migration Runner
 * 
 * This utility runs database migrations to keep the database schema up to date.
 * It tracks which migrations have been applied and only runs new ones.
 */

const fs = require('fs');
const path = require('path');

class MigrationRunner {
  constructor(db) {
    this.db = db;
    this.migrationsDir = path.join(__dirname, '../migrations');
    this.migrationTableName = 'migrations';
  }

  /**
   * Get all migration files from the migrations directory
   * @returns {Array} List of migration files sorted by filename
   */
  getMigrationFiles() {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort(); // Sort to ensure migrations run in order
    
    return files;
  }

  /**
   * Get list of migrations that have already been applied
   * @returns {Array} List of applied migration names
   */
  async getAppliedMigrations() {
    try {
      // Check if migrations table exists
      const [tables] = await this.db.execute(
        `SHOW TABLES LIKE '${this.migrationTableName}'`
      );
      
      if (tables.length === 0) {
        return [];
      }
      
      // Get applied migrations
      const [rows] = await this.db.execute(
        `SELECT name FROM ${this.migrationTableName} ORDER BY id`
      );
      
      return rows.map(row => row.name);
    } catch (error) {
      console.error('Error getting applied migrations:', error.message);
      return [];
    }
  }

  /**
   * Record a migration as applied
   * @param {string} migrationName Name of the migration file
   */
  async recordMigration(migrationName) {
    try {
      await this.db.execute(
        `INSERT INTO ${this.migrationTableName} (name) VALUES (?)`,
        [migrationName]
      );
      return true;
    } catch (error) {
      console.error(`Error recording migration ${migrationName}:`, error.message);
      return false;
    }
  }

  /**
   * Remove a migration record (for down migrations)
   * @param {string} migrationName Name of the migration file
   */
  async removeMigrationRecord(migrationName) {
    try {
      await this.db.execute(
        `DELETE FROM ${this.migrationTableName} WHERE name = ?`,
        [migrationName]
      );
      return true;
    } catch (error) {
      console.error(`Error removing migration record ${migrationName}:`, error.message);
      return false;
    }
  }

  /**
   * Run all pending migrations
   */
  async up() {
    console.log('🔄 Running database migrations...');
    
    // Get all migration files
    const migrationFiles = this.getMigrationFiles();
    
    // Get list of applied migrations
    const appliedMigrations = await this.getAppliedMigrations();
    
    // Filter to only get pending migrations
    const pendingMigrations = migrationFiles.filter(
      file => !appliedMigrations.includes(file)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✅ Database is up to date, no migrations to run');
      return true;
    }
    
    console.log(`Found ${pendingMigrations.length} pending migrations to apply`);
    
    // Run each pending migration
    for (const migrationFile of pendingMigrations) {
      console.log(`\nRunning migration: ${migrationFile}`);
      
      // Import the migration file
      const migration = require(path.join(this.migrationsDir, migrationFile));
      
      // Run the up method
      const success = await migration.up(this.db);
      
      if (success) {
        // Record the migration
        await this.recordMigration(migrationFile);
        console.log(`✅ Migration ${migrationFile} applied successfully\n`);
      } else {
        console.error(`❌ Failed to apply migration ${migrationFile}\n`);
        return false;
      }
    }
    
    console.log('✅ All migrations applied successfully');
    return true;
  }

  /**
   * Revert the last migration
   */
  async down() {
    console.log('🔄 Reverting last database migration...');
    
    // Get list of applied migrations
    const appliedMigrations = await this.getAppliedMigrations();
    
    if (appliedMigrations.length === 0) {
      console.log('❌ No migrations to revert');
      return false;
    }
    
    // Get the last applied migration
    const lastMigration = appliedMigrations[appliedMigrations.length - 1];
    console.log(`Reverting migration: ${lastMigration}`);
    
    // Import the migration file
    const migration = require(path.join(this.migrationsDir, lastMigration));
    
    // Run the down method
    const success = await migration.down(this.db);
    
    if (success) {
      // Remove the migration record
      await this.removeMigrationRecord(lastMigration);
      console.log(`✅ Migration ${lastMigration} reverted successfully`);
      return true;
    } else {
      console.error(`❌ Failed to revert migration ${lastMigration}`);
      return false;
    }
  }
}

module.exports = MigrationRunner;
