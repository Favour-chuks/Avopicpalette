import User from "../model/usermodel"

class ActivityService {
 static async checkUserActivity() {
  const inactivityThreshold = 30 * 60 * 1000 // 30 mins of inactivity
  const currentTime:any = new Date();

  try{
   const result = await User.updateMany(
    {
     lastActivity: {
      $lt: new Date(currentTime - inactivityThreshold)
     }, 
     isActive: true
    },
    {
     $set: { isActive: false}
    }
   )

   console.log(`updated ${result.modifiedCount} users' activity status`)
   return result;
  } catch(error){
   console.log('error in checkUserActivity', error)
   throw error
  }
 }
 static async updateUserActivity(userId) {
  try {
   await User.findByIdAndUpdate(userId, {
    lastActivity: new Date(),
    isActive: true
   });
  } catch (error) {
   console.error('Error updating user activity:', error);
   throw error
  }
 }
};

export default ActivityService
