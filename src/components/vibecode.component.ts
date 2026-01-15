
import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked, OnInit, output, computed, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../services/gemini.service';
import { WorkflowService, ChatMessage, GroundingChunk } from '../services/workflow.service';
import { IconComponent } from './ui/icon.component';
import { Chat } from '@google/genai';
import { InspirationModalComponent, AnswerMap, AnsweredQuestion } from './inspiration-modal.component';
import { LoadingOverlayComponent } from './ui/loading-overlay.component';

@Component({
  selector: 'app-vibecode',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, InspirationModalComponent, LoadingOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col h-full relative bg-[var(--vibe-bg-main)]">
      
      <!-- Header -->
      <div class="flex items-center justify-between p-4 shadow-sm border-b z-10 shrink-0 bg-[var(--vibe-bg-header)] border-[var(--vibe-border)] text-[var(--vibe-accent)]">
        <div class="flex items-center gap-3">
          <button (click)="goBack()" class="p-2 rounded-full hover:bg-black/5 transition-colors">
             <app-icon name="arrow_back" [size]="24"></app-icon>
          </button>
          <div class="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--vibe-accent-bg)] text-[var(--vibe-on-accent)] shadow-sm">
             <app-icon name="palette" [size]="24"></app-icon>
          </div>
          <div>
            <h2 class="text-xl font-bold font-display tracking-wide">{{ wf.t('vibe.title') }}</h2>
            <p class="text-xs opacity-80 font-medium font-body">{{ wf.t('vibe.subtitle') }}</p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 flex flex-col justify-between overflow-y-auto p-4 sm:p-6 scroll-smooth" #scrollContainer>
        <!-- Chat History -->
        <div class="w-full max-w-3xl mx-auto space-y-6 pb-4">
          @for (msg of messages(); track $index) {
            <div class="flex w-full animate-fadeIn" [class.justify-start]="msg.role === 'model'" [class.justify-end]="msg.role === 'user'">
              <div class="max-w-[90%] md:max-w-[85%] flex flex-col" [class.items-end]="msg.role === 'user'" [class.items-start]="msg.role === 'model'">
                <div class="flex gap-3 items-start" [class.flex-row-reverse]="msg.role === 'user'">
                  <!-- Avatar -->
                  <div class="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs shadow-sm bg-[var(--vibe-bg-header)] text-[var(--vibe-accent)]"
                       [class.bg-[var(--vibe-bg-bubble-user)]]="msg.role === 'user'"
                       [class.text-[var(--vibe-on-accent)]]="msg.role === 'user'">
                    <app-icon [name]="msg.role === 'model' ? 'brush' : 'person'" [size]="20"></app-icon>
                  </div>
                  <!-- Bubble -->
                  <div class="p-4 rounded-2xl text-sm md:text-base leading-relaxed shadow-sm whitespace-pre-wrap font-serif"
                       [class.bg-[var(--vibe-bg-bubble-model)]]="msg.role === 'model'" 
                       [class.text-[var(--text-primary)]]="msg.role === 'model'"
                       [class.rounded-tl-none]="msg.role === 'model'"
                       [class.rounded-tr-none]="msg.role === 'user'"
                       [class.bg-[var(--vibe-bg-bubble-user)]]="msg.role === 'user'"
                       [class.text-[var(--vibe-on-accent)]]="msg.role === 'user'">
                    {{ msg.text }}
                    @if (msg.isStreaming) { <span class="inline-block w-2 h-2 ml-1 bg-current rounded-full animate-pulse"></span> }
                  </div>
                </div>
                <!-- Grounding Sources -->
                @if (msg.groundingChunks && msg.groundingChunks.length > 0) {
                  <div class="mt-2 text-xs w-full max-w-md" [class.ml-12]="msg.role === 'model'">
                     <div class="font-bold mb-1 pl-1 text-[var(--vibe-accent)]/80">{{ wf.t('vibe.sources') }}:</div>
                     <div class="flex flex-wrap gap-2">
                       @for(chunk of msg.groundingChunks; track chunk.web.uri) {
                         <a [href]="chunk.web.uri" target="_blank" rel="noopener noreferrer" 
                            class="flex items-center gap-1.5 bg-[var(--vibe-bg-card)] px-2 py-1 rounded-md hover:underline text-[var(--vibe-accent)] border border-[var(--vibe-border)] transition-colors">
                           <app-icon name="public" [size]="14"></app-icon>
                           <span class="truncate max-w-[200px]">{{ chunk.web.title || chunk.web.uri }}</span>
                         </a>
                       }
                     </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Input Area -->
        <div class="pt-4 pb-2 w-full max-w-xl mx-auto sticky bottom-0">
          <div class="relative bg-[var(--vibe-bg-main)]/90 backdrop-blur-sm p-2 rounded-t-2xl">
              <div>
                <div class="relative group">
                  <textarea [(ngModel)]="userInput" (keydown.enter)="sendMessage($event)" 
                      [placeholder]="wf.t('vibe.placeholder')"
                      class="w-full rounded-2xl py-4 px-5 pr-14 outline-none focus:ring-2 resize-none overflow-hidden bg-[var(--vibe-bg-input)] text-[var(--text-primary)] focus:ring-[var(--vibe-accent)] shadow-md border border-[var(--vibe-border)] transition-all"
                      rows="2"></textarea>
                  <button (click)="sendMessage()" [disabled]="!userInput.trim() || isProcessing()"
                      class="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full text-[var(--vibe-on-accent)] flex items-center justify-center disabled:opacity-50 transition-all shadow-md active:scale-95 bg-[var(--vibe-accent-bg)] hover:brightness-110">
                      <app-icon name="arrow_upward" [size]="20"></app-icon>
                  </button>
                </div>
              </div>

            <div class="mt-3 flex justify-between items-center px-2">
              <button (click)="showInspirationModal.set(true)" class="hover:bg-[var(--vibe-bg-header)] transition-colors px-3 py-1.5 rounded-full font-bold text-[var(--vibe-accent)] flex items-center gap-1.5 text-xs uppercase tracking-wide">
                 <app-icon name="lightbulb" [size]="16"></app-icon>
                 <span>{{ wf.t('vibe.inspiration') }}</span>
                 @if(answeredCount() > 0) {
                    <span class="bg-[var(--vibe-accent)] text-[var(--vibe-on-accent)] px-1.5 rounded-full text-[10px]">{{ answeredCount() }}</span>
                 }
              </button>
              
              <!-- Analyze Button -->
              <button (click)="crystallize()" [disabled]="(messages().length < 2 && !userInput) || isCrystallizing()"
                class="flex items-center gap-2 px-6 py-2 rounded-full text-[var(--vibe-on-accent)] font-bold tracking-wide uppercase text-xs shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[var(--vibe-accent)] to-[#b94033]">
                <span>{{ wf.t('vibe.analyze_btn') }}</span>
                <app-icon name="auto_awesome" [size]="16"></app-icon>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Inspiration Modal -->
    @if(showInspirationModal()) {
      <app-inspiration-modal 
        [initialAnswers]="answeredQuestions()"
        (close)="handleModalClose($event)"
        (questionAnswered)="handleQuestionAnswered($event)"
      />
    }

    <!-- Loading Overlay -->
    <app-loading-overlay 
      [isVisible]="isCrystallizing()"
      [subtitle]="wf.t('vibe.compiling_desc')"
      [steps]="loadingSteps">
    </app-loading-overlay>

    <style>
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
    </style>
  `
})
export class VibeCodeComponent implements OnInit, AfterViewChecked, OnDestroy {
  private gemini = inject(GeminiService);
  wf = inject(WorkflowService); // Public for template
  private chatSession: Chat | null = null;
  
  switchToTool = output<void>();
  switchToArchitect = output<void>();
  exit = output<void>();
  
  messages = signal<ChatMessage[]>([]);
  userInput = '';
  isProcessing = signal(false);
  isCrystallizing = signal(false);
  private needsScroll = true;

  showInspirationModal = signal(false);
  answeredQuestions = signal<AnswerMap>(new Map());
  answeredCount = computed(() => this.answeredQuestions().size);

  loadingSteps = [
    'Extracting Keywords...',
    'Analyzing Vibe Spectrum...',
    'Detecting Archetypes...',
    'Forging Personality Core...',
    'Crystallizing...'
  ];

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  ngOnInit() {
    // Pass the current language to ensure the AI knows which language to reply in
    this.chatSession = this.gemini.startVibeCodeChat(this.wf.currentLang());
    const state = this.wf.state();

    if (state.vibeMessages && state.vibeMessages.length > 0) {
      this.messages.set(state.vibeMessages);
    } else {
      this.startSession();
    }
    
    if (state.isModifying) {
      this.messages.update(m => [...m, {
        role: 'model',
        text: this.wf.t('vibe.modify_msg')
      }]);
      this.needsScroll = true;
    }
  }

  ngAfterViewChecked() { 
    if (this.needsScroll) {
      this.scrollToBottom();
      this.needsScroll = false;
    }
  }
  
  ngOnDestroy() {}

  scrollToBottom() { try { this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight; } catch(e){} }

  startSession() {
    this.messages.set([{ role: 'model', text: this.wf.t('vibe.intro_msg') }]);
  }

  async sendMessage(event?: KeyboardEvent | { text: string }) {
    if (event && 'preventDefault' in event) {
        if (!('shiftKey' in event) || !event.shiftKey) {
            event.preventDefault();
        } else {
            return;
        }
    }
    
    const textToSend = (typeof event === 'object' && 'text' in event) ? event.text : this.userInput;
    if (!textToSend.trim() || this.isProcessing()) return;

    if (!(typeof event === 'object' && 'text' in event)) {
      this.userInput = '';
    }

    this.messages.update(m => [...m, { role: 'user', text: textToSend }]);
    this.needsScroll = true;
    this.isProcessing.set(true);

    try {
      const resultStream = await this.chatSession!.sendMessageStream({ message: textToSend });
      this.messages.update(m => [...m, { role: 'model', text: '', isStreaming: true }]);
      this.needsScroll = true;

      let fullText = '';
      const groundingChunkMap = new Map<string, GroundingChunk>();
      for await (const chunk of resultStream) {
        fullText += chunk.text;
        const newChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        for (const ch of newChunks) {
            if (ch.web?.uri) {
                // Strictly map SDK chunk to Workflow GroundingChunk
                groundingChunkMap.set(ch.web.uri, {
                    web: { uri: ch.web.uri, title: ch.web.title ?? ch.web.uri }
                });
            }
        }
        this.messages.update(m => [...m.slice(0, -1), { role: 'model', text: fullText, isStreaming: true }]);
        this.needsScroll = true;
      }
      const finalChunks = Array.from(groundingChunkMap.values());
      this.messages.update(m => [...m.slice(0, -1), { role: 'model', text: fullText, isStreaming: false, groundingChunks: finalChunks }]);
    } finally {
      this.isProcessing.set(false);
      this.needsScroll = true;
    }
  }
  
  handleModalClose(finalAnswers: AnswerMap) {
    this.showInspirationModal.set(false);
    this.answeredQuestions.set(finalAnswers);
    this.consolidateAnswers();
  }

  handleQuestionAnswered(data: AnsweredQuestion) {
    this.answeredQuestions.update(currentMap => {
        const newMap = new Map(currentMap);
        newMap.set(data.questionId, { questionText: data.questionText, answer: data.answer });
        return newMap;
    });
    this.consolidateAnswers();
  }

  private consolidateAnswers() {
    const answers = this.answeredQuestions();
    if (answers.size > 0) {
      this.userInput = Array.from(answers.values())
        .map((item: { questionText: string; answer: string; }) => item.answer)
        .join('; ');
    } else {
      this.userInput = '';
    }
  }

  async crystallize() {
    const currentMessages = [...this.messages()];
    if (this.userInput.trim()) {
        currentMessages.push({ role: 'user', text: this.userInput.trim() });
    }
    
    let conversation = currentMessages.map(m => `${m.role}: ${m.text}`).join('\n');
    if (!conversation.replace(/user:|model:/g, '').trim()) return;

    this.isCrystallizing.set(true);
    
    try {
      // Pass current language to ensure result matches UI language
      const structuredResult = await this.gemini.structureVibe(conversation, this.wf.currentLang());
      this.wf.pushState({ 
          vibeMessages: currentMessages,
          vibeFragment: conversation, 
          structuredPersona: structuredResult,
          step: 'crystallize',
          isModifying: false
      });
    } catch (e) {
      console.error("Failed to crystallize vibe:", e);
      alert("An error occurred while analyzing your ideas. Please try again.");
    } finally {
      this.isCrystallizing.set(false);
    }
  }

  goBack() {
    if (this.wf.currentStateIndexValue > 0) {
        this.wf.undo();
    } else {
        this.exit.emit();
    }
  }
}
