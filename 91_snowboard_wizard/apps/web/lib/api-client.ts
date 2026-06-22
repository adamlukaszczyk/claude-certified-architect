// api-client.ts - Typed API client for all NestJS endpoints

import type { Answers, PartialScores, SpecSheet } from '@snowboard/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json() as Promise<T>
}

export async function postScore(answers: Partial<Answers>): Promise<PartialScores> {
  const data = await apiFetch<{ scores: PartialScores }>('/api/score', {
    method: 'POST',
    body: JSON.stringify({ answers }),
  })
  return data.scores
}

export async function saveSession(id: string, answers: Answers, phase: number): Promise<void> {
  await apiFetch<void>(`/api/sessions/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ answers, phase }),
  })
}

export async function getSession(id: string): Promise<{ answers: Answers; phase: number } | null> {
  try {
    return await apiFetch<{ answers: Answers; phase: number }>(`/api/sessions/${id}`)
  } catch {
    return null
  }
}

export type RecommendationResponse = {
  id: string
  sessionId: string
  specSheet: SpecSheet
  claudeNarrative: string | null
  shareToken: string
  createdAt: string
}

export async function postRecommendation(
  answers: Answers,
  sessionName?: string
): Promise<RecommendationResponse> {
  return apiFetch<RecommendationResponse>('/api/recommendations', {
    method: 'POST',
    body: JSON.stringify({ answers, sessionName }),
  })
}

export async function getByShareToken(token: string): Promise<RecommendationResponse> {
  return apiFetch<RecommendationResponse>(`/api/recommendations/share/${token}`)
}

export type MeResponse = { id: string; email: string; name: string | null; avatarUrl: string | null }

export async function getMe(): Promise<MeResponse | null> {
  try {
    return await apiFetch<MeResponse>('/api/auth/me')
  } catch {
    return null
  }
}

export async function postLogout(): Promise<void> {
  await apiFetch<void>('/api/auth/logout', { method: 'POST' })
}
