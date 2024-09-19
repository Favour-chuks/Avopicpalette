import {
  Rows,
  Button,
} from "@canva/app-ui-kit";
import React, { useEffect, useState } from "react";
import styles from "styles/components.css";
import baseStyles from "styles/components.css";
import FileUpload from "./components/sectionComponent/fileUpload";
import { auth } from "@canva/user";
import ColorSwatch from "./components/sectionComponent/color";
// import ConnectionError from "./stateComponents/ConnectionError";
import MasonryList from "./components/sectionComponent/masonry";
import axios from 'axios'
import Warn from "./components/actionComponent/warn";


type CanvaUserToken = string;

export default function App() {
  // const [error, setError] = useState('')
  // const [messageRequest, setMessageRequest] = useState('')
  const [token, setToken] = useState<CanvaUserToken | undefined>(undefined);

  // to handle button click
  const getColorPalette = async () => {
    if (navigator.onLine) {
      const response = await axios.post('http://localhost:3001/upload');
      console.log(response.data)
    } else {
      // console.log("WebSocket is not ready or no files selected.");
      return  <Warn tone={'warn'} message={"looks like your'e offline, try checking your internet connection"} isclicked={true}/>
    }
  };


  useEffect(() => {
    const authenticate = async () => {
      try {
        // Fetch user token from Canva authentication API
        const userToken = await auth.getCanvaUserToken();

        if (!userToken) {
          console.error("No user token found");
          return;
        }

        setToken(userToken)
        console.log(userToken)
        // Use environment variable for the backend URL to avoid hardcoding
        const backendUrl = "http://localhost:3001";

        // Perform the axios request
        const response = await axios.post(
          `${backendUrl}/login`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Handle different response statuses
        if (response.status === 200) {
          console.log("Authentication successful:", response.data);
        } else {
          console.warn(`Unexpected response status: ${response.status}`);
        }
      } catch (error: any) {
        // Provide better error handling
        if (error.response) {
          // Server responded with a status other than 2xx
          console.error(
            `Authentication failed with status ${error.response.status}:`,
            error.response.data
          );
        } else if (error.request) {
          // Request was made, but no response received
          console.error("No response received from server:", error.request);
        } else {
          // Something else happened in setting up the request
          console.error("Error in authentication request:", error.message);
        }
      }
    };
    authenticate(); // Invoke the authenticate function
  }, []); // Empty dependency array for on-mount execution only

  
  return (
    <>
      <div className={styles.fullHeight}>
        <Rows spacing="4u">
          {/* <ColorSwatch color={[]} /> */}

          <Rows spacing={"2u"}>
            <FileUpload token={token}/>

            <Button
              alignment="center"
              onClick={getColorPalette}
              stretch
              type="submit"
              variant="primary">
              Generate Pallete
            </Button>
          </Rows>

          {/* this handles the masonry display */}
          <MasonryList />
        </Rows>
      </div>
    </>
  );
}
