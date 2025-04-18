const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import database connection
const { sequelize, testConnection } = require('./models/db');

// Import routes
const adminRoutes = require('./routes/adminRoutes');
const coachRoutes = require('./routes/coachRoutes');
const planRoutes = require('./routes/planRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Import models
const Admin = require('./models/adminModel');
const Coach = require('./models/coachModel');
const Plan = require('./models/planModel');
const Subscription = require('./models/subscriptionModel');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MySQL and initialize models
async function initializeApp() {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }
    
    // Sync models with database
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized');
    
    // Middleware
    app.use(cors({
      origin: '*', // Allow all origins for development
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Routes
    app.use('/api/admins', adminRoutes);
    app.use('/api/coaches', coachRoutes);
    app.use('/api/plans', planRoutes);
    app.use('/api/subscriptions', subscriptionRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/notifications', notificationRoutes);
    
    // Root route
    app.get('/', (req, res) => {
      res.json({ message: 'Welcome to the Super Sheets Admin API' });
    });
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Start the application
initializeApp();
