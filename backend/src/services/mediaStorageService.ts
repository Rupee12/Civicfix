import {
  v2 as cloudinary,
  type UploadApiErrorResponse,
  type UploadApiOptions,
  type UploadApiResponse,
} from "cloudinary";
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

type CloudinaryStreamUploader = {
  upload_stream(
    options: UploadApiOptions,
    callback: (error?: UploadApiErrorResponse, response?: UploadApiResponse) => void,
  ): NodeJS.WritableStream;
};

export function cloudinaryUploadOptions(folder: MediaFolder, kind: MediaKind): UploadApiOptions {
  return {
    folder: `civicfix/${folder}/${kind}`,
    resource_type: kind === "images" ? "image" : "video",
    use_filename: false,
    unique_filename: true,
    overwrite: false,
  };
}

export function sanitizeCloudinaryError(
  error: Partial<UploadApiErrorResponse>,
  sensitiveValues: string[] = [],
) {
  const safeName = typeof error.name === "string" && /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(error.name)
    ? error.name
    : "CloudinaryError";
  const httpCode = typeof error.http_code === "number"
    && Number.isInteger(error.http_code)
    && error.http_code >= 100
    && error.http_code <= 599
    ? error.http_code
    : undefined;
  let message = typeof error.message === "string" ? error.message : "";

  for (const value of sensitiveValues) {
    if (value) message = message.replaceAll(value, "[redacted]");
  }

  message = message
    .replace(/https?:\/\/\S+/gi, "[redacted URL]")
    .replace(/\b(api[_ -]?key|api[_ -]?secret|signature|token|authorization|password)\b(?:\s*[:=]\s*|\s+)\S+/gi, "$1=[redacted]")
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, "[redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .slice(0, 300);

  return {
    ...(httpCode === undefined ? {} : { http_code: httpCode }),
    name: safeName,
    message: message || "No provider message available",
  };
}

export function uploadCloudinaryStream(
  buffer: Buffer,
  options: UploadApiOptions,
  sensitiveValues: string[] = [],
  uploader: CloudinaryStreamUploader = cloudinary.uploader,
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = uploader.upload_stream(options, (error, response) => {
      if (error) {
        const providerError = sanitizeCloudinaryError(error, sensitiveValues);
        console.error(`[Cloudinary upload] ${JSON.stringify(providerError)}`);
        reject(new Error(providerError.http_code
          ? `Cloudinary upload failed with HTTP status ${providerError.http_code}`
          : "Cloudinary upload failed"));
        return;
      }
      if (!response) {
        reject(new Error("Cloudinary upload returned no response"));
        return;
      }
      resolve(response);
    });

    Readable.from([buffer]).pipe(uploadStream);
  });
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
    const result = await uploadCloudinaryStream(
      file.buffer,
      cloudinaryUploadOptions(folder, kind),
      [file.originalname],
    );

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
