import { RecorderState } from '../types/api';

/**
 * Options for audio recording
 */
export interface RecorderOptions {
  mimeType?: string;
  sampleRate?: number;
  channelCount?: number;
  maxDuration?: number; // in seconds
}

/**
 * Callbacks for recorder events
 */
export interface RecorderCallbacks {
  onDataAvailable: (blob: Blob) => void;
  onStart?: () => void;
  onStop?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Audio recorder using MediaRecorder API
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;
  private animationFrame: number | null = null;

  private state: RecorderState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
  };

  private options: Required<RecorderOptions> = {
    mimeType: 'audio/webm;codecs=opus',
    sampleRate: 48000,
    channelCount: 1,
    maxDuration: 300, // 5 minutes
  };

  private callbacks: RecorderCallbacks = {
    onDataAvailable: () => {},
  };

  constructor(options: RecorderOptions = {}) {
    this.options = { ...this.options, ...options as any };
  }

  /**
   * Check if the browser supports the required MIME type
   */
  static getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/mp3',
      'audio/wav',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    throw new Error('No supported audio MIME type found');
  }

  /**
   * Request microphone access and initialize the recorder
   */
  async initialize(): Promise<void> {
    try {
      // Get supported MIME type
      const mimeType = AudioRecorder.getSupportedMimeType();
      this.options.mimeType = mimeType;

      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.options.sampleRate,
          channelCount: this.options.channelCount,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio context for visualization
      this.audioContext = new AudioContext({ sampleRate: this.options.sampleRate });
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      // Create media recorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.options.mimeType,
        audioBitsPerSecond: 128000,
      });

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.options.mimeType });
        this.chunks = [];
        this.callbacks.onDataAvailable(blob);
        this.callbacks.onStop?.();
      };

      console.log('AudioRecorder initialized with MIME type:', mimeType);
    } catch (error) {
      console.error('Error initializing AudioRecorder:', error);
      throw error;
    }
  }

  /**
   * Set callbacks for recorder events
   */
  setCallbacks(callbacks: Partial<RecorderCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Start recording
   */
  start(): void {
    if (!this.mediaRecorder) {
      throw new Error('AudioRecorder not initialized. Call initialize() first.');
    }

    if (this.state.isRecording) {
      console.warn('Already recording');
      return;
    }

    this.chunks = [];
    this.mediaRecorder.start(100); // Collect data every 100ms
    this.startTime = Date.now();
    this.state.isRecording = true;
    this.state.isPaused = false;
    this.state.duration = 0;

    this.callbacks.onStart?.();
    console.log('Recording started');
  }

  /**
   * Stop recording
   */
  stop(): void {
    if (!this.mediaRecorder || !this.state.isRecording) {
      console.warn('Not recording');
      return;
    }

    this.mediaRecorder.stop();
    this.state.isRecording = false;
    this.state.isPaused = false;

    console.log('Recording stopped');
  }

  /**
   * Pause recording
   */
  pause(): void {
    if (!this.mediaRecorder || !this.state.isRecording) {
      return;
    }

    this.mediaRecorder.pause();
    this.state.isPaused = true;
    console.log('Recording paused');
  }

  /**
   * Resume recording
   */
  resume(): void {
    if (!this.mediaRecorder || !this.state.isPaused) {
      return;
    }

    this.mediaRecorder.resume();
    this.state.isPaused = false;
    console.log('Recording resumed');
  }

  /**
   * Get current recording state
   */
  getState(): RecorderState {
    return { ...this.state };
  }

  /**
   * Get current time data for visualization
   */
  getTimeDomainData(dataArray: Uint8Array<ArrayBuffer>): void {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(dataArray);
    }
  }

  /**
   * Get frequency data for visualization
   */
  getFrequencyData(dataArray: Uint8Array<ArrayBuffer>): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(dataArray);
    }
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.state.isRecording && !this.state.isPaused;
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    if (this.mediaRecorder && this.state.isRecording) {
      this.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }

    if (this.audioContext) {
      await this.audioContext.close();
    }

    this.mediaRecorder = null;
    this.stream = null;
    this.audioContext = null;
    this.analyser = null;

    console.log('AudioRecorder disposed');
  }
}

/**
 * Create a default audio recorder instance
 */
export function createAudioRecorder(options?: RecorderOptions): AudioRecorder {
  return new AudioRecorder(options);
}
