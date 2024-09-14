import * as path from 'path';
import { google, drive_v3 } from 'googleapis';

const fs = require('fs-extra')

// Google Drive authentication setup
const KEYFILEPATH: string = path.join(__dirname, "cred.json");  // Path to the Google API credentials file
const SCOPES: string[] = ["https://www.googleapis.com/auth/drive"];  // Scopes for Google Drive access

// to create a new google drive authentication path
const googleAuth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

//creates a new google drive path
const drive: drive_v3.Drive = google.drive({ version: "v3", auth: googleAuth });  // Initialize Google Drive API client



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