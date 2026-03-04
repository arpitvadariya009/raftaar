const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

// Disable sharp cache to prevent file locking on Windows
sharp.cache(false);

// Monkey patch for Node environment
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Path to face-api models (local weights)
const MODELS_URL = path.join(__dirname, '../weights');

/**
 * Loads the face-api.js models from disk.
 * Must be called when the server starts.
 */
async function loadModels() {
    try {
        console.log('Loading face-api models from:', MODELS_URL);

        // Load TinyFaceDetector instead of SSD Mobilenet for speed
        await faceapi.nets.tinyFaceDetector.loadFromDisk(MODELS_URL);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_URL);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_URL);

        console.log('Face models loaded successfully (using TinyFaceDetector)');
    } catch (error) {
        console.error('Failed to load Face Models:', error);
        throw error;
    }
}

/**
 * Detects a single face in an image and returns its descriptor (embedding).
 * @param {string} imagePath - Path to the image file on disk.
 * @returns {Promise<Float32Array|null>} - The 128D face descriptor or null if no face found.
 */
async function getFaceDescriptor(imagePath) {
    try {
        // Extreme optimization: Use VERY small resolution for pure JS speed
        // This is necessary because native acceleration (tfjs-node) is not available
        const buffer = await sharp(imagePath)
            .resize({ width: 250, withoutEnlargement: true })
            .toFormat('jpeg')
            .toBuffer();

        // Load image from buffer directly into Canvas
        const img = await canvas.loadImage(buffer);

        // Extreme optimization: Use smallest possible inputSize for TinyFaceDetector
        // 128 or 160 is the fastest for pure JS processing
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.3 });

        const detection = await faceapi.detectSingleFace(img, options)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            console.warn(`Face detection failed for image: ${imagePath}. (Buffer size: ${buffer.length} bytes)`);
            return null;
        }

        console.log(`Face detected successfully. Confidence: ${detection.detection.score.toFixed(2)}`);
        return detection.descriptor;
    } catch (error) {
        console.error('getFaceDescriptor Error:', error);
        throw error;
    }
}

/**
 * Calculates Euclidean distance between two descriptors.
 */
function getEuclideanDistance(descriptor1, descriptor2) {
    return faceapi.euclideanDistance(descriptor1, descriptor2);
}

/**
 * Checks if face is a match based on threshold.
 */
function isMatch(distance, threshold = 0.6) {
    return distance < threshold;
}

module.exports = {
    loadModels,
    getFaceDescriptor,
    getEuclideanDistance,
    isMatch
};
