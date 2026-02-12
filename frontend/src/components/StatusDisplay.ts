/**
 * StatusDisplay - Shows application status, transcriptions, and responses
 */

export interface StatusDisplayOptions {
  container: HTMLElement;
  showTranscription?: boolean;
  showResponse?: boolean;
}

export class StatusDisplay {
  private container: HTMLElement;
  private statusElement: HTMLElement;
  private transcriptionElement: HTMLElement | null;
  private responseElement: HTMLElement | null;

  private currentStatus: string = 'Ready';
  private currentTranscription: string = '';
  private currentResponse: string = '';

  constructor(options: StatusDisplayOptions) {
    this.container = options.container;

    // Create status element
    this.statusElement = document.createElement('div');
    this.statusElement.className = 'status-display';
    this.statusElement.innerHTML = `
      <div class="status-indicator">
        <span class="status-dot"></span>
        <span class="status-text">${this.currentStatus}</span>
      </div>
    `;

    // Create transcription element
    this.transcriptionElement = options.showTranscription !== false
      ? this.createSection('transcription', 'Question', 'last-question')
      : null;

    // Create response element
    this.responseElement = options.showResponse !== false
      ? this.createSection('response', 'Response', 'ai-response')
      : null;
  }

  private createSection(type: string, label: string, className: string): HTMLElement {
    const section = document.createElement('div');
    section.className = `${className}-section`;
    section.innerHTML = `
      <div class="${className}-label">${label}</div>
      <div class="${className}-text">Waiting for input...</div>
    `;
    return section;
  }

  /**
   * Set the current status message
   */
  setStatus(status: string, type: 'idle' | 'recording' | 'processing' | 'playing' | 'error' = 'idle'): void {
    this.currentStatus = status;

    const statusText = this.statusElement.querySelector('.status-text') as HTMLElement;
    const statusDot = this.statusElement.querySelector('.status-dot') as HTMLElement;

    if (statusText) {
      statusText.textContent = status;
    }

    // Update status dot color based on type
    if (statusDot) {
      statusDot.className = 'status-dot ' + type;
    }
  }

  /**
   * Set the transcription text (last question)
   */
  setTranscription(text: string): void {
    this.currentTranscription = text;

    if (this.transcriptionElement) {
      const textElement = this.transcriptionElement.querySelector('.last-question-text') as HTMLElement;
      if (textElement) {
        if (text) {
          textElement.textContent = text;
          this.transcriptionElement.classList.add('has-content');
        } else {
          textElement.textContent = 'Waiting for input...';
          this.transcriptionElement.classList.remove('has-content');
        }
      }
    }
  }

  /**
   * Set the AI response text
   */
  setResponse(text: string): void {
    this.currentResponse = text;

    if (this.responseElement) {
      const textElement = this.responseElement.querySelector('.ai-response-text') as HTMLElement;
      if (textElement) {
        if (text) {
          textElement.textContent = text;
          this.responseElement.classList.add('has-content');
        } else {
          textElement.textContent = 'Waiting for response...';
          this.responseElement.classList.remove('has-content');
        }
      }
    }
  }

  /**
   * Clear all content
   */
  clear(): void {
    this.setTranscription('');
    this.setResponse('');
    this.setStatus('Ready', 'idle');
  }

  /**
   * Show error state
   */
  showError(message: string): void {
    this.setStatus(message, 'error');

    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    this.container.appendChild(errorElement);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      errorElement.remove();
    }, 5000);
  }

  /**
   * Show loading indicator
   */
  showLoading(message: string = 'Processing...'): void {
    this.setStatus(message, 'processing');
  }

  /**
   * Mount to container
   */
  mount(): void {
    // Clear container
    this.container.innerHTML = '';

    // Add elements in order
    this.container.appendChild(this.statusElement);

    if (this.transcriptionElement) {
      this.container.appendChild(this.transcriptionElement);
    }

    if (this.responseElement) {
      this.container.appendChild(this.responseElement);
    }
  }

  /**
   * Unmount from container
   */
  unmount(): void {
    this.statusElement.remove();
    this.transcriptionElement?.remove();
    this.responseElement?.remove();
  }
}

/**
 * Create a status display instance
 */
export function createStatusDisplay(options: StatusDisplayOptions): StatusDisplay {
  return new StatusDisplay(options);
}
