import * as path from 'path';
import { google, drive_v3 } from 'googleapis';


// Google Drive authentication setup
const KEYFILEPATH: string = path.join(__dirname, "cred.json");  // Path to the Google API credentials file
const SCOPES: string[] = ["https://www.googleapis.com/auth/drive"];  // Scopes for Google Drive access

// to create a new google drive authentication path
const googleAuth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

// to create a new google drive path
const drive: drive_v3.Drive = google.drive({ version: "v3", auth: googleAuth });  // Initialize Google Drive API client



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
   const folders:any = res.data.files;

   if (folders.length > 0) {
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
   const response = await drive.files.create({
     requestBody: fileMetadata,
     fields: 'id, name',
   });
   console.log(`Folder created: Name:${response.data.name}, ID: ${response.data.id}`);
   return response.data;
 } catch (error) {
   console.error('Error creating folder:', error);
   throw error;
 }
}

// Find an existing Google Drive folder or create a new one
export async function findOrCreateDriveFolder(folderName: string, parentFolderId: string): Promise<drive_v3.Schema$File> {
 try {
   let folder:any = await findFolderByName(folderName, parentFolderId);

   if (!folder) {
     console.log('creating a new folder with the name:', folderName);
     folder = await createFolder(folderName, parentFolderId);
   }

   return folder;
 } catch (error) {
   console.error('Error in findOrCreateDriveFolder:', error);
   throw error;
 }
}


