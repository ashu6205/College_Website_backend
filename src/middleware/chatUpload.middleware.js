// middleware/chatUpload.middleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Add chat uploads directory with normalized paths
const CHAT_UPLOAD_DIRS = {
    images: path.join('public', 'uploads', 'chat', 'images'),
    files: path.join('public', 'uploads', 'chat', 'files'),
    default: path.join('public', 'uploads', 'chat')
};

// Create chat upload directories
Object.values(CHAT_UPLOAD_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const chatStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, CHAT_UPLOAD_DIRS.images);
        } else {
            cb(null, CHAT_UPLOAD_DIRS.files);
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `chat-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const chatFileFilter = (req, file, cb) => {
    const allowedTypes = {
        'image/jpeg': true,
        'image/png': true,
        'image/gif': true,
        'application/pdf': true,
        'application/msword': true,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
        'application/zip': true,
        'text/plain': true
    };

    if (allowedTypes[file.mimetype]) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type for chat attachment'), false);
    }
};

// Helper function to get file URL
const getFileUrl = (file) => {
    if (!file) return null;
    
    // Normalize path separators and remove 'public' from the path
    const relativePath = file.path
        .replace(/\\/g, '/') // Replace Windows backslashes with forward slashes
        .replace('public/', ''); // Remove 'public/' from the beginning
    
    return `/${relativePath}`;
};

// Create multer instance
const upload = multer({
    storage: chatStorage,
    fileFilter: chatFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for chat files
    }
});

// Export both the upload middleware and helper functions
module.exports = {
    upload,
    getFileUrl,
    CHAT_UPLOAD_DIRS
};