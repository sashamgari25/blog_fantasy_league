import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";

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
