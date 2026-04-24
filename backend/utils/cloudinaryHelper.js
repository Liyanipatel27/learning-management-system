const cloudinary = require('cloudinary').v2;

// Assuming Cloudinary is already configured in server.js or a config file that sets process.env
// But to be safe, we can import the config if needed. 
// However, typically cloudinary singleton is configured once.
// If not, we might need to require the config. 
// Let's assume standard setup: require('cloudinary').v2 is enough if configured elsewhere.

const deleteFile = async (fileUrl) => {
    if (!fileUrl) return;

    try {
        // Extract public_id from URL
        // Example: https://res.cloudinary.com/cloudname/image/upload/v12345678/folder/filename.jpg
        // or: https://res.cloudinary.com/cloudname/raw/upload/v12345678/folder/filename.pdf

        const urlParts = fileUrl.split('/');
        const filenameWithParams = urlParts.pop(); // filename.jpg or filename.pdf
        const versionOrFolder = urlParts.pop(); // v12345678 or folder name

        // We need the public_id which might include the folder path if one exists after 'upload/'
        // A more robust way is to split by 'upload/'

        const splitUrl = fileUrl.split('/upload/');
        if (splitUrl.length < 2) return; // Not a standard Cloudinary upload URL

        const pathAfterUpload = splitUrl[1]; // v12356/folder/filename.ext or folder/filename.ext

        // Remove version prefix if present (starts with v and numbers followed by /)
        let publicIdWithExt = pathAfterUpload;
        if (pathAfterUpload.match(/^v\d+\//)) {
            publicIdWithExt = pathAfterUpload.replace(/^v\d+\//, '');
        }

        // Remove extension
        const parts = publicIdWithExt.split('.');
        parts.pop();
        const publicId = parts.join('.');

        console.log(`[Cloudinary] Attempting to delete: ${publicId}`);

        // Try deleting as image first (default)
        let result = await cloudinary.uploader.destroy(publicId);

        if (result.result !== 'ok') {
            // Try as raw (for PDFs, docs, etc)
            console.log(`[Cloudinary] Image delete failed/not found, trying raw resource type...`);
            result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
        }

        if (result.result !== 'ok') {
            // Try as video (for videos)
            console.log(`[Cloudinary] Raw delete failed, trying video resource type...`);
            result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
        }

        console.log(`[Cloudinary] Delete Result for ${publicId}:`, result);
        return result;

    } catch (error) {
        console.error('[Cloudinary] Deletion error:', error);
        // We don't throw here to prevent blocking main deletion flow
    }
};

module.exports = { deleteFile };
