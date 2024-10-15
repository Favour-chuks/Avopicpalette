import { Worker } from 'worker_threads';
import * as path from 'path';
import * as os from 'os';

export async function extractColorsFromImages(imagePaths: string[], userId: string): Promise<{ [key: string]: string[] }> {
  const results: { [key: string]: string[] } = {};
  const filepath = path.join(__dirname, 'public', userId);
  const numCPUs = os.cpus().length;
  const numWorkers = Math.max(1, Math.floor(numCPUs * 0.8)); // Use 80% of available CPUs
  const workerPool: Worker[] = [];

  // Create a pool of workers
  for (let i = 0; i < numWorkers; i++) {
    const worker = new Worker('./image-processing-worker.ts');
    workerPool.push(worker);
  }

  let completedTasks = 0;
  const totalTasks = imagePaths.length;

  const processImage = (worker: Worker, imagePath: string) => {
    return new Promise<void>((resolve) => {
      worker.postMessage(imagePath);
      worker.once('message', (result) => {
        if (result.error) {
          console.error(result.error);
        } else {
          results[result.imageName] = result.colors;
        }
        completedTasks++;
        if (completedTasks < totalTasks) {
          const nextImage = imagePaths[completedTasks];
          if (nextImage) {
            processImage(worker, nextImage);
          }
        }
        resolve();
      });
    });
  };

  // Start processing images
  const initialBatch = imagePaths.slice(0, numWorkers);
  const workerPromises = initialBatch.map((imagePath, index) => 
    processImage(workerPool[index], imagePath)
  );

  // Wait for all workers to finish
  await Promise.all(workerPromises);

  // Terminate all workers
  for (const worker of workerPool) {
    worker.terminate();
  }

  // Store results in a single JSON file
  try {
    const outputPath = path.join(filepath, 'extracted_colors.json');
    await checkAndWriteJsonFile(outputPath, results);
    console.log(`Colors extracted and saved to ${outputPath}`);
  } catch (error) {
    console.error('Error writing to JSON file:', error);
  }

  return results;
}