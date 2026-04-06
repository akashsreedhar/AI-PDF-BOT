const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

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
}: {
  documentId: number;
  question: string;
  conversationHistory: Message[];
  token: string;
  provider?: 'groq' | 'openai';
  liveMode?: boolean;
  language?: string;
  compareDocumentId?: number;
}): Promise<ChatResponse> {
  const body: Record<string, unknown> = {
    document_id: documentId,
    question,
    provider,
    conversation_history: conversationHistory,
    live_mode: liveMode,
    language,
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
  onToken: (token: string) => void;
  onDone: (data: {
    conversation_id: number;
    conversation_history: Message[];
    live_sources: string[];
    follow_up_questions: string[];
  }) => void;
  onError: (error: string) => void;
}): Promise<void> {
  const body: Record<string, unknown> = {
    document_id: documentId,
    question,
    provider,
    conversation_history: conversationHistory,
    live_mode: liveMode,
    language,
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
