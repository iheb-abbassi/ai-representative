import { PlayerState } from '../types/api';

/**
 * Options for audio playback
 */
export interface PlayerOptions {
  volume?: number;
  autoplay?: boolean;
  loop?: boolean;
}

/**
 * Callbacks for player events
 */
export interface PlayerCallbacks {
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onLoaded?: (duration: number) => void;
  onError?: (error: Error) => void;
}

/**
 * Audio player using Web Audio API and HTML5 Audio
 */
export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;

  private state: PlayerState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1.0,
  };

  private options: Required<PlayerOptions> = {
    volume: 1.0,
    autoplay: false,
    loop: false,
  };

  private callbacks: PlayerCallbacks = {};

  constructor(options: PlayerOptions = {}) {
    this.options = { ...this.options, ...options as any };
    this.state.volume = this.options.volume;
  }

  /**
   * Initialize the audio player
   */
  async initialize(): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new AudioContext();

      // Create audio element
      this.audioElement = new Audio();
      this.audioElement.autoplay = this.options.autoplay;
      this.audioElement.loop = this.options.loop;
      this.audioElement.volume = this.state.volume;

      // Set up event listeners
      this.audioElement.addEventListener('play', () => this.handlePlay());
      this.audioElement.addEventListener('pause', () => this.handlePause());
      this.audioElement.addEventListener('ended', () => this.handleEnded());
      this.audioElement.addEventListener('timeupdate', () => this.handleTimeUpdate());
      this.audioElement.addEventListener('loadedmetadata', () => this.handleLoaded());
      this.audioElement.addEventListener('error', (e) => this.handleError(e));

      console.log('AudioPlayer initialized');
    } catch (error) {
      console.error('Error initializing AudioPlayer:', error);
      throw error;
    }
  }

  /**
   * Load audio from a Blob
   */
  async loadFromBlob(blob: Blob): Promise<void> {
    if (!this.audioElement) {
      throw new Error('AudioPlayer not initialized');
    }

    const url = URL.createObjectURL(blob);
    this.loadFromUrl(url);
  }

  /**
   * Load audio from a URL
   */
  async loadFromUrl(url: string): Promise<void> {
    if (!this.audioElement) {
      throw new Error('AudioPlayer not initialized');
    }

    // Revoke old URL if exists
    if (this.audioElement.src) {
      URL.revokeObjectURL(this.audioElement.src);
    }

    this.audioElement.src = url;
    this.state.isPlaying = false;
    this.state.currentTime = 0;

    // Wait for metadata to load
    return new Promise((resolve, reject) => {
      const onLoaded = () => {
        this.audioElement?.removeEventListener('loadedmetadata', onLoaded);
        this.audioElement?.removeEventListener('error', onError);
        resolve();
      };

      const onError = (e: Event) => {
        this.audioElement?.removeEventListener('loadedmetadata', onLoaded);
        this.audioElement?.removeEventListener('error', onError);
        reject(new Error('Failed to load audio'));
      };

      this.audioElement?.addEventListener('loadedmetadata', onLoaded);
      this.audioElement?.addEventListener('error', onError);
    });
  }

  /**
   * Load audio from base64 data
   */
  async loadFromBase64(base64: string, format: string = 'audio/mpeg'): Promise<void> {
    // Decode base64
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: format });
    await this.loadFromBlob(blob);
  }

  /**
   * Play the loaded audio
   */
  async play(): Promise<void> {
    if (!this.audioElement) {
      throw new Error('AudioPlayer not initialized');
    }

    if (!this.audioElement.src) {
      throw new Error('No audio loaded');
    }

    // Resume audio context if suspended
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }

    await this.audioElement.play();
  }

  /**
   * Pause the audio
   */
  pause(): void {
    if (!this.audioElement) {
      return;
    }

    this.audioElement.pause();
  }

  /**
   * Stop the audio and reset to beginning
   */
  stop(): void {
    if (!this.audioElement) {
      return;
    }

    this.audioElement.pause();
    this.audioElement.currentTime = 0;
  }

  /**
   * Seek to a specific time
   */
  seek(time: number): void {
    if (!this.audioElement) {
      return;
    }

    this.audioElement.currentTime = Math.max(0, Math.min(time, this.state.duration));
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.state.volume = clampedVolume;

    if (this.audioElement) {
      this.audioElement.volume = clampedVolume;
    }

    if (this.gainNode) {
      this.gainNode.gain.value = clampedVolume;
    }
  }

  /**
   * Get current state
   */
  getState(): PlayerState {
    return { ...this.state };
  }

  /**
   * Set callbacks
   */
  setCallbacks(callbacks: Partial<PlayerCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Check if currently playing
   */
  isPlaying(): boolean {
    return this.state.isPlaying;
  }

  /**
   * Get current time position
   */
  getCurrentTime(): number {
    return this.state.currentTime;
  }

  /**
   * Get total duration
   */
  getDuration(): number {
    return this.state.duration;
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    if (this.audioElement) {
      this.stop();
      if (this.audioElement.src) {
        URL.revokeObjectURL(this.audioElement.src);
      }
      this.audioElement.remove();
    }

    if (this.audioContext) {
      await this.audioContext.close();
    }

    this.audioElement = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.gainNode = null;

    console.log('AudioPlayer disposed');
  }

  // Event handlers
  private handlePlay(): void {
    this.state.isPlaying = true;
    this.callbacks.onPlay?.();
  }

  private handlePause(): void {
    this.state.isPlaying = false;
    this.callbacks.onPause?.();
  }

  private handleEnded(): void {
    this.state.isPlaying = false;
    this.callbacks.onEnded?.();
  }

  private handleTimeUpdate(): void {
    if (this.audioElement) {
      this.state.currentTime = this.audioElement.currentTime;
      this.callbacks.onTimeUpdate?.(this.state.currentTime);
    }
  }

  private handleLoaded(): void {
    if (this.audioElement) {
      this.state.duration = this.audioElement.duration;
      this.callbacks.onLoaded?.(this.state.duration);
    }
  }

  private handleError(event: Event): void {
    const error = this.audioElement?.error;
    const message = error ? `Audio error: ${error.message}` : 'Unknown audio error';
    console.error(message, error);
    this.callbacks.onError?.(new Error(message));
  }
}

/**
 * Create a default audio player instance
 */
export function createAudioPlayer(options?: PlayerOptions): AudioPlayer {
  return new AudioPlayer(options);
}
