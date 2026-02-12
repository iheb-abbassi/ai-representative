/**
 * Main application logic for AI Interview Representative
 */

import { AudioRecorder } from './services/audioRecorder';
import { AudioPlayer } from './services/audioPlayer';
import { ApiClient, ApiError } from './services/api';
import { RecordButton } from './components/RecordButton';
import { AudioVisualizer } from './components/Visualizer';
import { StatusDisplay } from './components/StatusDisplay';
import { ResponsePlayer } from './components/ResponsePlayer';
import { QuestionPicker, QuestionPickerOptions } from './components/QuestionPicker';
import type { AppState } from './types/api';

/**
 * Main application class
 */
class App {
  // Services
  private recorder: AudioRecorder;
  private player: AudioPlayer;
  private apiClient: ApiClient;

  // Components
  private recordButton: RecordButton;
  private visualizer: AudioVisualizer;
  private statusDisplay: StatusDisplay;
  private responsePlayer: ResponsePlayer;

  // State
  private state: AppState = 'idle';
  private audioBlob: Blob | null = null;
  private isInitialized: boolean = false;

  // Container elements
  private containers: {
    recordButton: HTMLElement;
    visualizer: HTMLElement;
    status: HTMLElement;
    player: HTMLElement;
    resetButton: HTMLElement;
  };

  constructor() {
    // Get container elements
    this.containers = {
      recordButton: document.getElementById('record-button-container')!,
      visualizer: document.getElementById('visualizer-container')!,
      status: document.getElementById('status-container')!,
      player: document.getElementById('player-container')!,
      resetButton: document.getElementById('reset-button')!,
    };

    console.log('Containers found:', {
      recordButton: !!this.containers.recordButton,
      visualizer: !!this.containers.visualizer,
      status: !!this.containers.status,
      player: !!this.containers.player,
      resetButton: !!this.containers.resetButton,
    });

    // Initialize services
    this.recorder = new AudioRecorder();
    this.player = new AudioPlayer();
    this.apiClient = new ApiClient({
      baseUrl: this.getApiUrl(),
      timeout: 60000,
    });

    // Initialize components
    this.recordButton = new RecordButton({
      container: this.containers.recordButton,
      onRecordStart: () => this.handleRecordStart(),
      onRecordStop: () => this.handleRecordStop(),
    });

    this.visualizer = new AudioVisualizer({
      container: this.containers.visualizer,
      width: 320,
      height: 80,
    });

    this.statusDisplay = new StatusDisplay({
      container: this.containers.status,
      showTranscription: true,
      showResponse: true,
    });

    this.responsePlayer = new ResponsePlayer({
      container: this.containers.player,
      autoPlay: true,
      onEnded: () => this.handlePlaybackEnded(),
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Get the API URL from environment or default
   */
  private getApiUrl(): string {
    return import.meta.env.VITE_API_URL || 'http://localhost:8080';
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Reset button
    this.containers.resetButton.addEventListener('click', () => this.handleReset());

    // Set recorder callbacks
    this.recorder.setCallbacks({
      onDataAvailable: (blob) => {
        this.audioBlob = blob;
        this.processAudio(blob);
      },
      onError: (error) => {
        console.error('Recorder error:', error);
        this.handleError(error);
      },
    });
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.updateStatus('Initializing...', 'idle');

      // Initialize audio recorder
      await this.recorder.initialize();

      // Initialize audio player
      await this.player.initialize();

      // Initialize response player
      await this.responsePlayer.initialize();

      // Connect visualizer to recorder
      const recorderAnalyser = (this.recorder as any).analyser;
      this.visualizer.setAnalyser(recorderAnalyser);

      // Mount components
      this.recordButton.mount();
      this.visualizer.mount();
      this.statusDisplay.mount();
      await this.responsePlayer.initialize();

      // Check backend health
      try {
        const health = await this.apiClient.getHealth();
        console.log('Backend health:', health);
      } catch (error) {
        console.warn('Backend health check failed:', error);
        this.statusDisplay.showError('Cannot connect to server. Some features may not work.');
      }

      this.isInitialized = true;
      this.updateStatus('Ready to record', 'idle');

    } catch (error) {
      console.error('Initialization error:', error);
      this.handleError(error);
    }
  }

  /**
   * Handle recording start
   */
  private handleRecordStart(): void {
    if (this.state !== 'idle') return;

    // Stop any playing audio
    if (this.responsePlayer.isPlaying()) {
      this.responsePlayer.stop();
    }

    this.state = 'recording';
    this.updateStatus('Recording...', 'recording');
    this.visualizer.start();

    // Clear previous data
    this.statusDisplay.clear();
    this.responsePlayer.reset();
  }

  /**
   * Handle recording stop
   */
  private handleRecordStop(): void {
    if (this.state !== 'recording') return;

    this.state = 'processing';
    this.updateStatus('Processing...', 'processing');
    this.visualizer.stop();

    // Recording will be processed in onDataAvailable callback
  }

  /**
   * Process the recorded audio
   */
  private async processAudio(blob: Blob): Promise<void> {
    try {
      this.updateStatus('Uploading and transcribing...', 'processing');

      // Send to backend
      const response = await this.apiClient.sendAudio(blob);

      // Update UI with results
      this.statusDisplay.setTranscription(response.transcription);
      this.statusDisplay.setResponse(response.response);

      // Load and play response audio
      if (response.audioData) {
        await this.responsePlayer.loadAudio(response.audioData, response.audioFormat);
      }

      this.state = 'playing';
      this.updateStatus('Playing response...', 'playing');

    } catch (error) {
      console.error('Error processing audio:', error);
      this.handleError(error);
      this.state = 'idle';
      this.updateStatus('Ready to record', 'idle');
    }
  }

  /**
   * Handle playback ended
   */
  private handlePlaybackEnded(): void {
    this.state = 'idle';
    this.updateStatus('Ready to record', 'idle');
  }

  /**
   * Handle reset button
   */
  private async handleReset(): Promise<void> {
    // Stop recording if active
    if (this.recorder.isRecording()) {
      this.recorder.stop();
    }

    // Stop playback
    this.responsePlayer.stop();

    // Clear data
    this.audioBlob = null;
    this.statusDisplay.clear();
    this.responsePlayer.reset();

    // Reset conversation on backend
    try {
      await this.apiClient.resetConversation();
    } catch (error) {
      console.error('Error resetting conversation:', error);
    }

    this.state = 'idle';
    this.updateStatus('Conversation reset', 'idle');
  }

  /**
   * Handle errors
   */
  private handleError(error: unknown): void {
    let message = 'An unexpected error occurred';

    if (error instanceof ApiError) {
      if (error.statusCode === 0) {
        message = 'Network error. Please check your connection and try again.';
      } else if (error.statusCode === 408) {
        message = 'Request timeout. The server took too long to respond.';
      } else {
        message = error.message;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    this.statusDisplay.showError(message);
    this.state = 'error';
    this.updateStatus('Error occurred', 'error');
  }

  /**
   * Update status display
   */
  private updateStatus(message: string, type: AppState): void {
    this.statusDisplay.setStatus(message, type);
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    await this.recorder.dispose();
    await this.player.dispose();
    await this.responsePlayer.dispose();

    // Dispose question picker
    if (this.questionPicker) {
      this.questionPicker.unmount();
    }
  }
}

/**
 * Initialize the app when DOM is ready
 */
async function main() {
  console.log('Starting main function...');
  const app = new App();

  try {
    console.log('About to initialize app...');
    await app.initialize();
    console.log('AI Interview Representative initialized successfully');
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }

  // Make app available globally for debugging
  (window as any).app = app;
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}

export { App };
