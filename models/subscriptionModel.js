const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');
const Coach = require('./coachModel');
const Plan = require('./planModel');

const Subscription = sequelize.define('Subscription', {
  subscription_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  coach_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Coach,
      key: 'coach_id'
    }
  },
  plan_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Plan,
      key: 'plan_id'
    }
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'cancelled'),
    defaultValue: 'active'
  },
  payment_status: {
    type: DataTypes.ENUM('paid', 'pending', 'failed'),
    defaultValue: 'pending'
  },
  payment_date: {
    type: DataTypes.DATE
  },
  payment_method: {
    type: DataTypes.STRING
  },
  payment_reference: {
    type: DataTypes.STRING
  },
  payment_notes: {
    type: DataTypes.TEXT
  },
  cancellation_reason: {
    type: DataTypes.TEXT
  },
  cancelled_at: {
    type: DataTypes.DATE
  },
  notification_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  last_notification_date: {
    type: DataTypes.DATE
  },
  payment_reminder_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  last_payment_reminder_date: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'subscriptions',
  timestamps: true
});

// Define associations
Subscription.belongsTo(Coach, { foreignKey: 'coach_id' });
Subscription.belongsTo(Plan, { foreignKey: 'plan_id' });

// Add reverse associations
Coach.hasMany(Subscription, { foreignKey: 'coach_id', as: 'subscriptions' });
Plan.hasMany(Subscription, { foreignKey: 'plan_id', as: 'subscriptions' });

module.exports = Subscription;
