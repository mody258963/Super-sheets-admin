/**
 * Migration CLI script
 * 
 * This script provides a command-line interface for running database migrations
 * Usage:
 * - node src/scripts/migrate.js up   (apply pending migrations)
 * - node src/scripts/migrate.js down (revert the last applied migration)
 */

require('dotenv').config();
const connectDB = require('../config/database');
const MigrationRunner = require('../config/migrationRunner');

async function main() {
  // Get command line arguments
  const command = process.argv[2] || 'up'; // Default to 'up'
  
  if (!['up', 'down'].includes(command)) {
    console.error('\n\x1b[31mError: Invalid command. Use \'up\' to apply migrations or \'down\' to revert the last migration.\x1b[0m\n');
    process.exit(1);
  }
  
  try {
    // Connect to the database
    console.log('\n\x1b[36mConnecting to database...\x1b[0m');
    const db = await connectDB();
    
    // Create migration runner
    const migrationRunner = new MigrationRunner(db);
    
    // Run the specified command
    let success = false;
    if (command === 'up') {
      console.log('\n\x1b[36mApplying pending migrations...\x1b[0m');
      success = await migrationRunner.up();
    } else {
      console.log('\n\x1b[36mReverting last migration...\x1b[0m');
      success = await migrationRunner.down();
    }
    
    // Exit with appropriate code
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(`\n\x1b[31mError: ${error.message}\x1b[0m\n`);
    process.exit(1);
  }
}

// Run the script
main();
