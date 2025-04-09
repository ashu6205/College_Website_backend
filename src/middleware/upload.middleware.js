// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');

// // Define upload directory for different types
// const UPLOAD_DIRS = {
//     images: 'public/uploads/images',
//     documents: 'public/uploads/documents',
//     default: 'public/uploads'
// };

// // Create directories if they don't exist
// Object.values(UPLOAD_DIRS).forEach(dir => {
//     if (!fs.existsSync(dir)) {
//         fs.mkdirSync(dir, { recursive: true });
//     }
// });

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         // Choose destination based on file type
//         if (file.mimetype.startsWith('image/')) {
//             cb(null, UPLOAD_DIRS.images);
//         } else {
//             cb(null, UPLOAD_DIRS.documents);
//         }
//     },
//     filename: function (req, file, cb) {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//         cb(null, uniqueSuffix + path.extname(file.originalname));
//     }
// });

// const fileFilter = (req, file, cb) => {
//     // For images in posts
//     if (req.baseUrl.includes('posts') && !file.mimetype.startsWith('image/')) {
//         cb(new Error('Only images are allowed for posts'), false);
//         return;
//     }

//     const allowedTypes = [
//         'application/pdf',
//         'application/msword',
//         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//         'application/vnd.ms-powerpoint',
//         'application/vnd.openxmlformats-officedocument.presentationml.presentation',
//         'text/plain',
//         'image/jpeg',
//         'image/png'
//     ];

//     if (allowedTypes.includes(file.mimetype)) {
//         cb(null, true);
//     } else {
//         cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, and PNG files are allowed.'), false);
//     }
// }

// const upload = multer({
//     storage: storage,
//     fileFilter: fileFilter,
//     limits: {
//         fileSize: 25 * 1024 * 1024 // 25MB limit
//     }
// });

// module.exports = upload;




// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');

// // Define upload directory for different types including chat
// const UPLOAD_DIRS = {
//     images: 'public/uploads/images',
//     documents: 'public/uploads/documents',
//     chat: {
//         images: 'public/uploads/chat/images',
//         files: 'public/uploads/chat/files'
//     },
//     default: 'public/uploads'
// };

// // Create directories if they don't exist
// const createDirectories = () => {
//     const dirs = [
//         UPLOAD_DIRS.images,
//         UPLOAD_DIRS.documents,
//         UPLOAD_DIRS.chat.images,
//         UPLOAD_DIRS.chat.files,
//         UPLOAD_DIRS.default
//     ];

//     dirs.forEach(dir => {
//         if (!fs.existsSync(dir)) {
//             fs.mkdirSync(dir, { recursive: true });
//         }
//     });
// };

// createDirectories();

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         // Handle chat uploads
//         if (req.baseUrl.includes('chat')) {
//             if (file.mimetype.startsWith('image/')) {
//                 cb(null, UPLOAD_DIRS.chat.images);
//             } else {
//                 cb(null, UPLOAD_DIRS.chat.files);
//             }
//             return;
//         }

//         // Handle existing upload types
//         if (file.mimetype.startsWith('image/')) {
//             cb(null, UPLOAD_DIRS.images);
//         } else {
//             cb(null, UPLOAD_DIRS.documents);
//         }
//     },
//     filename: function (req, file, cb) {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        
//         // Add prefix based on upload type
//         const prefix = req.baseUrl.includes('chat') ? 'chat-' : '';
        
//         cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
//     }
// });

// const fileFilter = (req, file, cb) => {
//     // For images in posts
//     if (req.baseUrl.includes('posts') && !file.mimetype.startsWith('image/')) {
//         cb(new Error('Only images are allowed for posts'), false);
//         return;
//     }

//     // For chat attachments
//     if (req.baseUrl.includes('chat')) {
//         const chatAllowedTypes = [
//             'image/jpeg',
//             'image/png',
//             'image/gif',
//             'application/pdf',
//             'application/msword',
//             'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//             'text/plain',
//             'application/zip',
//             'application/x-zip-compressed'
//         ];

