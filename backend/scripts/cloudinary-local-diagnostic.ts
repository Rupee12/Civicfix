import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { config as loadDotEnv } from "dotenv";
import {
  v2 as cloudinary,
  type UploadApiOptions,
  type UploadApiResponse,
} from "cloudinary";

const diagnosticEnvFile = process.env.CLOUDINARY_DIAGNOSTIC_ENV_FILE;
if (diagnosticEnvFile) loadDotEnv({ path: resolve(diagnosticEnvFile) });

const confirmationValue = "I_APPROVE_ONE_SYNTHETIC_UPLOAD";
const uploadConfirmed = process.argv.includes("--confirm-live-upload")
  && process.env.CLOUDINARY_DIAGNOSTIC_APPROVAL === confirmationValue;
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
const credentialsPresent = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

let configurationMatches = false;
if (credentialsPresent) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
    debug: true,
  });
  const configured = cloudinary.config();
  configurationMatches = configured.cloud_name === CLOUDINARY_CLOUD_NAME
    && configured.api_key === CLOUDINARY_API_KEY
    && configured.api_secret === CLOUDINARY_API_SECRET
    && configured.debug === true;
}

function safeErrorDetails(error: unknown) {
  const details = typeof error === "object" && error !== null
    ? error as Record<string, unknown>
    : {};
  const errorName = typeof details.name === "string"
    && /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(details.name)
    ? details.name
    : "CloudinaryError";
  const requestId = typeof details.request_id === "string"
    && /^[A-Za-z0-9._:-]{1,128}$/.test(details.request_id)
    ? details.request_id
    : undefined;
  const rawMessage = typeof details.message === "string" ? details.message : "";
  const message = /^Server returned unexpected status code - \d{3}$/.test(rawMessage)
    ? rawMessage
    : undefined;
  const httpCode = typeof details.http_code === "number"
    && Number.isInteger(details.http_code)
    && details.http_code >= 100
    && details.http_code <= 599
    ? details.http_code
    : undefined;

  return {
    name: errorName,
    ...(httpCode === undefined ? {} : { http_code: httpCode }),
    ...(requestId === undefined ? {} : { request_id: requestId }),
    ...(message ? { message } : {}),
  };
}

if (process.argv.includes("--verify-config")) {
  console.log(JSON.stringify({
    credentialValuesPresent: credentialsPresent,
    sdkConfigurationMatchesEnvironment: configurationMatches,
  }));
  if (!credentialsPresent || !configurationMatches) process.exitCode = 2;
} else if (!uploadConfirmed) {
  console.error("Upload not run. Both explicit diagnostic confirmation flags are required.");
  process.exitCode = 2;
} else if (!credentialsPresent || !configurationMatches) {
  console.error("Upload not run. Cloudinary credentials are missing or SDK configuration verification failed.");
  process.exitCode = 2;
} else {
    const jpeg = Buffer.from(
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD0CiiigD//2Q==",
      "base64",
    );
    const folder = `civicfix/diagnostics/${randomUUID()}`;
    const options: UploadApiOptions = {
      folder,
      public_id: "probe",
      resource_type: "image",
      use_filename: false,
      unique_filename: false,
      overwrite: false,
    };

    let uploaded: UploadApiResponse | undefined;
    try {
      uploaded = await new Promise<UploadApiResponse>((resolveUpload, rejectUpload) => {
        const uploadStream = cloudinary.uploader.upload_stream(options, (error, response) => {
          if (error) {
            rejectUpload(error);
          } else if (response) {
            resolveUpload(response);
          } else {
            rejectUpload(new Error("Cloudinary upload returned no response"));
          }
        });
        Readable.from([jpeg]).pipe(uploadStream);
      });
    } catch (error: unknown) {
      console.error(JSON.stringify({ upload: "failed", ...safeErrorDetails(error) }));
      process.exitCode = 1;
    }

    if (uploaded) {
      try {
        const deletion = await cloudinary.uploader.destroy(uploaded.public_id, {
          resource_type: "image",
        });
        const cleanupSucceeded = deletion.result === "ok" || deletion.result === "not found";
        console.log(JSON.stringify({
          upload: "succeeded",
          cleanup: cleanupSucceeded ? "complete" : "failed",
        }));
        if (!cleanupSucceeded) process.exitCode = 1;
      } catch (error: unknown) {
        console.error(JSON.stringify({
          upload: "succeeded",
          cleanup: "failed",
          ...safeErrorDetails(error),
        }));
        process.exitCode = 1;
    }
  }
}
