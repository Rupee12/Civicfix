import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import type { Express } from "express";
import type { MediaAsset } from "../types/issue.js";
import { env } from "../config/env.js";

const uploadDirectory = path.resolve(process.cwd(), "uploads");
type MediaFolder = "issues" | "resolutions";
type MediaKind = "images" | "videos";

export interface MediaStorageService {
  uploadImage(file: Express.Multer.File, folder?: MediaFolder): Promise<MediaAsset>;
  uploadVideo(file: Express.Multer.File, folder?: MediaFolder): Promise<MediaAsset>;
  deleteMedia(asset: MediaAsset): Promise<void>;
}

function publicAsset({ providerId: _providerId, ...asset }: MediaAsset): Omit<MediaAsset, "providerId"> {
  return asset;
}

export function publicMedia(media: { photos: MediaAsset[]; videos: MediaAsset[] }) {
  return { photos: media.photos.map(publicAsset), videos: media.videos.map(publicAsset) };
}

class LocalMediaStorageService implements MediaStorageService {
  private async upload(file: Express.Multer.File, kind: MediaKind, folder: MediaFolder): Promise<MediaAsset> {
    const directory = path.join(uploadDirectory, folder, kind);
    await mkdir(directory, { recursive: true });
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${randomUUID()}${extension}`;
    await writeFile(path.join(directory, filename), file.buffer);
    return { url: `/uploads/${folder}/${kind}/${filename}`, mimeType: file.mimetype, originalName: file.originalname, size: file.size };
  }

  uploadImage(file: Express.Multer.File, folder: MediaFolder = "issues") { return this.upload(file, "images", folder); }
  uploadVideo(file: Express.Multer.File, folder: MediaFolder = "issues") { return this.upload(file, "videos", folder); }

  async deleteMedia(asset: MediaAsset) {
    if (!asset.url.startsWith("/uploads/")) return;
    try {
      await unlink(path.join(process.cwd(), asset.url.slice(1)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

class CloudinaryMediaStorageService implements MediaStorageService {
  constructor() {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  private async upload(file: Express.Multer.File, kind: MediaKind, folder: MediaFolder): Promise<MediaAsset> {
    const resourceType = kind === "images" ? "image" : "video";
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `civicfix/${folder}/${kind}`,
          resource_type: resourceType,
          use_filename: false,
          unique_filename: true,
          overwrite: false,
        },
        (error, response) => {
          if (error) reject(new Error(`Cloudinary upload failed: ${error.message}`));
          else if (!response) reject(new Error("Cloudinary upload returned no response"));
          else resolve(response);
        },
      );
      Readable.from([file.buffer]).pipe(uploadStream);
    });

    return {
      url: result.secure_url,
      mimeType: file.mimetype,
      originalName: file.originalname,
      size: file.size,
      providerId: `${result.resource_type}:${result.public_id}`,
    };
  }

  uploadImage(file: Express.Multer.File, folder: MediaFolder = "issues") { return this.upload(file, "images", folder); }
  uploadVideo(file: Express.Multer.File, folder: MediaFolder = "issues") { return this.upload(file, "videos", folder); }

  async deleteMedia(asset: MediaAsset) {
    if (!asset.providerId?.includes(":")) return;
    const [resourceType, publicId] = asset.providerId.split(/:(.*)/s).slice(0, 2);
    if (!publicId || (resourceType !== "image" && resourceType !== "video")) return;
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(`Cloudinary deletion failed: ${result.result}`);
    }
  }
}

export const mediaStorageService: MediaStorageService = env.MEDIA_STORAGE === "cloudinary"
  ? new CloudinaryMediaStorageService()
  : new LocalMediaStorageService();
