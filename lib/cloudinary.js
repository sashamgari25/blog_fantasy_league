import { createHash, randomUUID } from "node:crypto";

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const folder = process.env.CLOUDINARY_FOLDER || "ipl-fantasy-faceoff";

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
    folder
  };
}

export function isCloudinaryConfigured() {
  return Boolean(getCloudinaryConfig());
}

function signUploadParams(params, apiSecret) {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1")
    .update(`${serialized}${apiSecret}`)
    .digest("hex");
}

export async function uploadToCloudinary({ file, ownerSlug }) {
  const config = getCloudinaryConfig();
  if (!config) {
    throw new Error("Cloudinary is not configured.");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${ownerSlug}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const paramsToSign = {
    folder: `${config.folder}/${ownerSlug}`,
    public_id: publicId,
    timestamp
  };

  const signature = signUploadParams(paramsToSign, config.apiSecret);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", config.apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", paramsToSign.folder);
  formData.append("public_id", publicId);
  formData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
    method: "POST",
    body: formData
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Cloudinary upload failed.");
  }

  return payload.secure_url;
}
