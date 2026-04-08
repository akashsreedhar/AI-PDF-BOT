const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export interface Document {
  id: number;
  filename: string;
  created_at: string;
  doc_title?: string;
  summary?: string;
  key_topics?: string[];
}

export interface UploadResult {
  message: string;
  documents: { id: number; filename: string; index_path: string }[];
}

export async function getDocuments(token: string): Promise<Document[]> {
  const res = await fetch(`${API_BASE}/api/documents`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function uploadDocuments(files: File[], token: string): Promise<UploadResult> {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  const res = await fetch(`${API_BASE}/api/upload_documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function deleteDocument(docId: number, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/documents/${docId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete document');
}
