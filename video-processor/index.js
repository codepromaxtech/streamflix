const Redis = require('redis');
const Minio = require('minio');
const ffmpeg = require('fluent-ffmpeg');
const Queue = require('bull');
const fs = require('fs');
const path = require('path');

// Initialize Redis connection
const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Initialize MinIO client
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123'
});

// Create video processing queue
const videoQueue = new Queue('video processing', process.env.REDIS_URL || 'redis://localhost:6379');

// Process video jobs
videoQueue.process(async (job) => {
  const { videoPath, outputPath, quality } = job.data;
  
  console.log(`Processing video: ${videoPath} -> ${outputPath}`);
  
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .size(quality || '1280x720')
      .on('end', () => {
        console.log(`Video processing completed: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`Video processing failed: ${err.message}`);
        reject(err);
      })
      .run();
  });
});

// Health check endpoint
const http = require('http');
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', service: 'video-processor' }));
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
  process.exit(0);
});

console.log('Video processor service started');
