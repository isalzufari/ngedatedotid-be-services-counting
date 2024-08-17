const fs = require('fs');
const { spawn } = require('child_process');

const sharp = require('sharp');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { shared } = require('@tensorflow/tfjs-node');

const outputDir = 'frames';
const interval = 1; // Capture frame every 10 seconds
const maxSize = 1024 * 1024; // 1MB in bytes

const extract = (videoPath, frameCallback, endCallback) => {
  const stream = spawn('ffmpeg', [
    '-i', videoPath,
    '-vf', 'fps=20', // Extract 1 frame per second; adjust as needed
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-q:v', '2', // Quality level to ensure compression under 1MB
    '-'
  ]);

  stream.on("error", error => {
    console.log(`error: ${error.message}`);
  });

  stream.stdout.on('data', frameCallback);
  stream.stderr.on("data", data => {
    console.log(`stderr: ${data}`);
  });

  stream.on('close', endCallback);

  stream.on("close", code => {
    console.log(`child process exited with code ${code}`);
  });
}

async function extractFrame(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .on('end', () => {
        console.log('Frames extraction completed.');
        resolve();
      })
      .on('error', (err) => {
        console.error(`Error: ${err.message}`);
        reject(err);
      })
      .on('filenames', (filenames) => {
        console.log(`Generating frames: ${filenames.join(', ')}`);
      })
      .output(path.join(outputDir, 'frame-%03d.jpg'))
      .outputOptions([`-vf fps=1/${interval}`]) // Capture frame every 10 seconds
      .run();
  });
}

function compressImages() {
  fs.readdir(outputDir, (err, files) => {
    if (err) {
      console.error(`Error reading directory: ${err.message}`);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(outputDir, file);
      sharp(filePath)
        .jpeg({ quality: 80 })
        .toBuffer()
        .then((data) => {
          if (data.length > maxSize) {
            return sharp(data)
              .resize({ width: Math.floor((data.length / maxSize) * 0.9) })
              .jpeg({ quality: 80 })
              .toBuffer();
          }
          return data;
        })
        .then((data) => {
          fs.writeFile(filePath, data, (err) => {
            if (err) {
              console.error(`Error writing file: ${err.message}`);
            } else {
              console.log(`Compressed and saved: ${filePath}`);
            }
          });
        })
        .catch((err) => {
          console.error(`Error processing image: ${err.message}`);
        });
    });
  });
}

function getTimestamp() {
  const now = new Date();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${minutes}${seconds}`;
}

function saveData({ count, base64Image }) {
  // Destination image path with timestamp
  const timestamp = getTimestamp();
  const destinationImagePath = path.join(`${__dirname}/images`, `image_${timestamp}_${count}.png`);

  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

  // Create a buffer from the base64 string
  const buffer = Buffer.from(base64Data, 'base64');

  fs.writeFile(destinationImagePath, buffer, (err) => {
    if (err) {
      console.error(`Error writing file: ${err.message}`);
    } else {
      console.log(`Compressed and saved: ${destinationImagePath}`);
    }
  })
}

module.exports = saveData;
