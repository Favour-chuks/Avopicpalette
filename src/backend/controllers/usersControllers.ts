const usersDB = {
 users: require('../model/user.json'),
 setUsers: function (data) { this.users = data}
}
const fs = require('fs-extra')
const path = require('path')
// const bcrypt = require('bcrypt')
// import * as bcrypt from 'bcrypt'

export const handleNewUser = async (req, res) => {
 const {user, pwd} = req.body;
 if (!user || !pwd) {
  return res.status(400).json({'message': 'username and password are required'})
 }

 // checks for duplicate users in the database
 const duplicate = usersDB.users.find(person => person.username === user)
 if (duplicate) return res.status(409) //conflict
 try{
  // encrypt the password
  // const hashedPwd = await bcrypt.hash(pwd, 10);
  //store the new user
  const newUser = {'username': user, 'password': pwd}
  usersDB.setUsers([...usersDB.users, newUser])

//  writes the user info to the local database
  await fs.writeFile(
   path.join(__dirname, '../model/user.json'),
   JSON.stringify(usersDB.users)
  )
 
  console.log(usersDB.users)
   res.status(201).json({'message': `New user ${user} created`})
 
  } catch(err:any) {
  res.status(500).json({'message': err.message})
 }
}


import mongoose from 'mongoose';
import User from './path/to/your/User/model';

async function checkUserActivity() {
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

// Run the check every 5 minutes
setInterval(checkUserActivity, 5 * 60 * 1000);

// Make sure to connect to your MongoDB database here
mongoose.connect('your_mongodb_connection_string');

