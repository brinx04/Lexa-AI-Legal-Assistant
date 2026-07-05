// frontend/src/lib/api.ts
//
// Client-side API bridge — talks to the Next.js proxy, NOT directly to FastAPI.
// ─────────────────────────────────────────────────────────────────────────────
// The secret API key is NEVER referenced here. The proxy route at
// /api/proxy/[...path] attaches it server-side before forwarding to FastAPI.
// ─────────────────────────────────────────────────────────────────────────────

// All requests go to our own Next.js server — completely safe to be public.
const PROXY = "/api/proxy";

// ── 1. Upload a new document (PDF / DOCX / TXT) ──────────────────────────────
export async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  // No Content-Type header — the browser sets it automatically with the
  // correct multipart boundary for FormData. Setting it manually breaks uploads.
  const response = await fetch(`${PROXY}/documents/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
  return response.json();
}

// ── 2. Fetch the list of all uploaded documents ───────────────────────────────
export async function getDocuments() {
  const response = await fetch(`${PROXY}/documents`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) throw new Error(`Failed to fetch documents: ${response.statusText}`);
  return response.json();
}

// ── 3. Fetch full AI details for a single document ────────────────────────────
export async function getDocumentDetails(docId: string) {
  const response = await fetch(`${PROXY}/documents/${docId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) throw new Error(`Failed to fetch document details: ${response.statusText}`);
  return response.json();
}

// ── 4. Delete a document (cascades: DB + Qdrant vectors + physical file) ──────
export async function deleteDocument(docId: string) {
  const response = await fetch(`${PROXY}/documents/${docId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) throw new Error(`Failed to delete document: ${response.statusText}`);
  return response.json();
}

// ── 5. Chat with a specific document via RAG ──────────────────────────────────
export async function chatWithDocument(docId: string, question: string) {
  const response = await fetch(`${PROXY}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: docId, question }),
  });

  if (!response.ok) throw new Error(`Chat request failed: ${response.statusText}`);
  return response.json();
}