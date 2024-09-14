import {
  Columns,
  Column,
  Swatch,
  Rows,
  Title,
  Alert,
} from "@canva/app-ui-kit";
import Warn from "./stateComponents/Warn";
import { useState } from "react";

interface swatchOptions {
  color: string[];
}

export default function ColorSwatch({ color }: swatchOptions) {
  const [alert, setAlert] = useState(false);
  // to handle copy on click
  const handleCopy = (textToCopy: string) => {
    // Use the Clipboard API
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setAlert(true)
        //  alert("Text copied to clipboard!");
      }).then(() => {
        const timer = setTimeout(() => {
          setAlert(false);
        }, 3000); // Unmount after 5 seconds
    
        // Cleanup function to clear the timeout if component unmounts before timer completes
        return () => clearTimeout(timer);
    
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  };

  // error is theres no value to copy
  const copyError = () => {
    setAlert(true);
    const timer = setTimeout(() => {
      setAlert(false);
    }, 3000); // Unmount after 3 seconds

    // Cleanup function to clear the timeout if component unmounts before timer completes
    return () => clearTimeout(timer);

  };

  // to show the colors gotten from the extraction process
  if (color.length > 0) {
    color.map((colors: any) => {
      return (
        <>
          <Rows spacing={'2u'}>
          <Columns align="center" spacing={"2u"}>
            <Column key={colors.hex}>
              <Swatch
                fill={[colors.hex]}
                onClick={() => {
                  handleCopy(colors.hex);
                }}
                size="small"
                variant="solid"
              />
            </Column>
          </Columns>
          
        <Warn
          isclicked={alert}
          tone={"positive"}
          message={"Successfully copied"}
        />
          </Rows>
        </>
      );
    });
  } else {
    // default value for the swatch
    return (
      <Rows spacing={"2u"}>
        <Columns spacing="1u">
          <Column>
            <Rows spacing="1u">
              <Swatch
                fill={[""]}
                onClick={() => {
                  copyError();
                }}
              />
            </Rows>
          </Column>
          <Column>
            <Rows spacing="1u">
              <Swatch
                fill={[""]}
                onClick={() => {
                  copyError();
                }}
              />
            </Rows>
          </Column>
          <Column>
            <Rows spacing="1u">
              <Swatch
                fill={[""]}
                onClick={() => {
                  copyError();
                }}
              />
            </Rows>
          </Column>
          <Column>
            <Rows spacing="1u">
              <Swatch
                fill={[""]}
                onClick={() => {
                  copyError();
                }}
              />
            </Rows>
          </Column>
        </Columns>

        <Warn
          isclicked={alert}
          tone={"warn"}
          message={"sorry theres no color here"}
        />
      </Rows>
    );
  }
}
