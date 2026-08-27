const cloudinary = require('../config/cloudinary');

exports.createUploadSignature = (req, res, next) => {
    try {
        const resourceType =
            req.body.resourceType === 'image'
                ? 'image'
                : 'raw';

        const timestamp = Math.round(
            new Date().getTime() / 1000
        );

        const folder =
            resourceType === 'image'
                ? 'notevault/profiles'
                : 'notevault/pdfs';

        const paramsToSign = {
            timestamp,
            folder
        };

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET
        );

        res.json({
            success: true,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
            timestamp,
            signature,
            folder
        });
    } catch (err) {
        next(err);
    }
};
