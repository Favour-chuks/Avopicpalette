import { parentPort } from 'worker_threads';
import * as Vibrant from 'node-vibrant';
import * as path from 'path';

parentPort?.on('message', async (imagePath: string) => {
  try {
    const palette = await Vibrant.from(imagePath).getPalette();
    const colors = Object.values(palette)
      .filter(swatch => swatch !== null)
      .map(swatch => swatch!.getHex());
    
    const imageName = path.basename(imagePath, path.extname(imagePath));
    parentPort?.postMessage({ imageName, colors });
  } catch (error) {
    parentPort?.postMessage({ error: `Error processing ${imagePath}: ${error}` });
  }
});