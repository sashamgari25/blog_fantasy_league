"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addPost, deletePost, getLeagueData, getPostBySlug, updateLeagueOverview, updatePost } from "@/lib/db";
import { authenticateUser, createSession, destroySession, requireSession } from "@/lib/auth";

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function buildUniqueSlug(title) {
  const base = slugify(title);
  let candidate = base;
  let index = 2;

  while (await getPostBySlug(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  return candidate;
}

export async function loginAction(_prevState, formData) {
  const author = formData.get("author")?.toString().trim() || "";
  const password = formData.get("password")?.toString() || "";

  const user = await authenticateUser(author, password);
  if (!user) {
    return { error: "Incorrect username or password." };
  }

  await createSession(user);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function createPostAction(_prevState, formData) {
  const session = await requireSession();
  const data = await getLeagueData();
  const title = formData.get("title")?.toString().trim() || "";
  const summary = formData.get("summary")?.toString().trim() || "";
  const content = formData.get("content")?.toString().trim() || "";
  const result = formData.get("result")?.toString().trim() || "";
  const imageUrl = formData.get("image-url")?.toString().trim() || "";
  const tags = formData
    .get("tags")
    ?.toString()
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean) || [];

  if (!title || !summary || !content || !result) {
    return { error: "Fill in the title, summary, content, and result." };
  }

  const author = Object.values(data.players).find((player) => player.slug === session.slug);
  if (!author) {
    return { error: "Could not match the logged-in author to a player profile." };
  }

  const post = {
    id: `post-${Date.now()}`,
    slug: await buildUniqueSlug(title),
    authorSlug: author.slug,
    title,
    date: new Date().toISOString().slice(0, 10),
    result,
    summary,
    content,
    imageUrl,
    tags
  };

  await addPost(post);
  revalidatePath("/");
  revalidatePath(`/history/${author.slug}`);
  revalidatePath(`/posts/${post.slug}`);

  return { success: `Published "${title}".` };
}

export async function updateOverviewAction(_prevState, formData) {
  await requireSession();
  const data = await getLeagueData();

  const nextPlayers = Object.fromEntries(
    Object.entries(data.players).map(([key, player]) => [
      key,
      {
        slug: player.slug,
        name: formData.get(`${player.slug}-name`)?.toString().trim() || player.name,
        style: formData.get(`${player.slug}-style`)?.toString().trim() || player.style,
        bio: formData.get(`${player.slug}-bio`)?.toString().trim() || player.bio,
        teamName: formData.get(`${player.slug}-team-name`)?.toString().trim() || player.teamName,
        totalPoints: Number(formData.get(`${player.slug}-points`) || player.totalPoints),
        captain: formData.get(`${player.slug}-captain`)?.toString().trim() || player.captain,
        summary: formData.get(`${player.slug}-summary`)?.toString().trim() || player.summary,
        team: (formData.get(`${player.slug}-team`)?.toString() || "")
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean)
          .map((line) => {
            const [name, role] = line.split("|").map((part) => part.trim());
            return {
              name,
              role: role || "Player"
            };
          })
      }
    ])
  );

  await updateLeagueOverview({
    fixture: formData.get("fixture")?.toString().trim() || data.fixture,
    journal: {
      date: formData.get("journal-date")?.toString().trim() || data.journal.date
    },
    players: nextPlayers
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  Object.values(data.players).forEach((player) => revalidatePath(`/history/${player.slug}`));

  return { success: "Updated the main rivalry dashboard." };
}

export async function updatePostAction(_prevState, formData) {
  await requireSession();

  const postId = formData.get("post-id")?.toString().trim() || "";
  const originalSlug = formData.get("original-slug")?.toString().trim() || "";
  const title = formData.get("title")?.toString().trim() || "";
  const date = formData.get("date")?.toString().trim() || "";
  const result = formData.get("result")?.toString().trim() || "";
  const summary = formData.get("summary")?.toString().trim() || "";
  const content = formData.get("content")?.toString().trim() || "";
  const imageUrl = formData.get("image-url")?.toString().trim() || "";
  const tags = formData
    .get("tags")
    ?.toString()
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean) || [];

  if (!postId || !title || !date || !result || !summary || !content) {
    return { error: "Fill in all post fields before saving." };
  }

  const nextSlug = originalSlug === slugify(title) ? originalSlug : await buildUniqueSlug(title);
  const updated = await updatePost(postId, {
    slug: nextSlug,
    title,
    date,
    result,
    summary,
    content,
    imageUrl,
    tags
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath(`/posts/${originalSlug}`);
  revalidatePath(`/posts/${updated.slug}`);
  revalidatePath(`/history/${updated.author_slug}`);

  return { success: `Updated "${title}".` };
}

export async function deletePostAction(_prevState, formData) {
  await requireSession();

  const postId = formData.get("post-id")?.toString().trim() || "";
  if (!postId) {
    return { error: "Missing post id." };
  }

  const deleted = await deletePost(postId);
  if (!deleted) {
    return { error: "Post not found." };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath(`/posts/${deleted.slug}`);
  revalidatePath(`/history/${deleted.author_slug}`);

  return { success: "Post deleted." };
}
