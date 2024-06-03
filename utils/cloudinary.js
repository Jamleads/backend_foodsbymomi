require("dotenv").config({ path: "./config/config.env" });
// Require the cloudinary library
const cloudinary = require("cloudinary").v2;

// Return "https" URLs by setting secure: true
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

module.exports = class Cloudinary {
  async upload(data) {
    try {
      const imageInfo = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream((error, uploadResult) => {
            if (error) {
              console.log(error);
              return reject(error);
            }
            resolve(uploadResult);
          })
          .end(data);
      });

      console.log("Image uploaded successfully!");
      return imageInfo;
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  }

  async delete(imageName) {
    try {
      await cloudinary.uploader.destroy(imageName);
    } catch (err) {
      console.error("Error deleting image:", err);
    }
  }
};
