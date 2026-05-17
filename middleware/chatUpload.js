const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure chat uploads directory exists
const chatUploadDir = 'uploads/chat/';
if (!fs.existsSync(chatUploadDir)) {
    fs.mkdirSync(chatUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, chatUploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Helper to determine the category/type of the file based on its extension
const getFileType = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.3gp', '.flv'];
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];

    if (imageExtensions.includes(ext)) return 'image';
    if (videoExtensions.includes(ext)) return 'video';
    if (audioExtensions.includes(ext)) return 'audio';
    return 'file'; // zip, pdf, docx, rar, etc.
};

const fileFilter = (req, file, cb) => {
    // We allow practically any format for chat: images, videos, audio, documents, compression files (zip, rar)
    const allowedExtensions = [
        // Images
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.jfif',
        // Videos
        '.mp4', '.mkv', '.avi', '.mov', '.webm', '.3gp', '.flv',
        // Audio
        '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac',
        // Documents
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv',
        // Compressed files
        '.zip', '.rar', '.7z', '.tar', '.gz'
    ];
    
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`Extension ${ext} is not allowed. Supported: Images, Videos, Audio, PDF, Docs, and Archives (ZIP/RAR).`), false);
    }
};

const chatUpload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // Max size: 50MB (to allow videos and zip files)
    fileFilter: fileFilter
});

module.exports = { chatUpload, getFileType };
