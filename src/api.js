import { API_BASE_URL } from './config';

async function request(path, options = {}) {
  const { body, headers, ...rest } = options;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erro ${res.status} ao falar com o servidor.`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE_URL}/api/uploads`, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha no upload do arquivo.');
  }
  const data = await res.json();
  return `${API_BASE_URL}${data.url}`;
}

export const api = {
  sectors: {
    list: () => request('/api/sectors'),
  },
  pendings: {
    create: (sectorId, data) => request(`/api/sectors/${sectorId}/pendings`, { method: 'POST', body: data }),
    updateStatus: (id, status, author) => request(`/api/pendings/${id}/status`, { method: 'PATCH', body: { status, author } }),
    addUpdate: (id, text, author) => request(`/api/pendings/${id}/updates`, { method: 'POST', body: { text, author } }),
  },
  improvements: {
    create: (sectorId, data) => request(`/api/sectors/${sectorId}/improvements`, { method: 'POST', body: data }),
    addComment: (id, data) => request(`/api/improvements/${id}/comments`, { method: 'POST', body: data }),
  },
  fichas: {
    list: () => request('/api/fichas'),
    create: (data) => request('/api/fichas', { method: 'POST', body: data }),
  },
  entries: {
    list: () => request('/api/entries'),
    create: (data) => request('/api/entries', { method: 'POST', body: data }),
    update: (id, data) => request(`/api/entries/${id}`, { method: 'PUT', body: data }),
    remove: (id) => request(`/api/entries/${id}`, { method: 'DELETE' }),
  },
  events: {
    list: () => request('/api/events'),
    create: (data) => request('/api/events', { method: 'POST', body: data }),
  },
  library: {
    list: () => request('/api/library'),
    create: (data) => request('/api/library', { method: 'POST', body: data }),
  },
  uploads: {
    upload: uploadFile,
  },
  ai: {
    melhorarRelato: (texto, equipamento) => request('/api/melhorar_relato', { method: 'POST', body: { texto, equipamento } }),
    salvarConhecimento: (data) => request('/api/salvar_conhecimento', { method: 'POST', body: data }),
    perguntarAssistente: (pergunta) => request('/api/perguntar_assistente', { method: 'POST', body: { pergunta } }),
    emails: () => request('/api/emails'),
  },
};
