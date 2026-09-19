const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

const isCloudinaryConfigured = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const normalizeCloudinaryUrl = (value) => {
  if (!value) return null;
  if (typeof value !== 'string') return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return value;
  return `/uploads/${value}`;
};

const uploadToCloudinary = async (filePath, folder = 'business-platform') => {
  if (!isCloudinaryConfigured() || !filePath) return null;

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });

    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload failed:', error.message);
    return null;
  }
};

const deleteCloudinaryAsset = async (imageValue) => {
  if (!imageValue || !isCloudinaryConfigured()) return;

  try {
    const publicId = typeof imageValue === 'string' ? imageValue.split('/').slice(-1)[0].split('.')[0] : null;
    if (!publicId) return;

    const matches = imageValue.match(/res\.cloudinary\.com\/[^/]+\/image\/upload\/(.+?)(?:\.[a-z0-9]+)?$/i);
    const realPublicId = matches ? matches[1] : publicId;
    await cloudinary.uploader.destroy(realPublicId);
  } catch (error) {
    console.error('Cloudinary delete failed:', error.message);
  }
};

const uploadImageFiles = async (files = [], folder = 'business-platform') => {
  const uploadedUrls = [];

  for (const file of files) {
    if (!file) continue;

    const uploadedUrl = await uploadToCloudinary(file.path, folder);
    if (uploadedUrl) {
      uploadedUrls.push(uploadedUrl);
    } else {
      uploadedUrls.push(file.filename);
    }

    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error('Temp file cleanup failed:', error.message);
      }
    }
  }

  return uploadedUrls;
};

const deleteStoredImage = async (imageValue) => {
  if (!imageValue) return;

  if (typeof imageValue === 'string' && /^https?:\/\//i.test(imageValue)) {
    await deleteCloudinaryAsset(imageValue);
    return;
  }

  const filePath = path.join(__dirname, '../../uploads', imageValue);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

module.exports = {
  isCloudinaryConfigured,
  normalizeCloudinaryUrl,
  uploadToCloudinary,
  uploadImageFiles,
  deleteCloudinaryAsset,
  deleteStoredImage,
};
