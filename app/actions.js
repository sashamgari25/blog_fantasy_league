"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addComment,
  addNotifications,
  addPost,
  createReaderAccount,
  deleteComment,
  deletePost,
  getAuthors,
  getCommentById,
  getLeagueData,
  getUsersByUsernames,
  getPostBySlug,
  setPostLike,
  toggleCommentLike,
  togglePostLike,
  updateLeagueOverview,
  updatePost
} from "@/lib/db";
import { authenticateReader, authenticateUser, createSession, destroySession, getSession, requireAuthorSession } from "@/lib/auth";

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

function extractMentionUsernames(value) {
  const matches = value.match(/(^|\s)@([a-z0-9_]+)/gi) || [];
  return [...new Set(matches.map((match) => match.trim().slice(1).toLowerCase()))];
}

function summarizeComment(value) {
  return value.length > 120 ? `${value.slice(0, 117)}...` : value;
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

export async function readerLoginAction(_prevState, formData) {
  const username = formData.get("username")?.toString().trim().toLowerCase() || "";
  const password = formData.get("password")?.toString() || "";

  const user = await authenticateReader(username, password);
  if (!user) {
    return { error: "Incorrect username or password." };
  }

  await createSession(user);
  redirect("/");
}

export async function readerSignupAction(_prevState, formData) {
  const name = formData.get("name")?.toString().trim() || "";
  const username = formData.get("username")?.toString().trim().toLowerCase() || "";
  const email = formData.get("email")?.toString().trim() || "";
  const password = formData.get("password")?.toString() || "";

  if (!name || !username || !password) {
    return { error: "Fill in your display name, username, and password." };
  }

  try {
    const user = await createReaderAccount({ name, username, email, password });
    await createSession(user);
    redirect("/");
  } catch (error) {
    return { error: error.message || "Could not create your reader account." };
  }
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function createPostAction(_prevState, formData) {
  const session = await requireAuthorSession();
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

export async function updateSharedOverviewAction(_prevState, formData) {
  await requireAuthorSession();
  const data = await getLeagueData();

  await updateLeagueOverview({
    fixture: formData.get("fixture")?.toString().trim() || data.fixture,
    journal: {
      date: formData.get("journal-date")?.toString().trim() || data.journal.date
    },
    players: data.players
  });

  revalidatePath("/");
  revalidatePath("/dashboard");

  return { success: "Updated the shared match details." };
}

export async function updateAuthorOverviewAction(_prevState, formData) {
  const session = await requireAuthorSession();
  const data = await getLeagueData();
  const currentPlayer = Object.values(data.players).find((player) => player.slug === session.slug);

  if (!currentPlayer) {
    return { error: "Could not find your author profile." };
  }

  const nextPlayers = Object.fromEntries(
    Object.entries(data.players).map(([key, player]) => [
      key,
      player.slug === currentPlayer.slug
        ? {
            slug: player.slug,
            name: formData.get("name")?.toString().trim() || player.name,
            style: formData.get("style")?.toString().trim() || player.style,
            bio: formData.get("bio")?.toString().trim() || player.bio,
            teamName: formData.get("team-name")?.toString().trim() || player.teamName,
            totalPoints: Number(formData.get("points") || player.totalPoints),
            captain: formData.get("captain")?.toString().trim() || player.captain,
            summary: formData.get("summary")?.toString().trim() || player.summary,
            team: (formData.get("team")?.toString() || "")
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
        : player
    ])
  );

  await updateLeagueOverview({
    fixture: data.fixture,
    journal: data.journal,
    players: nextPlayers
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath(`/history/${currentPlayer.slug}`);

  return { success: `Updated ${currentPlayer.name}'s side of the rivalry.` };
}

export async function updatePostAction(_prevState, formData) {
  const session = await requireAuthorSession();

  const postId = formData.get("post-id")?.toString().trim() || "";
  const originalSlug = formData.get("original-slug")?.toString().trim() || "";
  const title = formData.get("title")?.toString().trim() || "";
  const date = formData.get("date")?.toString().trim() || "";
  const result = formData.get("result")?.toString().trim() || "";
  const summary = formData.get("summary")?.toString().trim() || "";
  const content = formData.get("content")?.toString().trim() || "";
  const imageUrl = formData.get("image-url")?.toString().trim() || "";
  const pinned = formData.get("pinned") === "on";
  const tags = formData
    .get("tags")
    ?.toString()
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean) || [];

  if (!postId || !title || !date || !result || !summary || !content) {
    return { error: "Fill in all post fields before saving." };
  }

  const existing = await getPostBySlug(originalSlug);
  if (!existing) {
    return { error: "Post not found." };
  }

  if (pinned && existing.authorSlug !== session.slug) {
    return { error: "You can only pin your own posts." };
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
      pinned,
      tags
    }).catch((error) => {
      const message = String(error?.message || error || "");
      if (message.toLowerCase().includes("pinned")) {
        return null;
      }

      throw error;
    });

  if (!updated) {
    return { error: "Pinning is not available yet because the latest database schema has not been applied. Please re-run supabase/schema.sql first." };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath(`/posts/${originalSlug}`);
  revalidatePath(`/posts/${updated.slug}`);
  revalidatePath(`/history/${updated.author_slug}`);

  return { success: pinned ? `Updated "${title}" and pinned it to the archive top slot.` : `Updated "${title}".` };
}

export async function deletePostAction(_prevState, formData) {
  await requireAuthorSession();

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

export async function deleteCommentAction(formData) {
  await requireAuthorSession();

  const commentId = formData.get("comment-id")?.toString().trim() || "";
  const postSlug = formData.get("post-slug")?.toString().trim() || "";

  if (!commentId || !postSlug) {
    return;
  }

  await deleteComment(commentId);

  revalidatePath(`/posts/${postSlug}`);
  revalidatePath("/inbox");
}

export async function togglePostLikeAction(_prevState, formData) {
  const session = await getSession();
  if (!session) {
    return { error: "Sign in to like posts." };
  }

  const postSlug = formData.get("post-slug")?.toString().trim() || "";
  const desiredLikedRaw = formData.get("desired-liked")?.toString().trim();
  if (!postSlug) {
    return { error: "Missing post." };
  }

  const nextState =
    desiredLikedRaw === "true" || desiredLikedRaw === "false"
      ? await setPostLike(postSlug, session.slug, desiredLikedRaw === "true")
      : await togglePostLike(postSlug, session.slug);
  revalidatePath(`/posts/${postSlug}`);
  return { ...nextState };
}

export async function toggleCommentLikeAction(_prevState, formData) {
  const session = await getSession();
  if (!session) {
    return { error: "Sign in to like comments." };
  }

  const commentId = formData.get("comment-id")?.toString().trim() || "";
  const postSlug = formData.get("post-slug")?.toString().trim() || "";
  if (!commentId || !postSlug) {
    return { error: "Missing comment." };
  }

  const nextState = await toggleCommentLike(commentId, session.slug);
  revalidatePath(`/posts/${postSlug}`);
  return { commentId, ...nextState };
}

export async function addCommentAction(_prevState, formData) {
  const postSlug = formData.get("post-slug")?.toString().trim() || "";
  const body = formData.get("body")?.toString().trim() || "";
  const parentCommentId = formData.get("parent-comment-id")?.toString().trim() || "";
  const session = await getSession();

  if (!postSlug || !body) {
    return { error: "Write a comment before posting." };
  }

  const authorName = session ? session.author : "Guest";
  const authorRole = session?.role || "guest";
  const authorUsername = session?.username || (session?.role === "author" ? session.slug : null);

  let parentComment = null;
  if (parentCommentId) {
    parentComment = await getCommentById(parentCommentId);
    if (!parentComment || parentComment.postSlug !== postSlug) {
      return { error: "Could not attach that reply to the selected comment." };
    }
  }

  const commentId = `comment-${Date.now()}`;

  await addComment({
    id: commentId,
    postSlug,
    readerSlug: session?.slug || null,
    parentCommentId: parentCommentId || null,
    authorUsername,
    authorRole,
    authorName,
    body,
    createdAt: new Date().toISOString()
  });

  const mentionUsernames = extractMentionUsernames(body);
  const mentionedUsers = mentionUsernames.length ? await getUsersByUsernames(mentionUsernames) : [];
  const notifications = [];
  const actorUsername = authorUsername;
  const createdAt = new Date().toISOString();
  const commentSummary = summarizeComment(body);
  const authors = await getAuthors();
  const authorRecipientSlugs = new Set(authors.map((author) => author.slug));

  authorRecipientSlugs.forEach((recipientSlug) => {
    notifications.push({
      id: `notif-${commentId}-${recipientSlug}-comment`,
      readerSlug: recipientSlug,
      postSlug,
      commentId,
      actorName: authorName,
      actorUsername,
      type: "comment",
      message: `${authorName}: "${commentSummary}"`,
      createdAt
    });
  });

  mentionedUsers.forEach((user) => {
    if (user.slug === session?.slug || authorRecipientSlugs.has(user.slug)) {
      return;
    }

    notifications.push({
      id: `notif-${commentId}-${user.slug}-mention`,
      readerSlug: user.slug,
      postSlug,
      commentId,
      actorName: authorName,
      actorUsername,
      type: "mention",
      message: `${authorName}: "${commentSummary}"`,
      createdAt
    });
  });

  await addNotifications(notifications);

  revalidatePath(`/posts/${postSlug}`);
  if (session) {
    revalidatePath("/inbox");
  }
  return { success: "Comment posted." };
}
