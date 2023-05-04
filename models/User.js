const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    index: true,
  },
  email: {
    type: String,
    unique: true,
    required: [true, 'Please add an email'],
    match: [/\S+@\S+\.\S+/, 'is invalid'],
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minLength: 6,
    select: false,
  },
  tel: {
    type: String,
    required: [true, 'Please add a telephone number'],
    // match: [/^[0-9]{10,10}$/, 'Please add a invalid telephone number'],
    minlength: [10, 'Please add a invalid telephone number'],
    maxlength: [10, 'Please add a invalid telephone number'],
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

UserSchema.pre('save', async function (next) {
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({id: this._id}, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
