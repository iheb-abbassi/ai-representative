import { SpeakResponse, HealthResponse } from '../types/api';

/**
 * API client configuration
 */
interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
}

/**
 * API client for the AI Interview Representative backend
 */
export class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeout = config.timeout || 60000; // 60 seconds default
  }

  /**
   * Send audio to the backend and get AI response
   */
  async sendAudio(audioBlob: Blob): Promise<SpeakResponse> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    return this.request<SpeakResponse>('/api/v1/interview/speak', {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Reset the conversation
   */
  async resetConversation(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/v1/interview/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/v1/interview/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get conversation info
   */
  async getInfo(): Promise<{ conversationHistorySize: number; status: string }> {
    return this.request('/api/v1/interview/info', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Make an HTTP request with timeout and error handling
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new ApiError(errorData.error || `HTTP ${response.status}`, response.status);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }

      if (error instanceof TypeError) {
        throw new ApiError('Network error - unable to connect to server', 0);
      }

      throw new ApiError('Unexpected error occurred', 500);
    }
  }
}

/**
 * Custom API error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Create a default API client instance
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:8080';
}
