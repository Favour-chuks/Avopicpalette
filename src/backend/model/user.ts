import * as mongoose from 'mongoose'

// Define the user schema
const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
  },
  email: {
    type: String,
  },
  password: {
    type: String,
  },
  localFolderId: {
    type: String,
    required: true
  },
  driveFolderId: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'guest'],  // Custom property with specific values
    default: 'user'
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Middleware to update `lastUsed` on find, findOne, and findOneAndUpdate
userSchema.pre('find', function(next) {
  this.update({}, { $set: { lastUsed: Date.now() } });
  next();
});

userSchema.pre('findOne', function(next) {
  this.update({}, { $set: { lastUsed: Date.now() } });
  next();
});

userSchema.pre('findOneAndUpdate', function(next) {
  this.update({}, { $set: { lastUsed: Date.now() } });
  next();
});

// Middleware to update `lastUsed` on save
userSchema.pre('save', function(next) {
  this.lastUsed = Date.now();
  next();
});

// Create a model from the schema
const User = mongoose.model('User', userSchema);

export default User;