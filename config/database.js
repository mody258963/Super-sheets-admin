const mysql = require('mysql2');

// In-memory database fallback implementation
const createInMemoryDb = () => {
  console.log('Using in-memory database');
  
  // In-memory storage
  const storage = {
    users: []
  };
  
  // Mock database interface that mimics MySQL's promise interface
  return {
    // Execute queries (simplified mock implementation)
    execute: async (query, params) => {
      // Simple query parsing to handle basic operations
      if (query.includes('SELECT') && query.includes('FROM users')) {
        // Handle SELECT queries
        if (query.includes('WHERE id =')) {
          const id = params[0];
          const user = storage.users.find(u => u.id === id);
          return [[user || null], []]; // Format: [rows, fields]
        }
        // Return all users
        return [storage.users, []]; // Format: [rows, fields]
      }
      
      if (query.includes('INSERT INTO users')) {
        // Handle INSERT queries
        const newUser = {
          id: Date.now(), // Use timestamp as ID
          ...params[0]
        };
        storage.users.push(newUser);
        return [{ insertId: newUser.id }, []]; // Format: [result, fields]
      }
      
      if (query.includes('UPDATE users') && query.includes('WHERE id =')) {
        // Handle UPDATE queries
        const id = params[1]; // Assuming the ID is the second parameter
        const index = storage.users.findIndex(u => u.id === id);
        if (index !== -1) {
          storage.users[index] = { ...storage.users[index], ...params[0] };
          return [{ affectedRows: 1 }, []]; // Format: [result, fields]
        }
        return [{ affectedRows: 0 }, []]; // Format: [result, fields]
      }
      
      if (query.includes('DELETE FROM users') && query.includes('WHERE id =')) {
        // Handle DELETE queries
        const id = params[0];
        const initialLength = storage.users.length;
        storage.users = storage.users.filter(u => u.id !== id);
        return [{ affectedRows: initialLength - storage.users.length }, []]; // Format: [result, fields]
      }
      
      // Default fallback for CREATE TABLE and other queries
      console.warn('Unhandled query in in-memory database:', query);
      return [[], []]; // Format: [rows, fields]
    },
    
    // Mock connection method
    getConnection: async () => {
      return {
        release: () => {}, // No-op function
        threadId: 'in-memory'
      };
    }
  };
};

// MySQL connection function
const connectDB = async () => {
  try {
    // Create the connection pool
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'nodejs_backend',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    }).promise(); // Convert to promise-based API
    
    // Test the connection
    const connection = await pool.getConnection();
    console.log(`MySQL Connected: ${connection.threadId}`);
    connection.release();
    
    return pool;
  } catch (error) {
    console.error('MySQL connection error:');
    console.error(error.message);
    console.log('Falling back to in-memory storage mode...');
    
    // Return a mock database interface for development purposes
    return createInMemoryDb();
  }
};

module.exports = connectDB;
