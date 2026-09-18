import multer from "multer";
import { ApiError } from "../utils/apiError.js";

export const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export const videoTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);

const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 6, fileSize: 20 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (file.fieldname === "photos" && imageTypes.has(file.mimetype)) { callback(null, true); return; }
    if (file.fieldname === "videos" && videoTypes.has(file.mimetype)) { callback(null, true); return; }
    callback(new ApiError(400, "Unsupported media type", "INVALID_MEDIA_TYPE"));
  },
}).fields([{ name: "photos", maxCount: 5 }, { name: "videos", maxCount: 1 }]);

export const issueUpload = mediaUpload;
export const resolutionUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 6, fileSize: 20 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (file.fieldname === "afterPhotos" && imageTypes.has(file.mimetype)) { callback(null, true); return; }
    if (file.fieldname === "afterVideos" && videoTypes.has(file.mimetype)) { callback(null, true); return; }
    callback(new ApiError(400, "Unsupported resolution media type", "INVALID_MEDIA_TYPE"));
  },
}).fields([{ name: "afterPhotos", maxCount: 5 }, { name: "afterVideos", maxCount: 1 }]);