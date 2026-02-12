/**
 * API response types for the AI Interview Representative backend
 */

export interface SpeakResponse {
  transcription: string;
  response: string;
  audioData: string; // Base64 encoded audio
  audioFormat: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
}

export interface ErrorResponse {
  error: string;
  status?: number;
  timestamp?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Application state types
export type AppState = 'idle' | 'recording' | 'processing' | 'playing' | 'error';

export interface AppStatus {
  state: AppState;
  message: string;
  lastQuestion?: string;
  lastResponse?: string;
}

// Audio recorder state
export interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
}

// Audio player state
export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}
