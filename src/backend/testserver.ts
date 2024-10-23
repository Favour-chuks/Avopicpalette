import * as express from 'express'
import { Request, Response, NextFunction } from 'express';
import  * as dotenv from 'dotenv';
import * as cors from 'cors';
import * as path from 'path';
import * as fs from 'fs-extra';
import { fileURLToPath } from 'url';
import * as  multer from 'multer';
import { JwksClient } from "jwks-rsa";
import { google, drive_v3 } from 'googleapis';
import Vibrant from 'node-vibrant';
import mongoose from "mongoose";
import User from './model/usermodel'
import ActivityService from './controllers/activityService';
const jwt  = require('jsonwebtoken')



dotenv.config();

const app = express();
const appId = process.env.CANVA_APP_ID || '';
const mongoDBURL = process.env.MONGO_DB_URL || '';


app.use(
  cors({
    origin: `https://app-${appId.toLowerCase()}.canva-apps.com`,
    optionsSuccessStatus: 200,
    credentials: true
  })
);
app.use(express.json());


// app.use(cookieParser()); //having difficulty using third party cookies
app.use(loginMiddleware)

const upload = multer({ dest: 'uploads/' });

let activeUsers = new Map()


app.post('/auth', authMiddleware, async (req:any, res) => {

  const authResult:any = req.auth

  if (authResult.status === 'error') {
    return res.status(403).json({ message: authResult });
  }
  // to get the userid from the sent token
  const canvaUserId:string = authResult.data
  if (!canvaUserId) {
    return res.status(400).json({ error: "Canva User ID is required" });
  }
  try {
    
    const userFolder = await findOrCreateLocalFolder(canvaUserId)

    const parentFolderId = '1oaS_ZkyI8moaMukdgsB9ghFpy-c9wpul';
    const driveFolder = await findOrCreateDriveFolder(canvaUserId, parentFolderId);

    if (!driveFolder) {
      throw Error('cannot detect the divefolder id')
    }

    
    const newUser = {
      _id: canvaUserId,
      localFolderId: userFolder,
      driveFolderId: driveFolder
    }

    //this creates a new instance of a user and stores it to the database
    const user = await User.create(newUser)
    console.log(user)

    /** changed the user database from a map to a mongoose database */
    // activeUsers.set(canvaUserId, {
    //   userId: canvaUserId,
    //   lastActive: new Date(),
    //   driveFolder: driveFolder,
    //   localFolder: userFolder
    // })

    res.status(201).send(user)

    console.log('all the necessary starters has been done')
  } catch (error) {
    console.error("Error in /create-folder:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


app.post('/auth/user/getuser', (req:any, res) => {

  if (req.session.userid) {
    console.log(`the user ${req.session.userid} was found`)
    return res.status(200).json({ message: 'User data found', user: req.session.userid });
  } else {
    console.log('user data not found')
    return res.status(401).json({ message: 'User data not found' });
  }
});

// Handle file upload
app.post('/user/upload', upload.array('files'), async (req:any, res) => {
  const { userId, driveFolder, localFolder } = req.user; // since the user data is in the request
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  try {
    if (!userId || !driveFolder || !localFolder) {
      return res.status(400).json({ error: "User not found" });
    } // sends an error if any of the needed options are empty

    const { publicUrls, imagePaths } = await handleUpload(files, localFolder, driveFolder, userId);
    extractColorsFromImages(imagePaths, userId)
    res.status(200).json({ message: "Files uploaded", urls: publicUrls });
  } catch (error) {
    console.error("Error in upload:", error);
    res.status(500).json({ error: "Error uploading files" });
  }
});

mongoose
  .connect(mongoDBURL)
  .then(() => {
    app.listen(process.env.CANVA_BACKEND_PORT, () => {
      console.log(`the server is running on ${process.env.CANVA_BACKEND_PORT}`);
    });
  })
  .catch((error) => {
    console.log(error);
  });


const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 60 minutes
const TIMEOUT_MS = 30 * 1000; // 30 seconds
// Google Drive authentication setup
const credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
const KEYFILEPATH: string = credentials;  // Path to the Google API credentials file
const SCOPES: string[] = ["https://www.googleapis.com/auth/drive"];  // Scopes for Google Drive access

const googleAuth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

const drive: drive_v3.Drive = google.drive({ version: "v3", auth: googleAuth });  // Initialize Google Drive API client

// let activeUsers: { [userId: string]: { userId: string, lastActive: Date } } = {}; // In-memory storage


async function authMiddleware(req, res, next) {
const token = getTokenFromHeader(req)

if(!token) {
  return res.sendStatus(401)
}
try {
  
const authResult = await verifyAndAuthorizeRequest(token, appId)
req.auth = authResult
console.log('user authorised')
} catch (error) {
 return console.log('error authorizing the user') 
}

next()
}

function getTokenFromHeader(request: express.Request) {
  const header = request.headers["authorization"];

  if (!header) {
    return;
  }

  const parts = header.split(" ");

  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return;
  }

  const [, token] = parts;

  return token as string; // to return the token as a string
}

async function loginMiddleware(req, res, next) {
  const token = getTokenFromHeader(req)

  if(!token) {
    return res.sendStatus(401)
  }
  try {
    const authResult = await verifyAndAuthorizeRequest(token, appId)
    console.log(authResult)
  } catch (error) {
    return console.log('error finding the user token')
  }
  next()
}

async function verifyAndAuthorizeRequest(token: any, appId: string) {
 try {
   const decoded:any = jwt.decode(token, { complete: true });

   if (!decoded || !decoded.header) {
     throw new Error('Invalid token structure');
   }

   const { kid } = decoded.header;

   const jwks = new JwksClient({
     jwksUri: `https://api.canva.com/rest/v1/apps/${appId}/jwks`,
     cache: true,
     cacheMaxAge: CACHE_EXPIRY_MS,
     timeout: TIMEOUT_MS,
     rateLimit: true,
   });

   const key = await jwks.getSigningKey(kid);
   const publicKey = key.getPublicKey();

   const verified = jwt.verify(token, publicKey, {
    audience: appId,
    clockTolerance: 30, //  Allows 30 seconds tolerance for clock skew
  });

   if (!verified?.aud || !verified?.brandId || !verified?.userId) {
     throw new Error('The user token is not valid');
   }
   return {
     status: 'success',
     data: verified?.userId,
   };
 } catch (error: any) {
   console.error('Authorization failed:', error.message);
   return {
     status: 'error',
     message: error.message,
   };
 }
}

async function findOrCreateLocalFolder(folderName) {
  const directoryPath = path.join(__dirname, 'public', 'uploads');
  const targetPath = path.join(directoryPath, folderName);

  try {
    // Check if the folder exists
    const stat = await fs.stat(targetPath);
    if (stat?.isDirectory()) {
      return targetPath;
    }
  } catch (error:any) {
    if (error.code === 'ENOENT') {
      // Folder doesn't exist, so create it
      try {
        await fs.ensureDir(targetPath);
        console.log(`Folder created at: ${targetPath}`);
        return targetPath;
      } catch (createError) {
        console.error('Error creating folder:', createError);
        throw createError;
      }
    } else {
      console.error('Error checking folder:', error);
      throw error;
    }
  }
}

// Check if a folder with a specific name exists in Google Drive
async function findFolderByName(folderName: string, parentFolderId: string): Promise<drive_v3.Schema$File | null> {
 try {
   let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
   if (parentFolderId) {
     query += ` and '${parentFolderId}' in parents`;  // Search within the specified parent folder
   }
   const res = await drive.files.list({
     q: query,
     fields: `files(id, name)`,
     spaces: 'drive',
   });
   const folders = res.data.files;

   if (folders && folders.length > 0) {
     return folders[0];  // Return the first matching folder
   } else {
     return null;  // No folder found
   }
 } catch (error) {
   console.error('Error finding folder:', error);
   throw error;
 }
}

// Create a new folder in Google Drive
async function createDriveFolder(folderName: string, parentFolderId: string): Promise<drive_v3.Schema$File> {
 try {
   const fileMetadata: drive_v3.Schema$File = {
     name: folderName,
     mimeType: 'application/vnd.google-apps.folder',
   };
   if (parentFolderId) {
     fileMetadata.parents = [parentFolderId];  // Set the parent folder ID
   }
   const res = await drive.files.create({
     requestBody: fileMetadata,
     fields: 'id, name',
   });
   console.log(`Folder created: Name:${res.data.name}, ID: ${res.data.id}`);
   return res.data;
 } catch (error) {
   console.error('Error creating folder:', error);
   throw error;
 }
}

// Find an existing Google Drive folder or create a new one
async function findOrCreateDriveFolder(folderName: string, parentFolderId: string): Promise<drive_v3.Schema$File> {
 try {
   let folder:any = await findFolderByName(folderName, parentFolderId);

   if (!folder) {
     console.log('Folder not found, creating a new one');
     folder = await createDriveFolder(folderName, parentFolderId);
   
   } else {
    console.log(`Folder found: Name: ${folder.name}`);
  }

   return folder.id;
 } catch (error) {
   console.error('Error in findOrCreateDriveFolder:', error);
   throw error;
 }
}

// Set a timeout to delete the user's folder after 45 minutes of inactivity
async function resetTimeout(userId: string, driveFolderId?: string): Promise<NodeJS.Timeout> {
 return setTimeout(async () => {
   try {
     await deleteFolderAfterTimeout(userId, driveFolderId);  // Delete folder after timeout
   } catch (error) {
     console.error(`Failed to delete folder for user ${userId}:`, error);
   }
 }, 45 * 60 * 1000);  // 45-minute timeout
}

// Delete the user's folder locally and from Google Drive after timeout
async function deleteFolderAfterTimeout(userId: string, driveFolderId?: string): Promise<void> {
 try {
   const userFolder: string = path.join(__dirname, `uploads/${userId}`);
   await fs.promises.rm(userFolder, { recursive: true, force: true });  // Delete local folder
   delete activeUsers[userId];  // Remove user data from activeUsers map

   if (driveFolderId) {
     await drive.files.delete({
       fileId: driveFolderId,
       supportsAllDrives: true,
     });
   }
   console.log(`The folder with ID: ${driveFolderId} has been deleted`);
 } catch (error) {
   console.error("Error deleting folder after timeout:", error);
 }
}


// Handle file upload, save files to Google Drive, and return public URLs and file paths
async function handleUpload(files: any, userFolder: string, { imageFiles, driveFolderId, userId }: { imageFiles: any; userFolder: string; driveFolderId: string; userId: string; }, canvaUserId: string): Promise<{ publicUrls: string[], imagePaths: string[] }> {
 const publicUrls: string[] = [];
 const imagePaths: string[] = [];

 try {
   await Promise.all(imageFiles.map(async (file) => {
     const fileName: string = sanitizeFileName(file.name);
     const filePath: string = path.join(userFolder, fileName);

     // Save the image file locally
     await fs.promises.writeFile(filePath, file.data, { encoding: "base64" });
     console.log(`Image ${fileName} saved locally`);

     // Upload the image to Google Drive
     const driveFileId: any = await uploadToGoogleDrive(fileName, filePath, file.mimeType, driveFolderId);
     console.log(`Image ${fileName} uploaded to Google Drive with ID: ${driveFileId}`);

     if(!driveFileId){
      console.log('error uploading to drive')
      return;
    }
     // Generate the public URL
     const publicUrl: string = await generatePublicUrl(driveFileId);
     publicUrls.push(publicUrl);
     imagePaths.push(filePath);

     // Store the uploaded files for the user
     const userData:any = activeUsers[userId];
     if (userData) {
       if (!userData.uploadedFiles) {
         userData.uploadedFiles = [];
       }
       userData.uploadedFiles.push(filePath);
     }
   }));
 } catch (error) {
   console.error("Error handling file upload:", error);
   throw error;
 }

 return { publicUrls, imagePaths };
}

// Sanitize the file name to prevent issues
function sanitizeFileName(fileName: string): string {
 return fileName.replace(/[\/\?<>\\:\*\|":]/g, "_");
}

// Upload a file to Google Drive
async function uploadToGoogleDrive(fileName: string, filePath: string, mimeType: string, driveFolderId: string): Promise<drive_v3.Schema$File> {
 try {
   const fileMetadata: drive_v3.Schema$File = {
     name: fileName,
     parents: [driveFolderId],
   };
   const media: drive_v3.Params$Resource$Files$Create["media"] = {
     mimeType: mimeType,
     body: fs.createReadStream(filePath),
   };
   const response:any = await drive.files.create({
     requestBody: fileMetadata,
     media: media,
     fields: "id",
   });

   return response.data.id;
 } catch (error) {
   console.error("Error uploading to Google Drive:", error);
   throw error;
 }
}

// Generate a public URL for a Google Drive file
async function generatePublicUrl(fileId: string): Promise<string> {
 try {
   await drive.permissions.create({
     fileId: fileId,
     requestBody: {
       role: "reader",
       type: "anyone",
     },
   });

   const file = await drive.files.get({
     fileId: fileId,
     fields: "webViewLink, webContentLink",
   });

   return file.data.webViewLink || "";
 } catch (error) {
   console.error("Error generating public URL:", error);
   throw error;
 }
}

// Extract dominant colors from images using node-vibrant
async function extractColorsFromImages(imagePaths: string[], userId: string): Promise<{ [key: string]: string[] }> {
  const results: { [key: string]: string[] } = {};
  const filepath = path.join(__dirname, 'public', userId)
  for (const imagePath of imagePaths) {
    try {
      const palette = await Vibrant.from(imagePath).getPalette();
      const colors = Object.values(palette)
        .filter(swatch => swatch !== null)
        .map(swatch => swatch!.getHex());
      
      // Use the image file name (without extension) as the key
      const imageName = path.basename(imagePath, path.extname(imagePath));
      results[imageName] = colors;
    } catch (error) {
      console.error(`Error extracting colors from ${imagePath}:`, error);
    }
  }

  // Store results in a single JSON file
  try {
    const outputPath = path.join(filepath, 'extracted_colors.json');
    await checkAndWriteJsonFile(outputPath, results)
    console.log(`Colors extracted and saved to ${outputPath}`);
  } catch (error) {
    console.error('Error writing to JSON file:', error);
  }

  return results;
}


async function checkAndWriteJsonFile(filePath: string, results): Promise<any> {
  try {
    // Check if the file exists
    const exists = await fs.pathExists(filePath);
    
    if (exists) {
      // If the file exists, it writes the necessary data to the file
      await fs.writeJson(filePath, results, {spaces:2})
      // return data;
    } else {
      // if id dosnt it creates a json file
      try {
        await fs.outputJson(filePath, results, { spaces: 2 });
        console.log(`JSON file created successfully at ${filePath}`);
      } catch (error) {
        console.error('Error creating JSON file:', error);
      }
    }
  } catch (error) {
    console.error(`Error checking/reading file ${filePath}:`, error);
    return null;
  }
}


// These next ones are the mongodb Middleware 😃

async function activityMiddleware(req, res, next){
  try {
    if (req.user && req.user._id) {
      await ActivityService.updateUserActivity(canvaUserId)
    }
    next()
  } catch (error) {
    console.error('Activity middlwarea error:', error)
    next(error)
  }
}