//         if (chatAllowedTypes.includes(file.mimetype)) {
//             cb(null, true);
//         } else {
//             cb(new Error('Invalid file type for chat. Allowed types: JPG, PNG, GIF, PDF, DOC, DOCX, TXT, ZIP'), false);
//         }
//         return;
//     }

//     // For other uploads (existing functionality)
//     const allowedTypes = [
//         'application/pdf',
//         'application/msword',
//         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//         'application/vnd.ms-powerpoint',
//         'application/vnd.openxmlformats-officedocument.presentationml.presentation',
//         'text/plain',
//         'image/jpeg',
//         'image/png'
//     ];

//     if (allowedTypes.includes(file.mimetype)) {
//         cb(null, true);
//     } else {
//         cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, and PNG files are allowed.'), false);
//     }
// };

// // File size limits based on upload type
// const getFileSize = (req) => {
//     if (req.baseUrl.includes('chat')) {
//         return 10 * 1024 * 1024; // 10MB for chat files
//     }
//     return 25 * 1024 * 1024; // 25MB for other files
// };

// // Create multer upload instance
// const upload = multer({
//     storage: storage,
//     fileFilter: fileFilter,
//     limits: {
//         fileSize: (req, file, cb) => {
//             return getFileSize(req);
//         }
//     }
// });

// // Helper function to get file URL
// const getFileUrl = (file) => {
//     if (!file) return null;
    
//     const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
//     return `${baseUrl}/${file.path.replace('public/', '')}`;
// };

// // Helper function to delete file
// const deleteFile = async (filePath) => {
//     try {
//         if (fs.existsSync(filePath)) {
//             await fs.promises.unlink(filePath);
//             return true;
//         }
//         return false;
//     } catch (error) {
//         console.error('Error deleting file:', error);
//         return false;
//     }
// };

// // Export all necessary functions and constants
// module.exports = {
//     upload,
//     UPLOAD_DIRS,
//     getFileUrl,
//     deleteFile
// };







const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define upload directory for different types
const UPLOAD_DIRS = {
    images: 'public/uploads/images',
    documents: 'public/uploads/documents',
    chat: {
        images: 'public/uploads/chat/images',
        files: 'public/uploads/chat/files'
    },
    default: 'public/uploads'
};

// Create directories if they don't exist
Object.values(UPLOAD_DIRS).forEach(dir => {
    if (typeof dir === 'string') {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } else {
        Object.values(dir).forEach(subDir => {
            if (!fs.existsSync(subDir)) {
                fs.mkdirSync(subDir, { recursive: true });
            }
        });
    }
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Handle chat uploads
        if (req.baseUrl.includes('chat')) {
            if (file.mimetype.startsWith('image/')) {
                cb(null, UPLOAD_DIRS.chat.images);
            } else {
                cb(null, UPLOAD_DIRS.chat.files);
            }
            return;
        }

        // Handle regular uploads
        if (file.mimetype.startsWith('image/')) {
            cb(null, UPLOAD_DIRS.images);
        } else {
            cb(null, UPLOAD_DIRS.documents);
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const prefix = req.baseUrl.includes('chat') ? 'chat-' : '';
        cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // For images in posts
    if (req.baseUrl.includes('posts') && !file.mimetype.startsWith('image/')) {
        cb(new Error('Only images are allowed for posts'), false);
        return;
    }

    // For chat uploads
    if (req.baseUrl.includes('chat')) {
        const chatAllowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];

        if (chatAllowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type for chat'), false);
        }
        return;
    }

    // For regular uploads
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'image/jpeg',
        'image/png'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, and PNG files are allowed.'), false);
    }
};

// Create multer instance
const uploadMiddleware = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: req => req.baseUrl.includes('chat') ? 10 * 1024 * 1024 : 25 * 1024 * 1024 // 10MB for chat, 25MB for others
    }
});

// Helper functions
const getFileUrl = (file) => {
    if (!file) return null;
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    return `${baseUrl}/${file.path.replace('public/', '')}`;
};

const deleteFile = async (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
};

// Export everything needed
module.exports = uploadMiddleware;
module.exports.getFileUrl = getFileUrl;
module.exports.deleteFile = deleteFile;
module.exports.UPLOAD_DIRS = UPLOAD_DIRS;