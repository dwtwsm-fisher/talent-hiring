const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  jds: {
    list: () => request<import('../types').JD[]>('/jds'),
    get: (id: string) => request<import('../types').JD>(`/jds/${id}`),
    create: (body: Record<string, unknown>) => request(`/jds`, { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Record<string, unknown>) => request(`/jds/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/jds/${id}`, { method: 'DELETE' }),
  },

  candidates: {
    list: (params?: { search?: string; positionType?: string; company?: string; region?: string; workYears?: string; education?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      if (params?.positionType) q.set('positionType', params.positionType);
      if (params?.company) q.set('company', params.company);
      if (params?.region) q.set('region', params.region);
      if (params?.workYears) q.set('workYears', params.workYears);
      if (params?.education) q.set('education', params.education);
      if (params?.status) q.set('status', params.status);
      return request<import('../types').Candidate[]>(`/candidates${q.toString() ? '?' + q : ''}`);
    },
    get: (id: string) => request<import('../types').Candidate>(`/candidates/${id}`),
    create: (body: Record<string, unknown>) => request(`/candidates`, { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Record<string, unknown>) => request(`/candidates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/candidates/${id}`, { method: 'DELETE' }),
    addAssessment: (id: string, body: Record<string, unknown>) => request(`/candidates/${id}/assessments`, { method: 'POST', body: JSON.stringify(body) }),
    addInterview: (id: string, body: Record<string, unknown>) => request(`/candidates/${id}/interviews`, { method: 'POST', body: JSON.stringify(body) }),
    addBackground: (id: string, body: Record<string, unknown>) => request(`/candidates/${id}/background`, { method: 'POST', body: JSON.stringify(body) }),
    addOffer: (id: string, body: Record<string, unknown>) => request(`/candidates/${id}/offer`, { method: 'POST', body: JSON.stringify(body) }),
  },

  ai: {
    generateJD: (params: { title: string; department?: string; location?: string; salary?: string; keywords?: string }) =>
      request<{ text: string }>('/ai/generate-jd', { method: 'POST', body: JSON.stringify(params) }),
    summarizeResume: (resumeText: string) =>
      request<{ text: string }>('/ai/summarize-resume', { method: 'POST', body: JSON.stringify({ resumeText }) }),
    extractTags: (params: { skills?: string[]; experiences?: unknown[]; educations?: unknown[]; aiSummary?: string; appliedPosition?: string }) =>
      request<{ tags: string[] }>('/ai/extract-tags', { method: 'POST', body: JSON.stringify(params) }),
  },

  dict: {
    list: (type?: string) =>
      request<{ id: string; dictType: string; name: string; sortOrder: number }[]>(type ? `/dict?type=${type}` : '/dict'),
    companies: () => request<{ id: string; name: string }[]>('/dict/companies'),
    locations: () => request<{ id: string; name: string }[]>('/dict/locations'),
    educationLevels: () => request<{ id: string; name: string }[]>('/dict/education-levels'),
    workYears: () => request<{ id: string; name: string }[]>('/dict/work-years'),
    salaryRanges: () => request<{ id: string; name: string }[]>('/dict/salary-ranges'),
    resumeTags: () => request<{ id: string; name: string }[]>('/dict/resume-tags'),
    create: (body: { dictType: string; name: string; sortOrder?: number }) =>
      request<{ id: string; dictType: string; name: string; sortOrder: number }>('/dict', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { name?: string; sortOrder?: number }) =>
      request(`/dict/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/dict/${id}`, { method: 'DELETE' }),
  },
};
