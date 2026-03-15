"use client";

import { useRef, useState } from "react";

function insertAroundSelection(textarea, before, after = "") {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);
  const replacement = `${before}${selected}${after}`;
  const nextValue = textarea.value.slice(0, start) + replacement + textarea.value.slice(end);
  const nextCaret = start + replacement.length;

  return { nextValue, nextCaret };
}

export function PostEditor({ name, defaultValue = "" }) {
  const textareaRef = useRef(null);
  const [content, setContent] = useState(defaultValue);
  const [uploadState, setUploadState] = useState({ loading: false, error: "", uploaded: [] });

  function applyWrapper(before, after = "") {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const { nextValue, nextCaret } = insertAroundSelection(textarea, before, after);
    setContent(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function insertAtCursor(snippet) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((current) => `${current}\n${snippet}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = textarea.value.slice(0, start) + snippet + textarea.value.slice(end);
    const nextCaret = start + snippet.length;
    setContent(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  }

  async function handleUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    setUploadState({ loading: true, error: "", uploaded: [] });

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Upload failed.");
      }

      const snippet = payload.uploads.map((upload) => upload.markdown).join("\n\n");
      insertAtCursor(snippet);
      setUploadState({ loading: false, error: "", uploaded: payload.uploads });
      event.target.value = "";
    } catch (error) {
      setUploadState({
        loading: false,
        error: error.message || "Upload failed.",
        uploaded: []
      });
    }
  }

  return (
    <div className="fieldBlock fieldBlockWide">
      <span>Article body</span>
      <div className="editor-toolbar">
        <button className="buttonGhost" type="button" onClick={() => applyWrapper("## ", "")}>
          Heading
        </button>
        <button className="buttonGhost" type="button" onClick={() => applyWrapper("**", "**")}>
          Bold
        </button>
        <button className="buttonGhost" type="button" onClick={() => applyWrapper("- ", "")}>
          Bullet
        </button>
        <button className="buttonGhost" type="button" onClick={() => applyWrapper("> ", "")}>
          Quote
        </button>
        <label className="buttonGhost" style={{ cursor: "pointer" }}>
          Upload images
          <input type="file" accept="image/*" multiple onChange={handleUpload} style={{ display: "none" }} />
        </label>
      </div>
      <textarea
        ref={textareaRef}
        className="textarea"
        name={name}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={"Write with markdown.\n\nUse headings, bullets, quotes, links, and uploaded images anywhere in the article."}
        required
      />
      <p className="field-help">
        Upload from your Mac or Windows machine, then place images anywhere in the article. Uploaded image markdown is inserted at your cursor.
      </p>
      {uploadState.loading ? <p className="notice success">Uploading images...</p> : null}
      {uploadState.error ? <p className="notice">{uploadState.error}</p> : null}
      {uploadState.uploaded.length ? (
        <div className="tag-row">
          {uploadState.uploaded.map((upload) => (
            <button className="buttonGhost" type="button" key={upload.url} onClick={() => insertAtCursor(`\n${upload.markdown}\n`)}>
              Reinsert {upload.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
