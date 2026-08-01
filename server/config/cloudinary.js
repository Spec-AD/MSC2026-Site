const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'msc2026_profiles',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 1000, crop: 'limit' }]
  }
});

const multer = require('multer');
const upload = multer({ storage });

const storeProductStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'msc2026_store_products',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 1600, height: 1200, crop: 'limit', quality: 'auto' }]
  }
});

const storeProductUpload = multer({
  storage: storeProductStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype?.startsWith('image/')) return callback(new Error('只能上传图片文件'));
    callback(null, true);
  }
});

module.exports = { cloudinary, upload, storeProductUpload };
