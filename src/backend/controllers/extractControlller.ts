import Vibrant from 'node-vibrant';



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