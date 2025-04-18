const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Coach = sequelize.define('Coach', {
  coach_id: {
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
  phone: {
    type: DataTypes.STRING
  },
  profile_photo_url: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active'
  },
  bio: {
    type: DataTypes.TEXT
  },
  specialization: {
    type: DataTypes.STRING
  },
  last_login: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'coaches',
  timestamps: true
});

module.exports = Coach;
