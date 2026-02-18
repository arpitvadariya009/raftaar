const fs = require('fs');
const https = require('https');
const path = require('path');

// Adjusted to root/weights to match project structure
const weightsDir = path.join(__dirname, '../weights');

if (!fs.existsSync(weightsDir)) {
    fs.mkdirSync(weightsDir, { recursive: true });
}

const files = [
    'ssd_mobilenetv1_model-weights_manifest.json',
    'ssd_mobilenetv1_model-shard1',
    'ssd_mobilenetv1_model-shard2',
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model-shard1',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_recognition_model-shard2'
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

const downloadFile = (file) => {
    const filePath = path.join(weightsDir, file);
    const fileUrl = baseUrl + file;

    if (fs.existsSync(filePath)) {
        console.log(`${file} already exists.`);
        return;
    }

    console.log(`Downloading ${file}...`);
    const fileStream = fs.createWriteStream(filePath);

    https.get(fileUrl, (response) => {
        if (response.statusCode !== 200) {
            console.error(`Failed to download ${file}: Status Code ${response.statusCode}`);
            response.resume();
            return;
        }

        response.pipe(fileStream);

        fileStream.on('finish', () => {
            fileStream.close();
            console.log(`${file} downloaded successfully.`);
        });
    }).on('error', (err) => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error(`Error downloading ${file}: ${err.message}`);
    });
};

files.forEach(downloadFile);
