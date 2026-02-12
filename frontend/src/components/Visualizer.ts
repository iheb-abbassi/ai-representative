/**
 * Visualizer - Real-time audio waveform visualization using Canvas
 */

export interface VisualizerOptions {
  container: HTMLElement;
  width?: number;
  height?: number;
  barColor?: string;
  backgroundColor?: string;
  barCount?: number;
}

export class AudioVisualizer {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private barColor: string;
  private backgroundColor: string;
  private barCount: number;

  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private animationId: number | null = null;
  private isRunning: boolean = false;

  constructor(options: VisualizerOptions) {
    this.container = options.container;
    this.width = options.width || 300;
    this.height = options.height || 60;
    this.barColor = options.barColor || '#4ade80';
    this.backgroundColor = options.backgroundColor || 'transparent';
    this.barCount = options.barCount || 32;

    this.canvas = this.createCanvas();
    this.ctx = this.canvas.getContext('2d')!;
  }

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.className = 'audio-visualizer';
    canvas.width = this.width;
    canvas.height = this.height;
    return canvas;
  }

  /**
   * Set the analyser node for audio data
   */
  setAnalyser(analyser: AnalyserNode | null): void {
    this.analyser = analyser;

    if (analyser) {
      const bufferLength = analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(new ArrayBuffer(bufferLength));
    } else {
      this.dataArray = null;
    }
  }

  /**
   * Start the visualization animation
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.draw();
  }

  /**
   * Stop the visualization animation
   */
  stop(): void {
    this.isRunning = false;

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Clear canvas
    this.clear();
  }

  /**
   * Draw the visualization
   */
  private draw(): void {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(() => this.draw());

    // Clear canvas
    this.clear();

    // Get audio data
    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
      this.drawBars();
    } else {
      // Draw idle state
      this.drawIdleState();
    }
  }

  /**
   * Draw frequency bars
   */
  private drawBars(): void {
    if (!this.dataArray) return;

    const barWidth = (this.width / this.barCount) - 2;
    const step = Math.floor(this.dataArray.length / this.barCount);

    for (let i = 0; i < this.barCount; i++) {
      const dataIndex = i * step;
      const value = this.dataArray[dataIndex] || 0;
      const barHeight = (value / 255) * this.height;

      const x = i * (barWidth + 2);
      const y = (this.height - barHeight) / 2;

      // Draw bar with gradient
      const gradient = this.ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, this.barColor);
      gradient.addColorStop(1, this.adjustColorOpacity(this.barColor, 0.5));

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, y, barWidth, barHeight);
    }
  }

  /**
   * Draw idle state (flat line)
   */
  private drawIdleState(): void {
    const barWidth = (this.width / this.barCount) - 2;
    const barHeight = 4;
    const y = (this.height - barHeight) / 2;

    this.ctx.fillStyle = this.adjustColorOpacity(this.barColor, 0.3);

    for (let i = 0; i < this.barCount; i++) {
      const x = i * (barWidth + 2);
      this.ctx.fillRect(x, y, barWidth, barHeight);
    }
  }

  /**
   * Clear the canvas
   */
  private clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.backgroundColor !== 'transparent') {
      this.ctx.fillStyle = this.backgroundColor;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  /**
   * Adjust color opacity
   */
  private adjustColorOpacity(color: string, opacity: number): string {
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // Handle rgb/rgba colors
    if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
    }

    return color;
  }

  /**
   * Update visualizer dimensions
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Update bar color
   */
  setColor(color: string): void {
    this.barColor = color;
  }

  /**
   * Mount to container
   */
  mount(): void {
    this.container.appendChild(this.canvas);
  }

  /**
   * Unmount from container
   */
  unmount(): void {
    this.stop();
    this.canvas.remove();
  }

  /**
   * Get canvas element
   */
  getElement(): HTMLCanvasElement {
    return this.canvas;
  }
}

/**
 * Create an audio visualizer instance
 */
export function createAudioVisualizer(options: VisualizerOptions): AudioVisualizer {
  return new AudioVisualizer(options);
}
