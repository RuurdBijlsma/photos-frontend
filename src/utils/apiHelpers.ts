/**
 * Helper function to handle JSON fetch requests with common headers and error handling
 * @param url - API endpoint URL (without /api prefix)
 * @param token - Auth token
 * @param options - Fetch options
 * @returns Parsed JSON response
 * @throws Error when network error or non-OK response
 */
export async function fetchJson<T>(
  url: string,
  token: string | null,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}
