/**
 * ResponsePlayer - Audio playback controls for TTS response
 */

import { AudioPlayer } from '../services/audioPlayer';

export interface ResponsePlayerOptions {
  container: HTMLElement;
  autoPlay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export class ResponsePlayer {
  private container: HTMLElement;
  private player: AudioPlayer;
  private autoPlay: boolean;

  private playButton: HTMLButtonElement | null = null;
  private progressBar: HTMLElement | null = null;
  private progressFill: HTMLElement | null = null;
  private timeDisplay: HTMLElement | null = null;

  private callbacks: {
    onPlay?: () => void;
    onPause?: () => void;
    onEnded?: () => void;
  } = {};

  private currentAudioData: string | null = null;
  private isLoaded: boolean = false;

  constructor(options: ResponsePlayerOptions) {
    this.container = options.container;
    this.autoPlay = options.autoPlay ?? true;
    this.callbacks = {
      onPlay: options.onPlay,
      onPause: options.onPause,
      onEnded: options.onEnded,
    };

    this.player = new AudioPlayer({
      autoplay: false,
    });

    this.setupPlayerCallbacks();
  }

  private setupPlayerCallbacks(): void {
    this.player.setCallbacks({
      onPlay: () => {
        this.updatePlayButton(true);
        this.callbacks.onPlay?.();
      },
      onPause: () => {
        this.updatePlayButton(false);
        this.callbacks.onPause?.();
      },
      onEnded: () => {
        this.updatePlayButton(false);
        this.updateProgress(0, 0);
        this.callbacks.onEnded?.();
      },
      onTimeUpdate: (currentTime) => {
        const duration = this.player.getDuration();
        this.updateProgress(currentTime, duration);
      },
      onLoaded: (duration) => {
        this.isLoaded = true;
        this.updateProgress(0, duration);
        this.show();

        if (this.autoPlay) {
          this.play();
        }
      },
      onError: (error) => {
        console.error('Audio player error:', error);
        this.hide();
      },
    });
  }

  /**
   * Initialize the player
   */
  async initialize(): Promise<void> {
    await this.player.initialize();
    this.createUI();
  }

  /**
   * Create the UI elements
   */
  private createUI(): void {
    // Create player container
    const playerContainer = document.createElement('div');
    playerContainer.className = 'response-player';
    playerContainer.innerHTML = `
      <button class="play-button" aria-label="Play response">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
        <div class="time-display">0:00 / 0:00</div>
      </div>
    `;

    this.container.appendChild(playerContainer);

    // Store references
    this.playButton = playerContainer.querySelector('.play-button') as HTMLButtonElement;
    this.progressBar = playerContainer.querySelector('.progress-bar') as HTMLElement;
    this.progressFill = playerContainer.querySelector('.progress-fill') as HTMLElement;
    this.timeDisplay = playerContainer.querySelector('.time-display') as HTMLElement;

    // Attach events
    this.playButton.addEventListener('click', () => this.togglePlay());

    // Click on progress bar to seek
    const progressBar = this.progressBar;
    if (progressBar) {
      progressBar.addEventListener('click', (e) => {
        if (!this.isLoaded) return;

        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const duration = this.player.getDuration();
        this.player.seek(percentage * duration);
      });
    }

    // Initially hidden
    this.hide();
  }

  /**
   * Load audio from base64 data
   */
  async loadAudio(base64Data: string, format: string = 'audio/mpeg'): Promise<void> {
    this.currentAudioData = base64Data;
    await this.player.loadFromBase64(base64Data, format);
  }

  /**
   * Play the audio
   */
  async play(): Promise<void> {
    if (!this.isLoaded) return;
    await this.player.play();
  }

  /**
   * Pause the audio
   */
  pause(): void {
    this.player.pause();
  }

  /**
   * Stop the audio
   */
  stop(): void {
    this.player.stop();
  }

  /**
   * Toggle play/pause
   */
  async togglePlay(): Promise<void> {
    if (this.player.isPlaying()) {
      this.pause();
    } else {
      await this.play();
    }
  }

  /**
   * Update play button icon
   */
  private updatePlayButton(isPlaying: boolean): void {
    if (!this.playButton) return;

    if (isPlaying) {
      this.playButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
      `;
      this.playButton.setAttribute('aria-label', 'Pause response');
    } else {
      this.playButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;
      this.playButton.setAttribute('aria-label', 'Play response');
    }
  }

  /**
   * Update progress bar and time display
   */
  private updateProgress(currentTime: number, duration: number): void {
    if (!this.progressFill || !this.timeDisplay) return;

    const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;
    this.progressFill.style.width = `${percentage}%`;

    const currentStr = this.formatTime(currentTime);
    const durationStr = this.formatTime(duration);
    this.timeDisplay.textContent = `${currentStr} / ${durationStr}`;
  }

  /**
   * Format time in M:SS format
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Show the player
   */
  private show(): void {
    this.container.classList.add('has-audio');
  }

  /**
   * Hide the player
   */
  private hide(): void {
    this.container.classList.remove('has-audio');
    this.isLoaded = false;
    this.currentAudioData = null;
  }

  /**
   * Reset the player
   */
  reset(): void {
    this.stop();
    this.hide();
  }

  /**
   * Check if currently playing
   */
  isPlaying(): boolean {
    return this.player.isPlaying();
  }

  /**
   * Check if audio is loaded
   */
  hasAudio(): boolean {
    return this.isLoaded;
  }

  /**
   * Clean up
   */
  async dispose(): Promise<void> {
    await this.player.dispose();
    this.container.innerHTML = '';
  }
}

/**
 * Create a response player instance
 */
export function createResponsePlayer(options: ResponsePlayerOptions): ResponsePlayer {
  return new ResponsePlayer(options);
}
