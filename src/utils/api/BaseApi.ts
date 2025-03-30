import type { ApiError, RequestParams, RequestRequired } from '../types/api'
import { Err, Ok, type Result } from '@/utils/types/result'

export class BaseApi {
  public readonly baseUrl: string
  private token?: string

  constructor(baseUrl: string = 'http://localhost:7000', token?: string) {
    this.baseUrl = baseUrl
    this.token = token
  }

  setToken(token: string) {
    this.token = token
  }

  // Helper function to handle errors and return a Result error object
  protected async handleError(
    response: Response,
  ): Promise<Result<never, ApiError>> {
    let errorDetail: string
    try {
      const errorResponse = await response.json()
      const errorMessage = errorResponse.error ?? 'none'
      const errorDesc =
        errorResponse.description ?? JSON.stringify(errorResponse)
      errorDetail = errorMessage + ':\n' + errorDesc
    } catch (e: any) {
      const errorMessage = e.toString()
      const errorDesc = await e.text()
      errorDetail = errorMessage + '\n' + errorDesc
    }
    return Err({
      serverReachable: true,
      tokenProvided: true,
      aborted: false,
      error: {
        message: errorDetail,
        status: response.status,
        statusText: response.statusText,
      },
    })
  }

  protected async request(
    params: RequestRequired,
  ): Promise<Result<Response, ApiError>> {
    const defaults: Omit<RequestParams, 'path'> = {
      authenticate: false,
      method: 'GET',
      timeout: 15000,
      body: undefined,
    }
    const { timeout, path, body, authenticate, method } = {
      ...defaults,
      ...params,
    }
    const headers: HeadersInit = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }

    if (authenticate) {
      if (!this.token) {
        return Err({ tokenProvided: false })
      }
      headers.Authorization = `Bearer ${this.token}`
    }

    const controller = new AbortController()
    const id = setTimeout(() => {
      console.warn("Timeout reached")
      controller.abort()
    }, timeout)

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      clearTimeout(id)

      if (!response.ok) return await this.handleError(response)

      return Ok(response)
    } catch (error: any) {
      clearTimeout(id)
      if (error.name === 'AbortError') {
        return Err({
          tokenProvided: true,
          serverReachable: true,
          aborted: true,
        })
      }
      console.error('Network error:', error)
      return Err({
        tokenProvided: true,
        serverReachable: false,
      })
    }
  }

  protected async json<T>(
    params: RequestRequired,
  ): Promise<Result<T, ApiError>> {
    const result = await this.request(params)
    if (result.ok) {
      try {
        return Ok(await result.value.json())
      } catch (error: any) {
        console.error('JSON parse error:', error, { params })
        return Err({
          tokenProvided: true,
          serverReachable: true,
          aborted: false,
          error: {
            message: "Can't parse JSON output",
            status: 0,
            statusText: '',
          },
        })
      }
    }
    return result
  }
}
