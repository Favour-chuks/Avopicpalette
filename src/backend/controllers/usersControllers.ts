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

