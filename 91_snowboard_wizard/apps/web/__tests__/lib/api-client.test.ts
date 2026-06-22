// api-client.test.ts - Tests for the typed API client

import { postScore, postRecommendation, getByShareToken } from '@/lib/api-client'

const API = 'http://localhost:3001'

beforeEach(() => {
  global.fetch = jest.fn()
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('postScore', () => {
  it('calls POST /api/score and returns scores', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ scores: { flex: 7, length: 3 } }),
    })

    const result = await postScore({ experience: 'advanced' })

    expect(global.fetch).toHaveBeenCalledWith(
      `${API}/api/score`,
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    )
    expect(result).toEqual({ flex: 7, length: 3 })
  })

  it('throws on non-ok response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(postScore({})).rejects.toThrow('API error 500')
  })
})

describe('getByShareToken', () => {
  it('calls GET /api/recommendations/share/:token', async () => {
    const mockRec = { id: 'abc', shareToken: 'tok', specSheet: {}, claudeNarrative: null }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRec,
    })

    const result = await getByShareToken('tok')

    expect(global.fetch).toHaveBeenCalledWith(
      `${API}/api/recommendations/share/tok`,
      expect.objectContaining({ credentials: 'include' })
    )
    expect(result).toEqual(mockRec)
  })
})
