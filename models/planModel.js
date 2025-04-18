const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Plan = sequelize.define('Plan', {
  plan_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  duration_days: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  features: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  description: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'plans',
  timestamps: true
});

module.exports = Plan;
