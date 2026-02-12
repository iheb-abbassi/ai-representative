/**
 * RecordButton - A button component for recording audio
 */

export interface RecordButtonOptions {
  container: HTMLElement;
  size?: number;
  onRecordStart?: () => void;
  onRecordStop?: () => void;
  onRecordToggle?: (isRecording: boolean) => void;
}

export class RecordButton {
  private container: HTMLElement;
  private button: HTMLButtonElement;
  private size: number;
  private isRecording: boolean = false;

  private callbacks: {
    onRecordStart?: () => void;
    onRecordStop?: () => void;
    onRecordToggle?: (isRecording: boolean) => void;
  } = {};

  constructor(options: RecordButtonOptions) {
    this.container = options.container;
    this.size = options.size || 80;
    this.callbacks = {
      onRecordStart: options.onRecordStart,
      onRecordStop: options.onRecordStop,
      onRecordToggle: options.onRecordToggle,
    };

    this.button = this.createButton();
    this.attachEvents();
  }

  private createButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'record-button';
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
    `;

    return button;
  }

  private attachEvents(): void {
    this.button.addEventListener('click', () => this.toggle());
    this.button.addEventListener('mousedown', () => this.handleMouseDown());
    this.button.addEventListener('mouseup', () => this.handleMouseUp());
    this.button.addEventListener('mouseleave', () => this.handleMouseUp());
    this.button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleMouseDown();
    });
    this.button.addEventListener('touchend', () => this.handleMouseUp());
  }

  private handleMouseDown(): void {
    if (!this.isRecording) {
      this.start();
    }
  }

  private handleMouseUp(): void {
    if (this.isRecording) {
      this.stop();
    }
  }

  private toggle(): void {
    if (this.isRecording) {
      this.stop();
    } else {
      this.start();
    }
  }

  start(): void {
    if (this.isRecording) return;

    this.isRecording = true;
    this.button.classList.add('recording');
    this.button.setAttribute('aria-label', 'Stop recording');
    this.callbacks.onRecordStart?.();
    this.callbacks.onRecordToggle?.(true);
  }

  stop(): void {
    if (!this.isRecording) return;

    this.isRecording = false;
    this.button.classList.remove('recording');
    this.button.setAttribute('aria-label', 'Start recording');
    this.callbacks.onRecordStop?.();
    this.callbacks.onRecordToggle?.(false);
  }

  setState(recording: boolean): void {
    if (recording !== this.isRecording) {
      if (recording) {
        this.start();
      } else {
        this.stop();
      }
    }
  }

  getState(): boolean {
    return this.isRecording;
  }

  mount(): void {
    this.container.appendChild(this.button);
  }

  unmount(): void {
    this.button.remove();
  }

  getElement(): HTMLButtonElement {
    return this.button;
  }
}

/**
 * Create a record button instance
 */
export function createRecordButton(options: RecordButtonOptions): RecordButton {
  return new RecordButton(options);
}
