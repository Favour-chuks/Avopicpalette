import { JwksClient } from "jwks-rsa";
import * as jwt from 'jsonwebtoken';

// to handle the authentication cacheing timeout and jwt token timeout
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 60 minutes
const TIMEOUT_MS = 30 * 1000; // 30 seconds
const APP_ID = process.env.CANVA_APP_ID || '';


export async function handleAuthMiddleware(req: any, res, next) {
 const token = getTokenFromHeader(req);
// checks for token
 if (!token) {
   return res.sendStatus(401);
 }

 const authResult = await verifyAndAuthorizeRequest(token, APP_ID);

 // runs if theres error
 if (authResult.status === 'error') {
   return res.status(403).json({ message: authResult.message });
 }

 // to get the userid from the sent token
 const user = authResult.data

 // checks for the userid
 if (!user) {
   return res.status(400).json({ error: "Canva User ID is required" });
 }
 req.canva = user;

next()
}

function getTokenFromHeader(request: Request): string | undefined {
// checks for header type
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

   if (!kid) {
     throw new Error('No "kid" found in token header');
   }

   const jwks = new JwksClient({
     jwksUri: `https://api.canva.com/rest/v1/apps/${appId}/jwks`,
     cache: true,
     cacheMaxAge: CACHE_EXPIRY_MS,
     timeout: TIMEOUT_MS,
     rateLimit: true,
   });

   const key = await jwks.getSigningKey(decoded.header.kid);
   const publicKey = key.getPublicKey();

   // Add clockTolerance to avoid time sync issues
   const verified: any = jwt.verify(token, publicKey, {
     audience: appId,
     // clockTolerance: 20, // Allows 20 seconds tolerance for clock skew
   });

   if (!verified.aud || !verified.brandId || !verified.userId) {
     throw new Error("The user token is not valid");
   }

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