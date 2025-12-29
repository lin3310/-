import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../services/gemini.service';
import { WorkflowService, ChatMessage, GroundingChunk } from '../services/workflow.service';
import { IconComponent } from './ui/icon.component';
import { Chat } from '@google/genai';

@Component({
  selector: 'app-director',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="flex flex-col h-full bg-[var(--vibe-bg-main)] relative">
      
      <!-- Header -->
      <div class="flex items-center justify-between p-4 shadow-sm z-10 bg-[var(--vibe-bg-header)] text-[var(--vibe-accent)] border-b border-[var(--vibe-border)]">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full text-[var(--vibe-on-accent)] flex items-center justify-center bg-[var(--vibe-accent-bg)]">
             <app-icon name="psychology" [size]="24"></app-icon>
          </div>
          <div>
            <h2 class="text-lg font-bold">{{ wf.t('crys.btn_refine') }}</h2>
            <p class="text-xs opacity-70">{{ wf.t('director.subtitle') }}</p>
          </div>
        </div>
        <!-- Rollback/Back Button -->
        <button (click)="goBack()" class="px-3 py-1 rounded-full border text-xs font-bold hover:bg-black/10 transition-colors border-[var(--vibe-accent)]">
          {{ wf.t('common.back') }}
        </button>
      </div>

      <!-- Chat Area -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth" #scrollContainer (scroll)="onScroll()">
        @for (msg of messages(); track $index) {
          <div class="flex w-full" [class.justify-end]="msg.role === 'user'">
            <div class="max-w-[85%] flex flex-col" [class.items-end]="msg.role === 'user'" [class.items-start]="msg.role === 'model'">
              <div class="flex gap-2 items-start" [class.flex-row-reverse]="msg.role === 'user'">
                <!-- Avatar -->
                <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs bg-[var(--vibe-bg-header)] text-[var(--vibe-accent)]"
                     [class.bg-[var(--vibe-accent-bg)]]="msg.role === 'user'"
                     [class.text-[var(--vibe-on-accent)]]="msg.role === 'user'">
                  <app-icon [name]="msg.role === 'model' ? 'movie_filter' : 'person'" [size]="16"></app-icon>
                </div>

                <!-- Message -->
                <div class="p-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap"
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
                  <div class="mt-2 text-xs w-full max-w-md" [class.ml-10]="msg.role === 'model'">
                     <div class="font-bold mb-1 pl-1 text-[var(--vibe-accent)]/80">{{ wf.t('director.sources') }}:</div>
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
        <button (click)="scrollToBottom()" class="absolute bottom-24 right-6 w-10 h-10 rounded-full shadow-md flex items-center justify-center hover:opacity-90 transition-all z-20 animate-bounce-in border bg-[var(--vibe-bg-header)] text-[var(--vibe-accent)] border-[var(--vibe-border)]">
          <app-icon name="arrow_downward" [size]="20"></app-icon>
        </button>
      }

      <!-- Input Area -->
      <div class="p-4 bg-[var(--vibe-bg-card)] border-t z-10 border-[var(--vibe-border)]">
        <div class="flex gap-2 items-end max-w-4xl mx-auto relative">
          <textarea [(ngModel)]="userInput" (keydown.enter)="sendMessage($event)" placeholder="Reply to the Director..."
            class="w-full rounded-3xl py-3 px-5 pr-14 outline-none focus:ring-2 resize-none overflow-hidden min-h-[52px] max-h-[150px] bg-[var(--vibe-bg-input)] focus:ring-[var(--vibe-accent)] text-[var(--text-primary)]"
            rows="1"></textarea>
          <button (click)="sendMessage()" [disabled]="!userInput.trim() || isProcessing()"
            class="absolute right-2 bottom-2 w-10 h-10 rounded-full text-[var(--vibe-on-accent)] flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-all shadow-md active:scale-95 bg-[var(--vibe-accent-bg)]">
            <app-icon name="send" [size]="20"></app-icon>
          </button>
        </div>
        <div class="text-center mt-2 flex justify-center gap-4">
           <!-- Auto-Fill Button -->
           <button (click)="sendMessage({text: wf.t('director.skip_text')})" 
                   [disabled]="isProcessing()" 
                   class="text-xs hover:bg-black/5 font-bold px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 text-[var(--vibe-accent)] border-[var(--vibe-border)]">
             <app-icon name="auto_awesome" [size]="14"></app-icon>
             {{ wf.t('director.skip_btn') }}
           </button>

           <!-- Finish Button -->
           <button (click)="finishRefining()" 
                   [disabled]="isProcessing()" 
                   class="text-xs hover:underline font-bold px-3 py-1.5 rounded-full text-[var(--vibe-on-accent)] transition-colors shadow-sm flex items-center gap-1 bg-[var(--vibe-accent-bg)]">
             <app-icon name="check_circle" [size]="14"></app-icon>
             {{ wf.t('director.finish_btn') }}
           </button>
        </div>
      </div>
    </div>
     <style>
       @keyframes bounce-in { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
      .animate-bounce-in { animation: bounce-in 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    </style>
  `
})
export class DirectorComponent implements OnInit, AfterViewChecked {
  private gemini = inject(GeminiService);
  wf = inject(WorkflowService); // Public for template
  exit = output<void>(); // Added output to signal exit

  private chatSession: Chat | null = null;
  
  messages = signal<ChatMessage[]>([]);
  userInput = '';
  isProcessing = signal(false);
  showScrollButton = signal(false);
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  ngOnInit() {
    this.startSession();
  }

  ngAfterViewChecked() { if (!this.showScrollButton()) this.scrollToBottom(); }

  onScroll() {
    const el = this.scrollContainer.nativeElement;
    this.showScrollButton.set(el.scrollHeight - el.scrollTop > el.clientHeight + 100);
  }

  scrollToBottom() { try { this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight; } catch(e){} }

  async startSession() {
    this.isProcessing.set(true);
    // Pass current draft to Director
    this.chatSession = this.gemini.startDirectorChat(this.wf.state().currentDraft);
    
    try {
      // Trigger the AI to start the interview (Module 1, Question 1)
      const triggerPhrase = this.wf.t('director.system.ready_prompt');
      const resultStream = await this.chatSession.sendMessageStream({ message: triggerPhrase });
      
      this.messages.update(m => [...m, { role: 'model', text: '', isStreaming: true }]);
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
      }
      const finalChunks = Array.from(groundingChunkMap.values());
      this.messages.update(m => [...m.slice(0, -1), { role: 'model', text: fullText, isStreaming: false, groundingChunks: finalChunks }]);

    } catch { 
      this.messages.update(m => [...m, { role: 'model', text: this.wf.t('director.error_offline') }]);
    } finally { this.isProcessing.set(false); }
  }

  async sendMessage(event?: Event | { text: string }) {
    if (event && 'preventDefault' in event) event.preventDefault();
    
    const text = (event && 'text' in event) ? event.text : this.userInput;
    if (!text.trim() || this.isProcessing()) return;

    if (!(event && 'text' in event)) this.userInput = '';
    
    this.messages.update(m => [...m, { role: 'user', text }]);
    this.isProcessing.set(true);
    setTimeout(() => this.scrollToBottom(), 0);

    try {
      const resultStream = await this.chatSession!.sendMessageStream({ message: text });
      this.messages.update(m => [...m, { role: 'model', text: '', isStreaming: true }]);
      
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
        if (!this.showScrollButton()) this.scrollToBottom();
      }
      const finalChunks = Array.from(groundingChunkMap.values());
      this.messages.update(m => [...m.slice(0, -1), { role: 'model', text: fullText, isStreaming: false, groundingChunks: finalChunks }]);
    } finally {
      this.isProcessing.set(false);
      this.scrollToBottom();
    }
  }

  async finishRefining() {
    this.isProcessing.set(true);
    try {
        const prompt = this.wf.t('director.system.compile_prompt');
        this.messages.update(m => [...m, { role: 'user', text: `[${this.wf.t('common.compiling')}]` }]);
        
        const response = await this.chatSession!.sendMessage({ message: prompt });
        const updatedDraft = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

        this.messages.update(m => [...m, { role: 'model', text: updatedDraft, groundingChunks: groundingChunks }]);
        
        this.wf.pushState({ 
            currentDraft: updatedDraft,
            step: 'check' 
        });
    } catch(e) {
        alert(this.wf.t('common.error.compilation_failed'));
    } finally {
        this.isProcessing.set(false);
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
