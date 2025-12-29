import { Component, output, signal, computed, HostListener, input, OnInit, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from './ui/icon.component';
import { InspirationQuestion, WorkflowService } from '../services/workflow.service';

export type AnswerMap = Map<string, { questionText: string, answer: string }>;
export type AnsweredQuestion = { questionId: string, questionText: string, answer: string };

@Component({
  selector: 'app-inspiration-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div (click)="closeModal()" 
         class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 transition-all duration-300 modal-backdrop"
         [class.editing]="editingQuestion()">
      
      <!-- Main Modal Window -->
      <div (click)="$event.stopPropagation()" class="bg-[var(--vibe-bg-main)] w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative border border-[var(--vibe-border)] animate-scaleUp">
        
        <!-- Header -->
        <div class="p-4 border-b border-[var(--vibe-border)] flex flex-wrap gap-4 shrink-0 items-center">
          <div class="flex items-center gap-4 flex-1 min-w-[200px]">
            <button (click)="closeModal()" class="p-2 rounded-full hover:bg-[var(--vibe-bg-header)] transition-colors text-[var(--text-secondary)]">
                <app-icon name="arrow_back"></app-icon>
            </button>
            <h2 class="text-xl font-bold text-[var(--text-primary)] hidden sm:block">{{ wf.t('inspiration.title') }}</h2>
            <div class="relative flex-1 max-w-md">
                <app-icon name="search" [size]="20" class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vibe-accent)]/70"></app-icon>
                <input 
                #searchInput
                [(ngModel)]="searchTerm" 
                [placeholder]="wf.t('inspiration.search_placeholder')" 
                class="w-full p-2 pl-10 bg-[var(--vibe-bg-input)] border border-[var(--vibe-border)] rounded-full focus:ring-2 focus:ring-[var(--vibe-accent)] outline-none text-[var(--text-primary)]"
                />
            </div>
          </div>
          
           <!-- AI Actions -->
           <div class="flex gap-2">
                <!-- Expand Library -->
                <button (click)="fetchAIQuestions()" [disabled]="isFetchingAIQuestions() || isRemixing()" 
                        [title]="wf.t('inspiration.expand_library_tooltip')"
                        class="px-4 py-2 rounded-full bg-[var(--vibe-accent-bg-alt)] border border-[var(--vibe-border)] text-[var(--vibe-accent)] font-bold transition-colors flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-60">
                    @if (isFetchingAIQuestions()) {
                        <span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                        <span>{{ wf.t('inspiration.ai_is_thinking') }}</span>
                    } @else {
                        <span>{{ wf.t('inspiration.expand_library') }}</span>
                    }
                </button>
                
                <!-- Optimize Library -->
                <button (click)="remixLibrary()" [disabled]="isFetchingAIQuestions() || isRemixing()" 
                        [title]="wf.t('inspiration.optimize_library_tooltip')"
                        class="px-4 py-2 rounded-full bg-[var(--vibe-bg-card)] border border-[var(--vibe-border)] text-[var(--text-secondary)] font-bold transition-colors flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-60 hover:bg-[var(--vibe-bg-header)]">
                    @if (isRemixing()) {
                        <span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                        <span>{{ wf.t('inspiration.remixing') }}</span>
                    } @else {
                        <span class="sm:hidden">{{ wf.t('inspiration.optimize_library_short') }}</span>
                        <span class="hidden sm:inline">{{ wf.t('inspiration.optimize_library') }}</span>
                    }
                </button>
           </div>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          @for (category of filteredCategories(); track category.id) {
            <div>
              <div (click)="toggleCategory(category.id)" class="flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors hover:bg-[var(--vibe-bg-header)]">
                <h3 class="font-bold text-[var(--text-primary)]">{{ category.icon }} {{ category.title }}</h3>
                <span class="arrow transition-transform duration-300 text-[var(--text-secondary)]" [class.expanded]="isExpanded(category.id)">
                   <app-icon name="expand_more" [size]="24"></app-icon>
                </span>
              </div>
              
              <div class="category-collapse" [class.category-expand]="isExpanded(category.id)">
                <div class="py-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  @for (question of category.questions; track question.id) {
                    <button 
                      (click)="openEditCard(question)"
                      (dblclick)="quickAdd(question)"
                      [class.used]="isUsed(question.id)"
                      class="question-item w-full text-left p-3 rounded-lg hover:bg-[var(--vibe-bg-header)] transition-colors flex items-center gap-3 text-[var(--text-secondary)]">
                      <span class="font-bold text-lg leading-none text-[var(--vibe-accent)]">
                        {{ isUsed(question.id) ? '✓' : '•' }}
                      </span>
                      <span>{{ question.text }}</span>
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-[var(--vibe-border)] flex justify-between items-center shrink-0 bg-[var(--vibe-bg-main)]">
           <div class="flex gap-4 items-center">
               <span class="text-sm font-medium text-[var(--text-secondary)]">{{ wf.t('inspiration.used_count', { count: usedCount() }) }}</span>
               <button (click)="resetLibrary()" class="text-xs text-[var(--text-secondary)] underline opacity-50 hover:opacity-100">{{ wf.t('inspiration.reset_btn') }}</button>
           </div>
           <button (click)="selectRandom()" class="px-6 py-2 rounded-full bg-[var(--vibe-bg-input)] hover:bg-[var(--vibe-bg-header)] border border-[var(--vibe-border)] text-[var(--text-primary)] font-bold transition-colors flex items-center gap-2">
              {{ wf.t('inspiration.random_btn') }}
           </button>
        </div>
      </div>

      <!-- Edit Card Modal -->
      @if(editingQuestion(); as question) {
        <div class="absolute inset-0 z-50 flex items-center justify-center p-4">
           <div (click)="$event.stopPropagation()" class="bg-[var(--vibe-bg-card)] rounded-2xl shadow-xl w-full max-w-lg p-6 border border-[var(--vibe-border)] edit-card">
              <h3 class="text-xl font-bold text-[var(--text-primary)] mb-4">
                {{ editingRandom() ? '🎲' : categoryIcon() }} {{ question.text }}
              </h3>

              <textarea #editInput [(ngModel)]="editCardInput" class="w-full bg-[var(--vibe-bg-input)] border border-[var(--vibe-border)] rounded-lg p-3 text-sm focus:ring-2 focus:ring-[var(--vibe-accent)] outline-none text-[var(--text-primary)]" rows="4"></textarea>

              <div class="mt-4 text-sm text-[var(--text-secondary)] flex justify-between items-start gap-4">
                 <div>
                    <strong>{{ wf.t('inspiration.example_label') }}</strong>
                    <pre class="whitespace-pre-wrap font-sans leading-tight">{{ question.example }}</pre>
                 </div>
                 <div class="text-right text-xs max-w-[45%] shrink-0">
                    @for(otherQ of otherQuestions(); track otherQ.id) {
                      <p class="text-[var(--vibe-border)] truncate">• {{ otherQ.text }}</p>
                    }
                 </div>
              </div>

              <div class="mt-6 flex justify-end gap-3">
                <button (click)="cancelEdit()" class="px-6 py-2 rounded-full text-[var(--vibe-accent)] font-medium hover:bg-[var(--vibe-bg-header)] transition-colors">{{ wf.t('inspiration.cancel_btn') }}</button>
                <button (click)="confirmEdit()" [disabled]="!editCardInput().trim()" class="px-6 py-2 rounded-full bg-[var(--vibe-accent-bg-alt)] border border-[var(--vibe-border)] text-[var(--vibe-accent)] font-medium hover:opacity-80 shadow-md transition-all active:scale-95 disabled:opacity-50">{{ wf.t('inspiration.confirm_btn') }}</button>
              </div>
           </div>
        </div>
      }
      
      <!-- Toast Notification -->
       @if(toastMessage()) {
        <div class="absolute bottom-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm shadow-lg animate-fadeInUp">
          {{ toastMessage() }}
        </div>
      }
    </div>
  `,
  styles: [`
    .modal-backdrop.editing {
      background: rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(4px);
    }
    .dark .modal-backdrop.editing {
      background: rgba(0, 0, 0, 0.5);
    }
    .category-collapse {
      transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      max-height: 0;
      overflow: hidden;
    }
    .category-expand {
      max-height: 500px; /* Adjust as needed */
    }
    .arrow.expanded {
      transform: rotate(180deg);
    }
    .edit-card {
      animation: cardPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes cardPopIn {
      from { opacity: 0; transform: scale(0.8) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .question-item.used {
      font-style: italic;
    }
    .dark .question-item.used {
       color: #6a5e5e;
    }
    .question-item.used .font-bold {
      animation: checkMarkAppear 0.4s ease;
    }
    @keyframes checkMarkAppear {
      0% { opacity: 0; transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { opacity: 1; transform: scale(1); }
    }
     .animate-scaleUp { animation: scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    @keyframes scaleUp { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
     @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fadeInUp { animation: fadeInUp 0.5s ease-out forwards; }
  `]
})
export class InspirationModalComponent implements OnInit {
  wf = inject(WorkflowService);

  initialAnswers = input<AnswerMap>(new Map());
  close = output<AnswerMap>();
  questionAnswered = output<AnsweredQuestion>();

  // State
  sessionAnswers = signal<AnswerMap>(new Map());
  searchTerm = signal('');
  expandedCategories = signal<Set<string>>(new Set());
  editingQuestion = signal<InspirationQuestion | null>(null);
  editCardInput = signal('');
  editingRandom = signal(false);
  toastMessage = signal('');
  isFetchingAIQuestions = signal(false);
  isRemixing = signal(false);

  @ViewChild('editInput') private editInputEl!: ElementRef<HTMLTextAreaElement>;

  // Computed
  private usedQuestionIds = computed(() => new Set(this.sessionAnswers().keys()));
  usedCount = computed(() => this.usedQuestionIds().size);
  
  // Use the Global Service Data
  filteredCategories = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const all = this.wf.inspirationCategories(); // Sourced from Global WorkflowService
    if (!term) return all;
    return all
      .map(category => ({
        ...category,
        questions: category.questions.filter(q => q.text.toLowerCase().includes(term))
      }))
      .filter(category => category.questions.length > 0);
  });
  
  categoryIcon = computed(() => {
    const q = this.editingQuestion();
    if (!q) return '';
    const category = this.wf.inspirationCategories().find(c => c.questions.some(cq => cq.id === q.id));
    return category ? category.icon : '';
  });

  otherQuestions = computed(() => {
    const q = this.editingQuestion();
    if (!q) return [];
    
    const category = this.wf.inspirationCategories().find(c => c.questions.some(cq => cq.id === q.id));
    if (!category) return [];
    
    return category.questions.filter(otherQ => otherQ.id !== q.id).slice(0, 2);
  });
  
  ngOnInit() {
    this.sessionAnswers.set(new Map(this.initialAnswers()));
  }

  // --- Interaction Methods ---

  @HostListener('document:keydown', ['$event'])
  onKeydownHandler(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.editingQuestion() ? this.cancelEdit() : this.closeModal();
    }
    if (event.key === 'Enter' && this.editingQuestion() && !event.shiftKey) {
        event.preventDefault();
        this.confirmEdit();
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'r') {
        event.preventDefault();
        this.selectRandom();
    }
  }
  
  closeModal() {
    this.close.emit(this.sessionAnswers());
  }

  toggleCategory(id: string) {
    this.expandedCategories.update(currentSet => {
      const newSet = new Set(currentSet);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  }

  isExpanded = (id: string) => this.expandedCategories().has(id);
  isUsed = (id: string) => this.usedQuestionIds().has(id);

  openEditCard(question: InspirationQuestion) {
    this.editingQuestion.set(question);
    const existingAnswer = this.sessionAnswers().get(question.id);
    this.editCardInput.set(existingAnswer?.answer || question.placeholder || '');
    setTimeout(() => this.editInputEl?.nativeElement.focus(), 100);
  }
  
  quickAdd(question: InspirationQuestion) {
     if (this.isUsed(question.id)) return;
     const answer = question.text;
     this.updateAnswers(question, answer);
     this.showToast(this.wf.t('inspiration.quick_add_toast', { text: question.text }));
  }

  cancelEdit() {
    this.editingQuestion.set(null);
    this.editingRandom.set(false);
  }

  confirmEdit() {
    const question = this.editingQuestion();
    if (!question || !this.editCardInput().trim()) return;
    this.updateAnswers(question, this.editCardInput().trim());
    this.cancelEdit();
  }
  
  private updateAnswers(question: InspirationQuestion, answer: string) {
    this.sessionAnswers.update(map => {
      const newMap = new Map(map);
      newMap.set(question.id, { questionText: question.text, answer: answer });
      return newMap;
    });
    this.questionAnswered.emit({ questionId: question.id, questionText: question.text, answer });
  }

  selectRandom() {
    const allQuestions = this.wf.inspirationCategories().flatMap(c => c.questions);
    const unused = allQuestions.filter(q => !this.isUsed(q.id));
    const pool = unused.length > 0 ? unused : allQuestions;
    const randomQ = pool[Math.floor(Math.random() * pool.length)];
    this.editingRandom.set(true);
    this.openEditCard(randomQ);
  }

  private showToast(message: string) {
    this.toastMessage.set(message);
    setTimeout(() => this.toastMessage.set(''), 3000);
  }

  // --- AI Methods (Delegated to WorkflowService) ---

  async fetchAIQuestions() {
    this.isFetchingAIQuestions.set(true);
    try {
      await this.wf.addAIInspirationCategories();
      // Auto-expand the first new category (heuristic: assume it's the first one if length changed)
      const categories = this.wf.inspirationCategories();
      if(categories.length > 0 && categories[0].id.startsWith('ai-gen')) {
          this.expandedCategories.update(s => s.add(categories[0].id));
      }
    } catch (e) {
      console.error("Failed to fetch AI questions", e);
      this.showToast(this.wf.t('inspiration.error.unavailable'));
    } finally {
      this.isFetchingAIQuestions.set(false);
    }
  }

  async remixLibrary() {
      this.isRemixing.set(true);
      try {
          await this.wf.remixInspirationLibrary();
          this.showToast(this.wf.t('inspiration.remix_success_toast'));
      } catch (e) {
          console.error("Remix failed", e);
          this.showToast(this.wf.t('inspiration.error.unavailable'));
      } finally {
          this.isRemixing.set(false);
      }
  }
  
  resetLibrary() {
      if(confirm(this.wf.t('common.confirm_restart'))) {
          this.wf.resetInspirationLibrary();
      }
  }
}
