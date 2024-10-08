// having the error TypeError: Cannot read properties of undefined (reading 'promises') so the jwt returns undefined

import * as express from 'express'
import { Request, Response, NextFunction } from 'express';
import  * as dotenv from 'dotenv';
import * as cors from 'cors';
import * as path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import * as  multer from 'multer';
import { JwksClient } from "jwks-rsa";
import jwt from 'jsonwebtoken';
import { google, drive_v3 } from 'googleapis';
import Vibrant from 'node-vibrant';

dotenv.config();

const app = express();
const appId = process.env.CANVA_APP_ID || ''; // Ensure this is defined in .env

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

app.use(cors())
// app.use(
//   cors({
//     origin: `https://app-${appId}.canva-apps.com`,
//     optionsSuccessStatus: 200,
//   })
// );
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

let activeUsers: { [userId: string]: { userId: string, lastActive: Date, driveFolderId:string } } = {}; // In-memory storage

app.post('/auth', async (req:any, res) => {
  const token = getTokenFromHeader(req);

  if (!token) {
    return res.sendStatus(401);
  }

  const authResult = await verifyAndAuthorizeRequest(token, appId);

  if (authResult.status === 'error') {
    return res.status(403).json({ message: authResult.message });
  }

  // to get the userid from the sent token
  const canvaUserId = authResult.data.userId

  if (!canvaUserId) {
    return res.status(400).json({ error: "Canva User ID is required" });
  }

  try {
    const userFolder:string = path.join(__dirname, `uploads/${canvaUserId}`);
    await fs.promises.mkdir(userFolder, { recursive: true });

    const parentFolderId = '1oaS_ZkyI8moaMukdgsB9ghFpy-c9wpul';
    const driveFolder = await findOrCreateDriveFolder(canvaUserId, parentFolderId);

    activeUsers[canvaUserId] = {
      userId: canvaUserId,                  // User ID
      lastActive: new Date(),          // Current date as last active time
      driveFolderId: driveFolder.id as string,  // Example Google Drive folder ID
    };
    console.log('all the necessary starters has been done')
  } catch (error) {
    console.error("Error in /create-folder:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});



// Handle file upload
app.post('/upload', upload.array('files'), async (req:any, res) => {
  const { canvaUserId } = req.body;
  const files = req.files;

  if (!canvaUserId || !files || files.length === 0) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  try {
    const userFolder = path.join(__dirname, `uploads/${canvaUserId}`);
    const userData:any = activeUsers[canvaUserId];

    if (!userData) {
      return res.status(400).json({ error: "User not found" });
    }

    const { publicUrls, imagePaths } = await handleUpload(files, userFolder, userData.driveFolderId, canvaUserId);
    res.status(200).json({ message: "Files uploaded", urls: publicUrls });
  } catch (error) {
    console.error("Error in /upload:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(process.env.CANVA_BACKEND_PORT, () => {
  console.log(`Server is running on port ${process.env.CANVA_BACKEND_PORT}`);
});
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 60 minutes
const TIMEOUT_MS = 30 * 1000; // 30 seconds
// const appId = process.env.CANVA_APP_ID || ''; // Ensure this is defined in .env
// Google Drive authentication setup
const KEYFILEPATH: string = path.join(__dirname, "cred.json");  // Path to the Google API credentials file
const SCOPES: string[] = ["https://www.googleapis.com/auth/drive"];  // Scopes for Google Drive access

const googleAuth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

const drive: drive_v3.Drive = google.drive({ version: "v3", auth: googleAuth });  // Initialize Google Drive API client

// let activeUsers: { [userId: string]: { userId: string, lastActive: Date } } = {}; // In-memory storage


export function getTokenFromHeader(request: Request): string | undefined {
 const header = request.headers['authorization'];

 if (!header) {
   return;
 }

 const parts = header.split(' ');

 if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
   return;
 }

 const [, token] = parts;

 return token;
}

async function verifyAndAuthorizeRequest(token: string, appId: string) {
 try {
   const decoded = jwt.decode(token, { complete: true });
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

   const verified: any = jwt.verify(token, publicKey, {
    audience: appId,
    clockTolerance: 30, // Optional: Adds tolerance in seconds to handle slight clock differences
  });

   if (!verified.aud || !verified.brandId || !verified.userId) {
     throw new Error('The user token is not valid');
   }

   console.log('User is authorized');
   return {
     status: 'success',
     data: verified,
   };
 } catch (error: any) {
   console.error('Authorization failed:', error.message);
   return {
     status: 'error',
     message: error.message,
   };
 }
}


// authorization middleware 
export const  authorizationMiddleware = async (req: any, res: Response, next: NextFunction) => {
 const token = getTokenFromHeader(req);

 if (!token) {
   return res.sendStatus(401); // Unauthorized
 }

 try {
   const decoded = jwt.decode(token, { complete: true });
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

   const verified: any = jwt.verify(token, publicKey, {
     audience: appId,
   });

   if (!verified.aud || !verified.brandId || !verified.userId) {
     throw new Error('The user token is not valid');
   }

   req.user = verified; // Attach user data to the request object
   next(); // Proceed to the next middleware or route handler
 } catch (error: any) {
   console.error('Authorization failed:', error.message);
   return res.status(403).json({ message: 'Authorization failed: ' + error.message });
 }
}





// Check if a folder with a specific name exists in Google Drive
export async function findFolderByName(folderName: string, parentFolderId: string): Promise<drive_v3.Schema$File | null> {
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
export async function createFolder(folderName: string, parentFolderId: string): Promise<drive_v3.Schema$File> {
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
export async function findOrCreateDriveFolder(folderName: string, parentFolderId: string): Promise<drive_v3.Schema$File> {
 try {
   let folder = await findFolderByName(folderName, parentFolderId);

   if (folder) {
     console.log(`Folder found: Name: ${folder.name}`);
   } else {
     console.log('Folder not found, creating a new one');
     folder = await createFolder(folderName, parentFolderId);
   }

   return folder;
 } catch (error) {
   console.error('Error in findOrCreateDriveFolder:', error);
   throw error;
 }
}

// Set a timeout to delete the user's folder after 45 minutes of inactivity
export async function resetTimeout(userId: string, driveFolderId?: string): Promise<NodeJS.Timeout> {
 return setTimeout(async () => {
   try {
     await deleteFolderAfterTimeout(userId, driveFolderId);  // Delete folder after timeout
   } catch (error) {
     console.error(`Failed to delete folder for user ${userId}:`, error);
   }
 }, 45 * 60 * 1000);  // 45-minute timeout
}

// Delete the user's folder locally and from Google Drive after timeout
export async function deleteFolderAfterTimeout(userId: string, driveFolderId?: string): Promise<void> {
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
export async function handleUpload(files: any, userFolder: string, { imageFiles, driveFolderId, userId }: { imageFiles: any; userFolder: string; driveFolderId: string; userId: string; }, canvaUserId: string): Promise<{ publicUrls: string[], imagePaths: string[] }> {
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
     const driveFile: any = await uploadToGoogleDrive(fileName, filePath, file.mimeType, driveFolderId);
     console.log(`Image ${fileName} uploaded to Google Drive with ID: ${driveFile.id}`);

     // Generate the public URL
     const publicUrl: string = await generatePublicUrl(driveFile.id);
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
export function sanitizeFileName(fileName: string): string {
 return fileName.replace(/[\/\?<>\\:\*\|":]/g, "_");
}

// Upload a file to Google Drive
export async function uploadToGoogleDrive(fileName: string, filePath: string, mimeType: string, driveFolderId: string): Promise<drive_v3.Schema$File> {
 try {
   const fileMetadata: drive_v3.Schema$File = {
     name: fileName,
     parents: [driveFolderId],
   };
   const media: drive_v3.Params$Resource$Files$Create["media"] = {
     mimeType: mimeType,
     body: fs.createReadStream(filePath),
   };
   const response = await drive.files.create({
     requestBody: fileMetadata,
     media: media,
     fields: "id",
   });

   return response.data;
 } catch (error) {
   console.error("Error uploading to Google Drive:", error);
   throw error;
 }
}

// Generate a public URL for a Google Drive file
export async function generatePublicUrl(fileId: string): Promise<string> {
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
export async function extractColorsFromImages(imagePaths: string[]): Promise<{ [key: string]: string[] }> {
 const results: { [key: string]: string[] } = {};

 for (const imagePath of imagePaths) {
   try {
     const palette = await Vibrant.from(imagePath).getPalette();
     results[imagePath] = Object.values(palette).map((swatch) => swatch?.getHex() || "");  // Extract hex colors
   } catch (error) {
     console.error("Error extracting colors:", error);
   }
 }

 return results;
}
