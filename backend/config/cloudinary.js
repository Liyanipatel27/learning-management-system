const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        console.log('Cloudinary Storage evaluating file:', file.originalname, file.mimetype);
        const isRaw = file.mimetype === 'text/plain' || file.mimetype.includes('word') || file.mimetype.includes('msword');
        return {
            folder: 'lms-uploads',
            resource_type: isRaw ? 'raw' : 'auto',
            public_id: file.originalname.split('.')[0] + Date.now(),
            // allowed_formats: ['jpg', 'png', 'pdf', 'mp4', 'mkv', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'], // Removed to let Cloudinary handle via resource_type
        };
    },
});

module.exports = {
    cloudinary,
    storage
};
