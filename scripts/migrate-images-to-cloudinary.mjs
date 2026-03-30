import { readFileSync } from "fs";
import path from "path";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, ".env.local");

function loadLocalEnv() {
  const raw = readFileSync(envPath, "utf8");
  raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .forEach((line) => {
      const separatorIndex = line.indexOf("=");
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSupabasePublicPrefix(url, bucket) {
  return `${url}/storage/v1/object/public/${bucket}/`;
}

async function uploadBufferToCloudinary({ cloudName, apiKey, apiSecret, folder, ownerSlug, buffer, filename, contentType }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${ownerSlug}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const paramsToSign = {
    folder: `${folder}/${ownerSlug}`,
    public_id: publicId,
    timestamp
  };

  const signature = signUploadParams(paramsToSign, apiSecret);
  const formData = new FormData();
  const extension = path.extname(filename) || ".png";
  const finalName = filename.endsWith(extension) ? filename : `${filename}${extension}`;

  formData.append("file", new Blob([buffer], { type: contentType || "application/octet-stream" }), finalName);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", paramsToSign.folder);
  formData.append("public_id", publicId);
  formData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Cloudinary upload failed.");
  }

  return payload.secure_url;
}

async function main() {
  loadLocalEnv();

  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "post-images";
  const cloudName = requireEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = requireEnv("CLOUDINARY_API_KEY");
  const apiSecret = requireEnv("CLOUDINARY_API_SECRET");
  const folder = process.env.CLOUDINARY_FOLDER || "ipl-fantasy-faceoff";
  const supabasePrefix = getSupabasePublicPrefix(supabaseUrl, bucket);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data: posts, error } = await supabase.from("posts").select("id, slug, author_slug, content, image_url");
  if (error) {
    throw error;
  }

  const allUrls = new Set();
  const markdownImagePattern = /!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/g;

  for (const post of posts || []) {
    if (post.image_url?.startsWith(supabasePrefix)) {
      allUrls.add(post.image_url);
    }

    const matches = post.content?.matchAll(markdownImagePattern) || [];
    for (const match of matches) {
      const url = match[1];
      if (url.startsWith(supabasePrefix)) {
        allUrls.add(url);
      }
    }
  }

  if (!allUrls.size) {
    console.log("No Supabase-hosted image URLs found in posts.");
    return;
  }

  const migrated = new Map();

  for (const oldUrl of allUrls) {
    const objectPath = oldUrl.slice(supabasePrefix.length);
    const { data: fileData, error: downloadError } = await supabase.storage.from(bucket).download(objectPath);
    if (downloadError) {
      throw downloadError;
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const filename = path.basename(objectPath);
    const ownerSlug = objectPath.split("/")[0] || "uploads";
    const newUrl = await uploadBufferToCloudinary({
      cloudName,
      apiKey,
      apiSecret,
      folder,
      ownerSlug,
      buffer: Buffer.from(arrayBuffer),
      filename,
      contentType: fileData.type
    });

    migrated.set(oldUrl, newUrl);
    console.log(`Migrated ${objectPath}`);
  }

  for (const post of posts || []) {
    let nextImageUrl = post.image_url || "";
    let nextContent = post.content || "";
    let changed = false;

    for (const [oldUrl, newUrl] of migrated.entries()) {
      if (nextImageUrl === oldUrl) {
        nextImageUrl = newUrl;
        changed = true;
      }

      if (nextContent.includes(oldUrl)) {
        nextContent = nextContent.replace(new RegExp(escapeRegExp(oldUrl), "g"), newUrl);
        changed = true;
      }
    }

    if (!changed) {
      continue;
    }

    const { error: updateError } = await supabase
      .from("posts")
      .update({
        image_url: nextImageUrl,
        content: nextContent
      })
      .eq("id", post.id);

    if (updateError) {
      throw updateError;
    }
  }

  console.log(`Migration complete. Moved ${migrated.size} image URL(s) to Cloudinary.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
