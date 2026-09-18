import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Express } from "express";
import type { MediaAsset } from "../types/issue.js";

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

export const mediaStorageService: MediaStorageService = new LocalMediaStorageService();