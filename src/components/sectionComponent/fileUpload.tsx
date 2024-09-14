import { useState } from "react";
import { Rows, Text, Title, FileInput } from "@canva/app-ui-kit";
import axios from "axios";
import Warn from "./stateComponents/Warn";

interface tokenstate{
  token: any
}
function FileUpload({token}:tokenstate) {
  const [message, setMessage] = useState("");

  const handleFileUpload = (files: File[]) => {
    if (files.length > 0) {
      const fileDataArray: { name: string; data: string }[] = [];

      console.log(files);
      // Use a Promise to handle multiple file reads
      const readFiles = Array.from(files).map((file) => {
        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (e: ProgressEvent<FileReader>) => {
            fileDataArray.push({
              name: file.name,
              data: (e.target?.result as string).split(",")[1], // Extract base64 data
            });
            resolve();
          };
          reader.onerror = (err) => reject(err);
        });
      });

      if (navigator.onLine) {
        Promise.all(readFiles)
          .then(() => {
            const response: any = axios.post(
              "http://localhost:3001/fileUpload",
              fileDataArray,
              {
                headers: {
                  "Content-Type": "multipart/form-data", // Axios automatically sets this header
                  "Authorization": `Bearer ${token}`
                },
              }
            );
            console.log(response.status);
          })
          .catch((err) => {
            console.error(err.message);
          });
      } else {
        console.log("something is wrong");
      }
    }
  };

  return (
    <>
      <Rows spacing="1u">
        <Rows spacing={"0"}>
          <Title size="small">Upload from local storage</Title>
          <Text size="small" tone="tertiary">
            Upload your inspiration from your computer
          </Text>
        </Rows>
        <FileInput
          accept={["image/*"]}
          multiple={true}
          onDropAcceptedFiles={handleFileUpload}
        />
      </Rows>
    </>
  );
}

export default FileUpload;
