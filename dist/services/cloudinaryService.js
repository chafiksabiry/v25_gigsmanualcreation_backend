"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryService = void 0;
const cloudinary_1 = require("cloudinary");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});
class CloudinaryService {
    static async uploadFiles(files) {
        const uploadPromises = files.map((file) => cloudinary_1.v2.uploader.upload(file.url, { public_id: file.name }));
        const uploadedFiles = await Promise.all(uploadPromises);
        return uploadedFiles.map((uploadedFile) => ({
            name: uploadedFile.public_id,
            url: uploadedFile.secure_url,
        }));
    }
}
exports.CloudinaryService = CloudinaryService;
