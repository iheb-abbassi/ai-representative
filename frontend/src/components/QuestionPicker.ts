/**
 * QuestionPicker Component
 *
 * Displays a list of pre-written interview questions for the interviewer to select.
 * Questions are loaded from the backend /questions endpoint.
 */

export interface QuestionPickerOptions {
  container: HTMLElement;
  onQuestionSelect?: (question: string) => void;
}

export class QuestionPicker {
  private container: HTMLElement;
  private onQuestionSelect?: (question: string) => void;
  private questions: string[] = [];
  private selectedQuestion: string | null = null;

  constructor(options: QuestionPickerOptions) {
    this.container = options.container;
    this.onQuestionSelect = options.onQuestionSelect;
    this.loadQuestions();
  }

  /**
   * Load questions from backend
   */
  private async loadQuestions(): Promise<void> {
    try {
      const response = await fetch('http://localhost:8080/api/v1/interview/questions');
      if (!response.ok) {
        throw new Error(`Failed to load questions: ${response.statusText}`);
      }
      this.questions = await response.json();
      this.render();
    } catch (error) {
      console.error('Error loading questions:', error);
      // Fallback to hardcoded questions if backend fails
      this.questions = this.getDefaultQuestions();
      this.render();
    }
  }

  /**
   * Get default hardcoded questions (fallback)
   */
  private getDefaultQuestions(): string[] {
    return [
      "Tell me about yourself and your background.",
      "What motivated you to pursue a career in technology?",
      "What specific technical skills or technologies are you most passionate about?",
      "Describe a project where you had to overcome a significant technical challenge.",
      "What do you enjoy most about working in a team environment?",
      "Where do you see yourself in five years? What role are you aiming for?",
      "What is your preferred work style - independent contributor or collaborative team player?",
      "Tell me about a time when you received feedback that improved your work.",
      "What habits or routines help you maintain productivity and work-life balance?",
      "If you could master any new technology instantly, what would it be and why?",
      "What makes you feel most valued and appreciated in a workplace?",
      "Describe your ideal work environment and company culture.",
      "What is one thing you wish you knew starting your career in technology?",
      "What activities or hobbies help you stay creative and inspired outside of work?",
      "How do you typically approach learning new technologies or frameworks?",
      "What's the most interesting technical challenge you've solved in your career?"
    ];
  }

  /**
   * Render the question list
   */
  private render(): void {
    if (!this.container) return;

    const wasEmpty = this.questions.length === 0;

    this.container.innerHTML = `
      <div class="question-list-container">
        ${wasEmpty
          ? '<div class="questions-empty">Loading interview questions...</div>'
          : this.questions.map(q => this.renderQuestion(q)).join('')
        }
    `;

    // Attach click handlers
    if (!wasEmpty) {
      this.attachClickHandlers();
    }
  }

  /**
   * Render a single question item
   */
  private renderQuestion(question: string): string {
    const isSelected = this.selectedQuestion === question;
    const className = `question-item ${isSelected ? 'selected' : ''}`;

    return `
      <div class="${className}" data-question="${this.escapeHtml(question)}">
        <div class="question-text">${this.escapeHtml(question)}</div>
      </div>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Attach click handlers to question items
   */
  private attachClickHandlers(): void {
    const items = this.container.querySelectorAll('.question-item');
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        const question = item.getAttribute('data-question');
        if (question) {
          this.selectQuestion(question);
        }
      });
    });
  }

  /**
   * Select a question
   */
  private selectQuestion(question: string): void {
    this.selectedQuestion = question;
    this.render();

    // Notify parent
    this.onQuestionSelect?.(question);
  }

  /**
   * Mount the component
   */
  mount(): void {
    this.container.innerHTML = '<div class="question-picker-loading">Loading interview questions...</div>';
    this.loadQuestions();
  }

  /**
   * Unmount the component
   */
  unmount(): void {
    this.container.innerHTML = '';
  }

  /**
   * Create a question picker instance
   */
  export function createQuestionPicker(options: QuestionPickerOptions): QuestionPicker {
    return new QuestionPicker(options);
  }
}
