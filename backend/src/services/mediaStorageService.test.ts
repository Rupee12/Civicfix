import assert from "node:assert/strict";
import test from "node:test";
import { publicMedia } from "./mediaStorageService.js";

test("publicMedia preserves media URLs while hiding provider identifiers", () => {
  const media = publicMedia({
    photos: [{ url: "https://res.cloudinary.com/demo/image/upload/v1/photo.jpg", mimeType: "image/jpeg", originalName: "photo.jpg", size: 123, providerId: "image:civicfix/issues/images/photo" }],
    videos: [{ url: "https://legacy.example/video.mp4", mimeType: "video/mp4", originalName: "video.mp4", size: 456 }],
  });

  assert.deepEqual(media, {
    photos: [{ url: "https://res.cloudinary.com/demo/image/upload/v1/photo.jpg", mimeType: "image/jpeg", originalName: "photo.jpg", size: 123 }],
    videos: [{ url: "https://legacy.example/video.mp4", mimeType: "video/mp4", originalName: "video.mp4", size: 456 }],
  });
});
