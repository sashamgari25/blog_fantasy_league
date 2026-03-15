import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((value) => value instanceof File);

  if (!files.length) {
    return Response.json({ error: "No files uploaded." }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const uploads = [];

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "post-images";

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return Response.json({ error: "Only image files are supported." }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const extension = path.extname(file.name) || ".png";
      const filename = `${session.slug}/${Date.now()}-${randomUUID()}${extension}`;

      const { error } = await supabase.storage.from(bucket).upload(filename, buffer, {
        contentType: file.type,
        upsert: false
      });

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
      const alt = path.basename(file.name, extension).replace(/[-_]+/g, " ");
      uploads.push({
        name: file.name,
        url: data.publicUrl,
        markdown: `![${alt}](${data.publicUrl})`
      });
    }

    return Response.json({ uploads });
  }

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return Response.json({ error: "Only image files are supported." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const extension = path.extname(file.name) || ".png";
    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const filepath = path.join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    const url = `/uploads/${filename}`;
    const alt = path.basename(file.name, extension).replace(/[-_]+/g, " ");
    uploads.push({
      name: file.name,
      url,
      markdown: `![${alt}](${url})`
    });
  }

  return Response.json({ uploads });
}
