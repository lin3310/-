
import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../services/gemini.service';
import { WorkflowService, ChatMessage, GroundingChunk } from '../services/workflow.service';
import { IconComponent } from './ui/icon.component';
import { Chat } from '@google/genai';

@Component({
  selector: 'app-antibias',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="flex flex-col h-full bg-[var(--antibias-bg-main)] relative font-mono transition-colors duration-500">
      <!-- Header (Analytical Purple/Slate Theme) -->
      <div class="flex items-center justify-between p-4 bg-[var(--antibias-bg-header)] text-[var(--antibias-text-header)] border-b border-[var(--antibias-border)] z-10 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-[var(--antibias-accent)] text-[var(--antibias-on-accent)] flex items-center justify-center shadow-sm">
             <app-icon name="hub" [size]="24"></app-icon>
          </div>
          <div>
            <h2 class="text-lg font-bold tracking-tight uppercase">{{ wf.t('antibias.title') }}</h2>
            <p class="text-xs text-[var(--antibias-accent)] font-bold">{{ wf.t('antibias.subtitle') }}</p>
          </div>
        </div>
        <button (click)="close.emit()" class="p-2 hover:bg-black/10 transition-colors rounded-lg">
          <app-icon name="close" [size]="24"></app-icon>
        </button>
      </div>

      <!-- Chat Area -->
      <div class="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth" #scrollContainer (scroll)="onScroll()">
        @for (msg of messages(); track $index) {
          <div class="flex w-full animate-fadeIn" [class.justify-end]="msg.role === 'user'">
            <div class="max-w-[90%] flex flex-col" [class.items-end]="msg.role === 'user'" [class.items-start]="msg.role === 'model'">
              <div class="flex gap-3" [class.flex-row-reverse]="msg.role === 'user'">
                <!-- Avatar -->
                <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-sm border border-[var(--antibias-accent)]"
                     [class.bg-[var(--antibias-accent)]]="msg.role === 'model'"
                     [class.text-[var(--antibias-on-accent)]]="msg.role === 'model'"
                     [class.bg-[var(--antibias-bg-main)]]="msg.role === 'user'"
                     [class.text-[var(--antibias-text-header)]]="msg.role === 'user'">
                  @if (msg.role === 'model') {
                    <app-icon name="psychology" [size]="16"></app-icon>
                  } @else {
                    <app-icon name="person" [size]="16"></app-icon>
                  }
                </div>

                <!-- Bubble -->
                <div class="p-4 text-sm leading-relaxed border shadow-sm rounded-xl"
                     [class.bg-[var(--antibias-bg-card)]]="msg.role === 'model'"
                     [class.border-[var(--antibias-border)]]="msg.role === 'model'"
                     [class.text-[var(--text-primary)]]="msg.role === 'model'"
                     [class.bg-[var(--antibias-bg-bubble-user)]]="msg.role === 'user'"
                     [class.border-[var(--antibias-accent)]]="msg.role === 'user'"
                     [class.text-[var(--antibias-on-accent)]]="msg.role === 'user'">
                  {{ msg.text }}
                  @if (msg.isStreaming) {
                    <span class="inline-block w-2 h-4 ml-1 bg-current animate-pulse align-middle"></span>
                  }
                </div>
              </div>
              <!-- Grounding Sources -->
              @if (msg.groundingChunks && msg.groundingChunks.length > 0) {
                <div class="mt-2 text-xs w-full max-w-md" [class.ml-11]="msg.role === 'model'">
                   <div class="font-bold mb-1 pl-1 text-[var(--antibias-accent)]">{{ wf.t('antibias.sources') }}:</div>
                   <div class="flex flex-wrap gap-2">
                     @for(chunk of msg.groundingChunks; track chunk.web.uri) {
                       <a [href]="chunk.web.uri" target="_blank" rel="noopener noreferrer" 
                          class="flex items-center gap-1.5 bg-[var(--antibias-bg-card)] px-2 py-1 rounded-md hover:underline text-[var(--antibias-accent)] border border-[var(--antibias-border)]">
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

      <!-- Scroll Down Button -->
      @if (showScrollButton()) {
        <button (click)="scrollToBottom()" 
                class="absolute bottom-28 right-6 w-10 h-10 rounded-full bg-[var(--antibias-bg-header)] text-[var(--antibias-text-header)] shadow-md flex items-center justify-center hover:bg-black/10 transition-all z-20 animate-bounce-in border border-[var(--antibias-border)]">
          <app-icon name="arrow_downward" [size]="20"></app-icon>
        </button>
      }

      <!-- Input Area -->
      <div class="p-4 bg-[var(--antibias-bg-main)] border-t border-[var(--antibias-border)] z-10">
        <div class="flex gap-3 items-end max-w-5xl mx-auto">
          
          <div class="relative flex-1 group">
            <textarea 
                [(ngModel)]="userInput" 
                (keydown.enter)="sendMessage($event)"
                [placeholder]="wf.t('antibias.placeholder')"
                class="w-full bg-[var(--antibias-bg-input)] text-[var(--text-primary)] rounded-xl py-3 px-4 pr-12 outline-none border border-[var(--antibias-border)] focus:border-[var(--antibias-accent)] focus:ring-1 focus:ring-[var(--antibias-accent)] font-mono text-sm resize-none overflow-hidden min-h-[52px] max-h-[150px] shadow-inner transition-colors"
                rows="1"
            ></textarea>
          </div>

          <button 
            (click)="sendMessage()" 
            [disabled]="!userInput.trim() || isProcessing()"
            class="w-12 h-[52px] shrink-0 rounded-xl bg-[var(--antibias-accent)] text-[var(--antibias-on-accent)] flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md">
            <app-icon name="arrow_forward" [size]="24"></app-icon>
          </button>
        </div>
        
        <div class="text-center mt-3 flex justify-center gap-4 flex-wrap">
           <!-- Unsure Button -->
           <button (click)="sendUnsure()" [disabled]="isProcessing()"
                   class="text-xs text-[var(--antibias-accent)] hover:bg-[var(--antibias-bg-header)] px-3 py-1.5 rounded-lg transition-colors font-bold tracking-wide border border-[var(--antibias-border)] flex items-center gap-1">
             <app-icon name="help_center" [size]="16"></app-icon>
             {{ wf.t('antibias.btn_unsure') }}
           </button>

           <!-- Compile Button -->
           <button (click)="requestWrapUp()" [disabled]="isProcessing()"
                   class="text-xs text-[var(--antibias-accent)] hover:bg-[var(--antibias-bg-header)] px-3 py-1.5 rounded-lg transition-colors font-bold tracking-widest border border-transparent hover:border-[var(--antibias-border)] uppercase flex items-center gap-1">
             <app-icon name="check_circle" [size]="16"></app-icon>
             {{ wf.t('antibias.compile') }}
           </button>
        </div>
      </div>
    </div>
    <style>
      @keyframes bounce-in {
        0% { transform: scale(0); opacity: 0; }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
      }
      .animate-bounce-in {
        animation: bounce-in 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fadeIn {
        animation: fadeIn 0.3s ease-out forwards;
      }
    </style>
  `
})
export class AntiBiasComponent implements OnInit, AfterViewChecked {
  private gemini = inject(GeminiService);
  wf = inject(WorkflowService); // Public for i18n

  private chatSession: Chat | null = null;
  
  close = output<void>();
  messages = signal<ChatMessage[]>([]);
  userInput = '';
  isProcessing = signal(false);
  showScrollButton = signal(false);
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  ngOnInit() {
    this.startSession();
  }

  ngAfterViewChecked() {
    if (!this.showScrollButton()) {
      this.scrollToBottom();
    }
  }

  onScroll() {
    const el = this.scrollContainer.nativeElement;
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 100;
    this.showScrollButton.set(!isAtBottom);
  }

  scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  async startSession() {
    this.isProcessing.set(true);
    this.chatSession = this.gemini.startAntiBiasChat(this.wf.currentLang());
    
    try {
      const response = await this.chatSession.sendMessage({ message: this.wf.t('antibias.init_prompt') });
      const sdkChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const groundingChunks: GroundingChunk[] = sdkChunks
             .filter(c => c.web?.uri)
             .map(c => ({ web: { uri: c.web!.uri!, title: c.web!.title ?? c.web!.uri! } }));

      this.messages.update(m => [...m, { role: 'model', text: response.text, groundingChunks }]);
    } catch (error) {
      this.messages.update(m => [...m, { role: 'model', text: this.wf.t('common.error.connection_refused') }]);
    } finally {
      this.isProcessing.set(false);
    }
  }

  async sendMessage(event?: any) {
    if (event) {
        if (event instanceof KeyboardEvent) {
             if (event.key === 'Enter' && !event.shiftKey) {
                 event.preventDefault();
             } else if (event.key === 'Enter' && event.shiftKey) {
                 return; 
             }
        } else if ('text' in event) {
            // Allow manual text object
        } else {
             event.preventDefault();
        }
    }
    
    const textToSend = (event && 'text' in event) ? event.text : this.userInput;

    if (!textToSend.trim() || this.isProcessing()) return;

    if (!(event && 'text' in event)) {
        this.userInput = '';
    }
    
    this.messages.update(m => [...m, { role: 'user', text: textToSend }]);
    this.isProcessing.set(true);
    
    setTimeout(() => this.scrollToBottom(), 0);

    try {
      const resultStream = await this.chatSession!.sendMessageStream({ message: textToSend });
      
      this.messages.update(m => [...m, { role: 'model', text: '', isStreaming: true }]);
      
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
        const intermediateChunks = Array.from(groundingChunkMap.values());
        this.messages.update(m => {
          const last = m[m.length - 1];
          if (last.role === 'model' && last.isStreaming) {
             return [...m.slice(0, -1), { ...last, text: fullText, groundingChunks: intermediateChunks }];
          }
          return m;
        });
        if (!this.showScrollButton()) {
            this.scrollToBottom();
        }
      }
      
      const finalChunks = Array.from(groundingChunkMap.values());
      this.messages.update(m => {
          const last = m[m.length - 1];
          return [...m.slice(0, -1), { ...last, isStreaming: false, groundingChunks: finalChunks }];
      });

    } catch (error) {
      this.messages.update(m => [...m, { role: 'model', text: this.wf.t('common.error.request_failed') }]);
    } finally {
      this.isProcessing.set(false);
      this.scrollToBottom();
    }
  }

  async sendUnsure() {
      this.sendMessage({ text: this.wf.t('antibias.unsure_prompt') });
  }

  async requestWrapUp() {
    this.sendMessage({ text: this.wf.t('antibias.compile_prompt') });
  }
}
