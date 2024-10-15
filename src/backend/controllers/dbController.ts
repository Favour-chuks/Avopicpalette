import * as fs from "fs/promises";
import * as path from "path";

/**
 * This file creates a "database" out of a JSON file. It's only for
 * demonstration purposes. A real app should use a real database.
 */
const DATABASE_FILE_PATH = path.join(__dirname, "db.json");

interface Database<T> {
  read(): Promise<T>;
  write(data: T): Promise<void>;
}

export class JSONFileDatabase<T> implements Database<T> {
  constructor(private readonly seedData: T) {}

  // Creates a database file if one doesn't already exist
  private async init(): Promise<void> {
    try {
      // Do nothing, since the database is initialized
      await fs.stat(DATABASE_FILE_PATH);
    } catch {
      const file = JSON.stringify(this.seedData);
      await fs.writeFile(DATABASE_FILE_PATH, file);
    }
  }

  // Loads and parses the database file
  async read(): Promise<T> {
    await this.init();
    const file = await fs.readFile(DATABASE_FILE_PATH, "utf8");
    return JSON.parse(file);
  }

  // Overwrites the database file with provided data
  async write(data: T): Promise<void> {
    await this.init();
    const file = JSON.stringify(data);
    await fs.writeFile(DATABASE_FILE_PATH, file);
  }
}

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

// this part is supposed to run in the main server file
// Run the check every 5 minutes
setInterval(checkUserActivity, 5 * 60 * 1000);

// Make sure to connect to your MongoDB database here
mongoose.connect('your_mongodb_connection_string');
