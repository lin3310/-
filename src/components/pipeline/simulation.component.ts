import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowService, ChatMessage } from '../../services/workflow.service';
import { GeminiService } from '../../services/gemini.service';
import { IconComponent } from '../ui/icon.component';
import { Chat } from '@google/genai';

@Component({
  selector: 'app-simulation',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="flex flex-col h-full bg-[var(--vibe-bg-main)] relative">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b bg-[var(--vibe-bg-header)] border-[var(--vibe-border)] z-10">
        <div>
           <h2 class="text-lg font-bold text-[var(--vibe-accent)] font-display">{{ wf.t('sim.title') }}</h2>
           <p class="text-xs opacity-70 text-[var(--vibe-accent)]/70">{{ wf.t('sim.turns_label') }} {{ remainingTurns() }}</p>
        </div>
        <div class="flex gap-2">
           <button (click)="toggleMode('chat')" class="px-3 py-1 rounded-full text-sm font-medium transition-colors border border-[var(--vibe-accent)]"
                   [class.bg-[var(--vibe-accent-bg)]]="mode() === 'chat'"
                   [class.text-[var(--vibe-on-accent)]]="mode() === 'chat'"
                   [class.text-[var(--vibe-accent)]]="mode() !== 'chat'">
             {{ wf.t('sim.chat') }}
           </button>
           <button (click)="toggleMode('quotes')" class="px-3 py-1 rounded-full text-sm font-medium transition-colors border border-[var(--vibe-accent)]"
                   [class.bg-[var(--vibe-accent-bg)]]="mode() === 'quotes'"
                   [class.text-[var(--vibe-on-accent)]]="mode() === 'quotes'"
                   [class.text-[var(--vibe-accent)]]="mode() !== 'quotes'">
             {{ wf.t('sim.quotes') }}
           </button>
        </div>
      </div>

      <!-- Content -->
      @if (mode() === 'chat') {
        <div class="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth" #scrollContainer (scroll)="onScroll()">
           @if (messages().length === 0) {
             <div class="h-full flex items-center justify-center italic opacity-60 text-[var(--text-secondary)]">
               {{ wf.t('sim.placeholder') }}
             </div>
           }
           @for (msg of messages(); track $index) {
            <div class="flex w-full animate-fadeIn" [class.justify-end]="msg.role === 'user'">
              <div class="max-w-[85%] flex flex-col" [class.items-end]="msg.role === 'user'" [class.items-start]="msg.role === 'model'">
                  <div class="p-3 rounded-2xl text-sm shadow-sm"
                     [class.bg-[var(--vibe-bg-bubble-user)]]="msg.role === 'user'"
                     [class.text-[var(--vibe-on-accent)]]="msg.role === 'user'"
                     [class.bg-[var(--vibe-bg-bubble-model)]]="msg.role === 'model'"
                     [class.text-[var(--text-primary)]]="msg.role === 'model'">
                     {{ msg.text }}
                  </div>
                  <!-- Grounding Sources -->
                  @if (msg.groundingChunks && msg.groundingChunks.length > 0) {
                    <div class="mt-2 text-xs w-full max-w-md">
                       <div class="font-bold mb-1 pl-1 text-[var(--vibe-accent)]/80">Sources:</div>
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

        <!-- Scroll Button -->
        @if (showScrollButton()) {
          <button (click)="scrollToBottom(true)" class="absolute bottom-24 right-6 z-20 w-10 h-10 rounded-full bg-[var(--vibe-accent-bg)] text-[var(--vibe-on-accent)] shadow-lg flex items-center justify-center hover:opacity-90 transition-all animate-bounce-in">
            <app-icon name="arrow_downward" [size]="20"></app-icon>
          </button>
        }

        <div class="p-4 bg-[var(--vibe-bg-card)] border-t flex gap-2 border-[var(--vibe-border)] z-20">
          <input [(ngModel)]="userInput" (keydown.enter)="sendMessage()" [placeholder]="wf.t('sim.placeholder')" 
                 class="flex-1 bg-[var(--vibe-bg-input)] rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-[var(--vibe-accent)] text-[var(--text-primary)] border border-[var(--vibe-border)]">
          <button (click)="sendMessage()" [disabled]="isProcessing() || remainingTurns() <= 0" 
                  class="w-10 h-10 rounded-full text-[var(--vibe-on-accent)] flex items-center justify-center disabled:opacity-50 bg-[var(--vibe-accent-bg)] hover:scale-105 transition-transform active:scale-95 shadow-md">
             <app-icon name="send" [size]="20"></app-icon>
          </button>
        </div>
      } @else {
        <!-- Quotes Mode -->
        <div class="flex-1 overflow-y-auto p-6 scroll-smooth">
           @if (isProcessing()) {
             <div class="text-center p-10 animate-pulse text-[var(--vibe-accent)]">{{ wf.t('common.loading') }}</div>
           } @else {
             <div class="bg-[var(--vibe-bg-card)] p-6 rounded-xl shadow-sm space-y-4 border border-[var(--vibe-border)]">
                <pre class="whitespace-pre-wrap font-serif text-[var(--text-primary)]">{{ quoteContent() }}</pre>
             </div>
             <div class="mt-6 text-center">
               <button (click)="generateQuotes()" class="font-bold hover:underline text-[var(--vibe-accent)]">{{ wf.t('sim.regenerate') }}</button>
             </div>
           }
        </div>
      }

      <div class="p-2 text-center bg-[var(--vibe-bg-header)] z-20">
         <button (click)="finish()" class="text-sm font-bold uppercase tracking-wide hover:underline text-[var(--vibe-accent)]">
            {{ wf.t('sim.finalize') }}
         </button>
      </div>
    </div>
    <style>
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
      @keyframes bounce-in { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
      .animate-bounce-in { animation: bounce-in 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    </style>
  `
})
export class SimulationComponent implements OnInit, AfterViewChecked {
  wf = inject(WorkflowService); // Public
  private gemini = inject(GeminiService);
  
  mode = signal<'chat' | 'quotes'>('chat');
  messages = signal<ChatMessage[]>([]);
  userInput = '';
  isProcessing = signal(false);
  turnCount = signal(0);
  remainingTurns = computed(() => 10 - this.turnCount());
  
  quoteContent = signal('');
  
  private chatSession: Chat | null = null;
  
  showScrollButton = signal(false);
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  ngOnInit() {
    this.chatSession = this.gemini.startSimulationChat(this.wf.state().currentDraft);
  }

  ngAfterViewChecked() {
    if (this.mode() === 'chat' && !this.showScrollButton()) {
       this.scrollToBottom();
    }
  }

  onScroll() {
    if (this.mode() !== 'chat') return;
    const el = this.scrollContainer.nativeElement;
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 100;
    this.showScrollButton.set(!isAtBottom);
  }

  scrollToBottom(force = false) {
    try { 
        if (this.mode() === 'chat') {
            this.scrollContainer.nativeElement.scrollTo({ top: this.scrollContainer.nativeElement.scrollHeight, behavior: 'smooth' });
        }
    } catch(e){}
  }

  toggleMode(m: 'chat' | 'quotes') {
    this.mode.set(m);
    if (m === 'quotes' && !this.quoteContent()) {
      this.generateQuotes();
    }
  }

  async generateQuotes() {
    this.isProcessing.set(true);
    try {
      const q = await this.gemini.generateQuotes(this.wf.state().currentDraft);
      this.quoteContent.set(q);
    } finally {
      this.isProcessing.set(false);
    }
  }

  async sendMessage() {
    if (!this.userInput.trim() || this.isProcessing() || this.remainingTurns() <= 0) return;
    
    const text = this.userInput;
    this.userInput = '';
    this.messages.update(m => [...m, { role: 'user', text }]);
    this.turnCount.update(c => c + 1);
    this.isProcessing.set(true);
    setTimeout(() => this.scrollToBottom(), 0);

    try {
      const response = await this.chatSession!.sendMessage({ message: text });
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      this.messages.update(m => [...m, { role: 'model', text: response.text, groundingChunks }]);
    } catch (e) {
      this.messages.update(m => [...m, { role: 'model', text: this.wf.t('sim.error_message') }]);
    } finally {
      this.isProcessing.set(false);
      this.scrollToBottom();
    }
  }

  finish() {
    this.wf.setStep('final');
  }
}