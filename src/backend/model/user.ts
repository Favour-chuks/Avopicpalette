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
    type: Number,
    default: Date.now,
    required: true
  },
  lastActivity: {
    type: Number,
    default: Date.now,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false,
    required: true
  }
});

/** Middleware to update `lastUsed` on find, findOne, and findOneAndUpdate
 * Middleware to update `lastUsed` and `lastActivity` on find, findOne, and findOneAndUpdate
**/
userSchema.pre(['find', 'findOne', 'findOneAndUpdate'], function(next) {
  this.setUpdate({ $set: { lastUsed: Date.now(), lastActivity: Date.now(), isActive: true } });
  next();
});

// Middleware to update `lastUsed` and `lastActivity` on save
userSchema.pre('save', function(next) {
  this.lastUsed = Date.now();
  this.lastActivity = Date.now();
  this.isActive = true;
  next();
});

// Create a model from the schema
const User = mongoose.model('User', userSchema);

export default User;
