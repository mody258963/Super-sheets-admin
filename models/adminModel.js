const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Admin = sequelize.define('Admin', {
  admin_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'finance', 'sales'),
    defaultValue: 'admin'
  },
  last_login: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'admins',
  timestamps: true
});

module.exports = Admin;
