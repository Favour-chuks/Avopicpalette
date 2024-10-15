
import mongoose from 'mongoose';
import User from '../model/user.ts';

export async function checkUserActivity() {
  const inactivityThreshold = 30 * 60 * 1000; // 30 minutes in milliseconds
  const currentTime = new Date();

  try {
    await User.updateMany(
      {
        lastActivity: { $lt: new Date(currentTime - inactivityThreshold) },
        isActive: true
      },
      {
        $set: { isActive: false }
      }
    );
    console.log('User activity status updated');
  } catch (error) {
    console.error('Error updating user activity status:', error);
  }
}

// this part is supposed to run in the main server file
// Run the check every 5 minutes
setInterval(checkUserActivity, 5 * 60 * 1000);

// Make sure to connect to your MongoDB database here
mongoose.connect('your_mongodb_connection_string');
