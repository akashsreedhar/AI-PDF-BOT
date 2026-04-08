const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  answer: string;
  conversation_id: number;
  conversation_history: Message[];
  live_sources: string[];
  follow_up_questions: string[];
  contradiction_report?: string[];
  used_document_ids?: number[];
}

export interface ChatPreferences {
  response_tone: string;
  response_length: string;
  language: string;
  citation_style: string;
}

export interface UserMemoryItem {
  id: number;
  memory_key: string;
  memory_value: string;
  importance: number;
}

export async function sendChatMessage({
  documentId,
  question,
  conversationHistory,
  token,
  provider = 'groq',
  liveMode = false,
  language = 'English',
  compareDocumentId,
  documentIds = [],
  useMemory = true,
  contradictionCheck = true,
}: {
  documentId: number;
  question: string;
  conversationHistory: Message[];
  token: string;
  provider?: 'groq' | 'openai';
  liveMode?: boolean;
  language?: string;
  compareDocumentId?: number;
  documentIds?: number[];
  useMemory?: boolean;
  contradictionCheck?: boolean;
}): Promise<ChatResponse> {
  const body: Record<string, unknown> = {
    document_id: documentId,
    document_ids: documentIds,
    question,
    provider,
    conversation_history: conversationHistory,
    live_mode: liveMode,
    language,
    use_memory: useMemory,
    contradiction_check: contradictionCheck,
  };
  if (compareDocumentId) body.compare_document_id = compareDocumentId;

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Chat request failed');
  }
  return res.json();
}

export async function streamChatMessage({
  documentId,
  question,
  conversationHistory,
  token,
  provider = 'groq',
  liveMode = false,
  language = 'English',
  compareDocumentId,
  documentIds = [],
  useMemory = true,
  contradictionCheck = true,
  onToken,
  onDone,
  onError,
}: {
  documentId: number;
  question: string;
  conversationHistory: Message[];
  token: string;
  provider?: 'groq' | 'openai';
  liveMode?: boolean;
  language?: string;
  compareDocumentId?: number;
  documentIds?: number[];
  useMemory?: boolean;
  contradictionCheck?: boolean;
  onToken: (token: string) => void;
  onDone: (data: {
    conversation_id: number;
    conversation_history: Message[];
    live_sources: string[];
    follow_up_questions: string[];
    contradiction_report?: string[];
    used_document_ids?: number[];
  }) => void;
  onError: (error: string) => void;
}): Promise<void> {
  const body: Record<string, unknown> = {
    document_id: documentId,
    document_ids: documentIds,
    question,
    provider,
    conversation_history: conversationHistory,
    live_mode: liveMode,
    language,
    use_memory: useMemory,
    contradiction_check: contradictionCheck,
  };
  if (compareDocumentId) body.compare_document_id = compareDocumentId;

  const res = await fetch(`${API_BASE}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    onError(err.detail || 'Chat request failed');
    return;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === 'token') {
          onToken(event.content);
        } else if (event.type === 'done') {
          onDone(event);
        } else if (event.type === 'error') {
          onError(event.detail);
        }
      } catch { /* ignore malformed events */ }
    }
  }
}

export interface ConversationRecord {
  id: number;
  question: string;
  answer: string;
  created_at: string;
  conversation_history: Message[];
}

export async function getChatHistory(documentId: number, token: string): Promise<ConversationRecord[]> {
  const res = await fetch(`${API_BASE}/api/chat/history/${documentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to fetch chat history');
  }
  return res.json();
}

export async function getChatPreferences(token: string): Promise<ChatPreferences> {
  const res = await fetch(`${API_BASE}/api/chat/preferences`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to fetch preferences');
  }
  return res.json();
}

export async function updateChatPreferences(
  payload: ChatPreferences,
  token: string,
): Promise<ChatPreferences> {
  const res = await fetch(`${API_BASE}/api/chat/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to update preferences');
  }
  return res.json();
}

export async function getChatMemory(token: string): Promise<UserMemoryItem[]> {
  const res = await fetch(`${API_BASE}/api/chat/memory`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to fetch memory');
  }
  return res.json();
}

export async function addChatMemory(
  payload: { memory_key: string; memory_value: string; importance?: number },
  token: string,
): Promise<UserMemoryItem> {
  const res = await fetch(`${API_BASE}/api/chat/memory`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to add memory');
  }
  return res.json();
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export async function generateQuiz(
  documentId: number,
  token: string,
  numQuestions = 5,
  language = 'English',
): Promise<QuizQuestion[]> {
  const res = await fetch(`${API_BASE}/api/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ document_id: documentId, num_questions: numQuestions, language }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to generate quiz');
  }
  const data = await res.json();
  return data.questions;
}
