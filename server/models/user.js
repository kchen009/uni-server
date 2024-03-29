'use strict';
//fields of table
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    passwordHash: DataTypes.STRING,
    salt: DataTypes.STRING,
    role: DataTypes.STRING,
    gpa: DataTypes.FLOAT
  }, {});
  User.associate = function (models) {
    // associations can be defined here
    User.hasMany(models.AuthPayload, { foreignKey: 'userId' })
    User.belongsToMany(models.Course, {
      through: models.StudentCourse,
      foreignKey: 'userId',
    })
    User.belongsToMany(models.Assignment, {
      through: models.AssignmentGrade,
      foreignKey: 'userId',
    })
  };
  return User;
};