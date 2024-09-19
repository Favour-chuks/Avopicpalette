import * as express from 'express';
import * as dotenv from 'dotenv';
import * as cors from 'cors';
import  * as multer from 'multer';
import * as cookieParser from 'cookie-parser';
import { getTokenFromHttpHeader, getTokenFromQueryString } from "../../utils/backend/jwt_middleware/jwt_middleware";
import { createJwtMiddleware } from "../../utils/backend/jwt_middleware";
import {handleAuthMiddleware} from "./middleware/simpleAuthMiddleware" 
import { authorizationMiddleware } from '../components/testcomponents/testControllers';

dotenv.config();

const app = express();
const appId = process.env.CANVA_APP_ID || '';
const port = process.env.CANVA_BACKEND_PORT || 2001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const CACHE_EXPIRY_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 10 * 1000;

const upload = multer({ dest: 'uploads/' });

interface User {
  userId: string;
  lastActive: Date;
  userFolder: string;
}

let activeUsers: Map<string, User> = new Map();
let palette: any;
let userData: any;

app.get('/login', authorizationMiddleware, (req: any, res) => {
  if (!req.user){
    return res.status(400).json({ error: "Canva User not found" });
  }

  console.log(req.canva.userId)
  
res.cookie(req.canva, {
  signed: true,
})
})

app.post('/auth', async (req: express.Request, res: express.Response) => {

  const canvaUserID = req.signedCookies.canva.userId

  // const canvaUserID = (req as any).canva.userId;

  if (!canvaUserID) {
    console.log('Sorry, the user was not created');
    res.status(400).send({ "message": "The user was not created" });
    return;
  }

  try {
    activeUsers.set(canvaUserID, {
      userId: canvaUserID,
      lastActive: new Date(),
      userFolder: `${canvaUserID}/newfolder`,
    });
    console.log(activeUsers);
    res.status(200).send({ "message": "User authenticated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ "message": "Internal server error" });
  }
});

app.post('/fileUpload', upload.array('files'), async (req: any, res: express.Response) => {
  if (!userData) {
    return res.status(400).json({ error: "User not found" });
  }

  const files = req.files

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files found" });
  }

  console.log('The auth process is complete');
  res.status(200).json({ message: "Files uploaded successfully" });
});

app.get('/getPalette', (req: express.Request, res: express.Response) => {
  console.log('Button was clicked');
  res.send('The button was clicked');
});

app.listen(port, () => {
  console.log('Server is running on port:', port);
});




