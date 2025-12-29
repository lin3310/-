import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked, OnInit, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../services/gemini.service';
import { WorkflowService, ChatMessage, GroundingChunk } from '../services/workflow.service';
import { IconComponent } from './ui/icon.component';
import { Chat } from '@google/genai';
import { InspirationModalComponent, AnswerMap, AnsweredQuestion } from './inspiration-modal.component';

@Component({
  selector: 'app-vibecode',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, InspirationModalComponent],
  template: `
    <div class="flex flex-col h-full relative bg-[var(--vibe-bg-main)]">
      
      <!-- Header -->
      <div class="flex items-center justify-between p-4 shadow-sm border-b z-10 shrink-0 bg-[var(--vibe-bg-header)] border-[var(--vibe-border)] text-[var(--vibe-accent)]">
        <div class="flex items-center gap-3">
          <button (click)="goBack()" class="p-2 rounded-full hover:bg-black/5 transition-colors">
             <app-icon name="arrow_back" [size]="24"></app-icon>
          </button>
          <div class="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--vibe-accent-bg)] text-[var(--vibe-on-accent)]">
             <app-icon name="palette" [size]="24"></app-icon>
          </div>
          <div>
            <h2 class="text-lg font-bold">{{ wf.t('vibe.title') }}</h2>
            <p class="text-xs opacity-80 font-medium">{{ wf.t('vibe.subtitle') }}</p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 flex flex-col justify-between overflow-y-auto p-6" #scrollContainer>
        <!-- Chat History -->
        <div class="w-full max-w-3xl mx-auto space-y-6">
          @for (msg of messages(); track $index) {
            <div class="flex w-full animate-fadeIn" [class.justify-start]="msg.role === 'model'" [class.justify-end]="msg.role === 'user'">
              <div class="max-w-[85%] flex flex-col" [class.items-end]="msg.role === 'user'" [class.items-start]="msg.role === 'model'">
                <div class="flex gap-3 items-start" [class.flex-row-reverse]="msg.role === 'user'">
                  <!-- Avatar -->
                  <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs shadow-sm bg-[var(--vibe-bg-header)] text-[var(--vibe-accent)]"
                       [class.bg-[var(--vibe-bg-bubble-user)]]="msg.role === 'user'"
                       [class.text-[var(--vibe-on-accent)]]="msg.role === 'user'">
                    <app-icon [name]="msg.role === 'model' ? 'brush' : 'person'" [size]="20"></app-icon>
                  </div>
                  <!-- Bubble -->
                  <div class="p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap font-serif"
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
                            class="flex items-center gap-1.5 bg-[var(--vibe-bg-card)] px-2 py-1 rounded-md hover:underline text-[var(--vibe-accent)] border border-[var(--vibe-border)]">
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
        <div class="pt-8 pb-4 w-full max-w-xl mx-auto">
          <div class="text-center">
              <div>
                <h3 class="text-lg font-semibold text-center mb-4 text-[var(--vibe-accent)]">
                   ...
                </h3>
                <div class="relative">
                  <textarea [(ngModel)]="userInput" (keydown.enter)="sendMessage($event)" 
                      [placeholder]="wf.t('vibe.placeholder')"
                      class="w-full rounded-2xl py-3 px-5 pr-14 outline-none focus:ring-2 resize-none overflow-hidden bg-[var(--vibe-bg-input)] text-[var(--text-primary)] focus:ring-[var(--vibe-accent)]"
                      rows="3"></textarea>
                  <button (click)="sendMessage()" [disabled]="!userInput.trim() || isProcessing()"
                      class="absolute right-3 top-3 w-10 h-10 rounded-full text-[var(--vibe-on-accent)] flex items-center justify-center disabled:opacity-50 transition-all shadow-md active:scale-95 bg-[var(--vibe-accent-bg)]">
                      <app-icon name="sync_alt" [size]="20"></app-icon>
                  </button>
                </div>
              </div>

            <div class="mt-4 text-sm text-center">
              <button (click)="showInspirationModal.set(true)" class="hover:opacity-80 transition-colors p-1 rounded font-medium text-[var(--vibe-accent)]">
                 <span class="font-bold">💡 {{ wf.t('vibe.inspiration') }}</span>
                 @if(answeredCount() > 0) {
                    <span class="text-xs ml-1"> ({{ answeredCount() }})</span>
                 }
              </button>
            </div>
            
            <!-- Actions -->
            <div class="flex gap-3 justify-center mt-6">
              <button (click)="crystallize()" [disabled]="(messages().length < 2 && !userInput) || isCrystallizing()"
                class="px-8 py-3 rounded-full text-[var(--vibe-on-accent)] font-bold tracking-wide uppercase text-sm shadow-lg hover:opacity-90 transition-all active:scale-95 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed bg-[var(--vibe-accent-bg)]">
                {{ wf.t('vibe.analyze_btn') }}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
    
    @if(showInspirationModal()) {
      <app-inspiration-modal 
        [initialAnswers]="answeredQuestions()"
        (close)="handleModalClose($event)"
        (questionAnswered)="handleQuestionAnswered($event)"
      />
    }

    <!-- Crystallizing Overlay -->
    @if (isCrystallizing()) {
      <div class="absolute inset-0 bg-white/80 dark:bg-black/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center transition-opacity duration-300 animate-fadeIn">
        <div class="text-center p-8">
          <div class="relative w-24 h-24 mb-6">
            <div class="absolute inset-0 border-4 rounded-full border-[var(--vibe-border)]"></div>
            <div class="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin border-t-[var(--vibe-accent)]"></div>
          </div>
          <h3 class="text-2xl font-bold animate-pulse text-[var(--vibe-accent)]">{{ wf.t('common.compiling') }}</h3>
          <p class="mt-2 opacity-70 dark:text-gray-300">{{ wf.t('vibe.compiling_desc') }}</p>
        </div>
      </div>
    }

    <style>
      @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
    </style>
  `
})
export class VibeCodeComponent implements OnInit, AfterViewChecked {
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

  showModificationSuggestions = signal(false);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  ngOnInit() {
    this.chatSession = this.gemini.startVibeCodeChat();
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
    this.showModificationSuggestions.set(false);
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
                groundingChunkMap.set(ch.web.uri, ch);
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
      const summary = Array.from(answers.values())
        .map((item: { questionText: string; answer: string; }) => item.answer)
        .join('; ');
      this.userInput = summary;
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
      const structuredResult = await this.gemini.structureVibe(conversation);
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
