import assert from "node:assert/strict";
import test from "node:test";
import type { UploadApiErrorResponse, UploadApiResponse } from "cloudinary";
import { PassThrough } from "node:stream";
import {
  cloudinaryUploadOptions,
  publicMedia,
  sanitizeCloudinaryError,
  uploadCloudinaryStream,
} from "./mediaStorageService.js";

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

test("Cloudinary image uploads use the image resource type and supported upload stream", async () => {
  let actualOptions: ReturnType<typeof cloudinaryUploadOptions> | undefined;
  const response = {
    secure_url: "https://res.cloudinary.com/demo/image/upload/photo.jpg",
    resource_type: "image",
    public_id: "civicfix/issues/images/photo",
  } as UploadApiResponse;

  const result = await uploadCloudinaryStream(
    Buffer.from("test image"),
    cloudinaryUploadOptions("issues", "images"),
    [],
    {
      upload_stream(options, callback) {
        actualOptions = options;
        const stream = new PassThrough();
        stream.resume();
        queueMicrotask(() => callback(undefined, response));
        return stream;
      },
    },
  );

  assert.equal(actualOptions?.resource_type, "image");
  assert.equal(actualOptions?.folder, "civicfix/issues/images");
  assert.equal(result, response);
});

test("Cloudinary 403 errors log sanitized provider details without secrets or filenames", async () => {
  const logged: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => logged.push(args.join(" "));

  try {
    await assert.rejects(
      uploadCloudinaryStream(
        Buffer.from("test image"),
        cloudinaryUploadOptions("issues", "images"),
        ["private-report-photo.jpg"],
        {
          upload_stream(_options, callback) {
            const stream = new PassThrough();
            stream.resume();
            queueMicrotask(() => callback({
              http_code: 403,
              name: "Error",
              message: "Upload denied for private-report-photo.jpg; api_key=key-secret signature sig-secret token=token-secret. See https://provider.example/private?api_secret=secret",
              request_id: "request-id-private",
            } as UploadApiErrorResponse));
            return stream;
          },
        },
      ),
      /Cloudinary upload failed with HTTP status 403/,
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(logged.length, 1);
  assert.match(logged[0], /"http_code":403/);
  assert.match(logged[0], /"name":"Error"/);
  assert.match(logged[0], /"message":"Upload denied for \[redacted\]; api_key=\[redacted\] signature=\[redacted\] token=\[redacted\] See \[redacted URL\]"/);
  for (const secret of ["private-report-photo.jpg", "key-secret", "sig-secret", "token-secret", "secret", "request-id-private"]) {
    assert.equal(logged[0].includes(secret), false);
  }
});

test("Cloudinary error sanitization rejects malformed names and out-of-range status codes", () => {
  assert.deepEqual(sanitizeCloudinaryError({
    http_code: 999,
    name: "Error with user data",
    message: "Provider unavailable",
  }), {
    name: "CloudinaryError",
    message: "Provider unavailable",
  });
});
