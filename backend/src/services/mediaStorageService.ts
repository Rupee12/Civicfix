import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Express } from "express";
import type { MediaAsset } from "../types/issue.js";
import { env } from "../config/env.js";

const uploadDirectory = path.resolve(process.cwd(), "uploads");

export interface MediaStorageService {
  uploadImage(file: Express.Multer.File): Promise<MediaAsset>;
  uploadVideo(file: Express.Multer.File): Promise<MediaAsset>;
  deleteMedia(asset: MediaAsset): Promise<void>;
}

class LocalMediaStorageService implements MediaStorageService {
  private async upload(file: Express.Multer.File, folder: "images" | "videos"): Promise<MediaAsset> {
    const directory = path.join(uploadDirectory, folder);
    await mkdir(directory, { recursive: true });
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${randomUUID()}${extension}`;
    await writeFile(path.join(directory, filename), file.buffer);
    return { url: `/uploads/${folder}/${filename}`, mimeType: file.mimetype, originalName: file.originalname, size: file.size };
  }

  uploadImage(file: Express.Multer.File) { return this.upload(file, "images"); }
  uploadVideo(file: Express.Multer.File) { return this.upload(file, "videos"); }

  async deleteMedia(asset: MediaAsset) {
    await unlink(path.join(process.cwd(), asset.url.replace(/^\//, ""))).catch(() => undefined);
  }
}

class S3MediaStorageService implements MediaStorageService {
  private readonly client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: Boolean(env.S3_ENDPOINT),
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
  });

  private async upload(file: Express.Multer.File, folder: "images" | "videos"): Promise<MediaAsset> {
    const extension = path.extname(file.originalname).toLowerCase();
    const key = `uploads/${folder}/${randomUUID()}${extension}`;
    await this.client.send(new PutObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: "public, max-age=31536000, immutable",
    }));
    return { url: `${env.MEDIA_PUBLIC_BASE_URL!.replace(/\/+$/, "")}/${key}`, mimeType: file.mimetype, originalName: file.originalname, size: file.size };
  }

  uploadImage(file: Express.Multer.File) { return this.upload(file, "images"); }
  uploadVideo(file: Express.Multer.File) { return this.upload(file, "videos"); }

  async deleteMedia(asset: MediaAsset) {
    const base = env.MEDIA_PUBLIC_BASE_URL!.replace(/\/+$/, "");
    if (!asset.url.startsWith(`${base}/`)) return;
    await this.client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET!, Key: asset.url.slice(base.length + 1) }));
  }
}

export const mediaStorageService: MediaStorageService = env.MEDIA_STORAGE === "s3"
  ? new S3MediaStorageService()
  : new LocalMediaStorageService();