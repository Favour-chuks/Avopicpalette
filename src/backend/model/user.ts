import * as mongoose from 'mongoose'

// Define the user schema
const userSchema = new mongoose.Schema({
  _id: {
    type: String,  // Custom ID as a string (e.g., UUID or custom format)
    required: true
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
  role: {
    type: String,
    enum: ['admin', 'user', 'guest'],  // Custom property with specific values
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Create the model from the schema
const User = mongoose.model('User', userSchema);


export default User;
