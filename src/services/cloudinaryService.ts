import { v2 as cloudinary } from 'cloudinary';
import { config } from 'dotenv';
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

export class CloudinaryService {
  static async uploadFiles(files: Array<{ name: string; url: string }>) {
    const uploadPromises = files.map((file) =>
      cloudinary.uploader.upload(file.url, { public_id: file.name })
    );
    const uploadedFiles = await Promise.all(uploadPromises);
    return uploadedFiles.map((uploadedFile) => ({
      name: uploadedFile.public_id,
      url: uploadedFile.secure_url,
    }));
  }
}
