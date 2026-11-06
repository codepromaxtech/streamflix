const Redis = require('redis');
const Minio = require('minio');
const ffmpeg = require('fluent-ffmpeg');
const Queue = require('bull');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Initialize Redis connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = Redis.createClient({ url: redisUrl });

// Initialize MinIO client
const rawEndpoint = process.env.MINIO_ENDPOINT || 'localhost';
const cleanEndpoint = rawEndpoint.replace(/^https?:\/\//, '');
const [parsedHost, parsedPort] = cleanEndpoint.split(':');
const minioPort = parseInt(process.env.MINIO_PORT || parsedPort || '9000', 10);

const minioClient = new Minio.Client({
  endPoint: parsedHost,
  port: minioPort,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
});

const BUCKET_NAME = process.env.MINIO_BUCKET || 'videos';

// Ensure MinIO bucket exists
async function ensureBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`MinIO bucket created: ${BUCKET_NAME}`);
    }
  } catch (err) {
    console.warn(`MinIO bucket check warning: ${err.message}`);
  }
}
ensureBucket();

// Create video processing queue matching backend producer
const videoQueue = new Queue('video-processing', redisUrl);

async function uploadDirectoryToMinio(dirPath, destPrefix) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const objectKey = `${destPrefix}/${entry.name}`;
    if (entry.isDirectory()) {
      await uploadDirectoryToMinio(fullPath, objectKey);
    } else {
      try {
        await minioClient.fPutObject(BUCKET_NAME, objectKey, fullPath);
        console.log(`Uploaded to MinIO: ${objectKey}`);
      } catch (err) {
        console.warn(`MinIO upload failed for ${objectKey}: ${err.message}`);
      }
    }
  }
}

async function processJob(job) {
  const { contentId, inputPath, outputDir, qualities, videoPath, outputPath, quality } = job.data;
  const src = inputPath || videoPath;
  const out = outputDir || outputPath;

  if (!src) {
    throw new Error('No input video path provided in job data');
  }

  console.log(`[Job ${job.id}] Processing video: contentId=${contentId || 'N/A'}, src=${src}`);

  if (out && !fs.existsSync(out)) {
    fs.mkdirSync(out, { recursive: true });
  }

  // Multi-quality processing if qualities provided
  if (Array.isArray(qualities) && qualities.length > 0 && out) {
    for (const q of qualities) {
      const qOutput = path.join(out, `${q.name || q.resolution || 'output'}.mp4`);
      console.log(`[Job ${job.id}] Transcoding ${q.name} (${q.width}x${q.height})...`);

      await new Promise((resolve, reject) => {
        ffmpeg(src)
          .output(qOutput)
          .videoCodec('libx264')
          .audioCodec('aac')
          .size(`${q.width}x${q.height}`)
          .videoBitrate(q.bitrate || '1500k')
          .on('end', () => {
            console.log(`[Job ${job.id}] Transcoded: ${qOutput}`);
            resolve(qOutput);
          })
          .on('error', (err) => {
            console.error(`[Job ${job.id}] Failed quality ${q.name}:`, err.message);
            resolve(null); // Continue other qualities
          })
          .run();
      });
    }

    if (contentId) {
      await uploadDirectoryToMinio(out, contentId);
    }

    return { success: true, contentId, outputDir: out };
  }

  // Single output file fallback
  const finalOutput = out.endsWith('.mp4') ? out : path.join(out, 'output.mp4');
  return new Promise((resolve, reject) => {
    ffmpeg(src)
      .output(finalOutput)
      .videoCodec('libx264')
      .audioCodec('aac')
      .size(quality || '1280x720')
      .on('end', () => {
        console.log(`[Job ${job.id}] Processing completed: ${finalOutput}`);
        resolve({ success: true, outputPath: finalOutput });
      })
      .on('error', (err) => {
        console.error(`[Job ${job.id}] Processing failed: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

// Register queue handlers for both specific and generic names
videoQueue.process('process-video', async (job) => processJob(job));
videoQueue.process(async (job) => processJob(job));

// Health check endpoint
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', service: 'video-processor', queue: 'video-processing' }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Video processor service running on port ${PORT}`);
});

// Connect to Redis
redis.connect().then(() => {
  console.log('Connected to Redis');
}).catch(console.error);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down video processor...');
  server.close();
  redis.quit();
  videoQueue.close();
  process.exit(0);
});

console.log('Video processor service started on queue: video-processing');
