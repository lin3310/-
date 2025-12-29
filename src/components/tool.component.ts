import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../services/gemini.service';
import { WorkflowService, ChatMessage, GroundingChunk } from '../services/workflow.service';
import { IconComponent } from './ui/icon.component';
import { Chat } from '@google/genai';

@Component({
  selector: 'app-tool',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="flex flex-col h-full bg-[var(--tool-bg-main)] relative font-mono transition-colors duration-500">
      <!-- Header (Industrial Slate Theme) -->
      <div class="flex items-center justify-between p-4 bg-[var(--tool-bg-header)] text-[var(--tool-text-header)] border-b border-[var(--tool-border)] z-10 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-sm bg-[var(--tool-accent)] text-[var(--tool-on-accent)] flex items-center justify-center shadow-sm">
             <app-icon name="precision_manufacturing" [size]="24"></app-icon>
          </div>
          <div>
            <h2 class="text-lg font-bold tracking-tight uppercase">{{ wf.t('tool.title') }}</h2>
            <p class="text-xs text-[var(--tool-accent)] font-bold">{{ wf.t('tool.subtitle') }}</p>
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
                <!-- Avatar (Abstract Symbols) -->
                <div class="flex-shrink-0 w-8 h-8 rounded-none flex items-center justify-center text-xs shadow-sm border border-[var(--tool-accent)]"
                     [class.bg-[var(--tool-accent)]]="msg.role === 'model'"
                     [class.text-[var(--tool-on-accent)]]="msg.role === 'model'"
                     [class.bg-[var(--tool-bg-main)]]="msg.role === 'user'"
                     [class.text-[var(--tool-text-header)]]="msg.role === 'user'">
                  @if (msg.role === 'model') {
                    <app-icon name="code" [size]="16"></app-icon>
                  } @else {
                    <app-icon name="keyboard_arrow_right" [size]="16"></app-icon>
                  }
                </div>

                <!-- Bubble (Strict Rectangles) -->
                <div class="p-4 text-sm leading-relaxed border shadow-sm rounded-none"
                     [class.bg-[var(--tool-bg-card)]]="msg.role === 'model'"
                     [class.border-[var(--tool-border)]]="msg.role === 'model'"
                     [class.text-[var(--tool-text-header)]]="msg.role === 'model'"
                     [class.bg-[var(--tool-bg-bubble-user)]]="msg.role === 'user'"
                     [class.border-[var(--tool-accent)]]="msg.role === 'user'"
                     [class.text-[var(--tool-on-accent)]]="msg.role === 'user'">
                  {{ msg.text }}
                  @if (msg.isStreaming) {
                    <span class="inline-block w-2 h-4 ml-1 bg-current animate-pulse align-middle"></span>
                  }
                </div>
              </div>
              <!-- Grounding Sources -->
              @if (msg.groundingChunks && msg.groundingChunks.length > 0) {
                <div class="mt-2 text-xs w-full max-w-md" [class.ml-11]="msg.role === 'model'">
                   <div class="font-bold mb-1 pl-1 text-[var(--tool-accent)]">{{ wf.t('tool.sources') }}:</div>
                   <div class="flex flex-wrap gap-2">
                     @for(chunk of msg.groundingChunks; track chunk.web.uri) {
                       <a [href]="chunk.web.uri" target="_blank" rel="noopener noreferrer" 
                          class="flex items-center gap-1.5 bg-[var(--tool-bg-card)] px-2 py-1 rounded-sm hover:underline text-[var(--tool-accent)] border border-[var(--tool-border)]">
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
                class="absolute bottom-28 right-6 w-10 h-10 rounded-none bg-[var(--tool-bg-header)] text-[var(--tool-text-header)] shadow-md flex items-center justify-center hover:bg-black/10 transition-all z-20 animate-bounce-in border border-[var(--tool-border)]">
          <app-icon name="arrow_downward" [size]="20"></app-icon>
        </button>
      }

      <!-- Input Area -->
      <div class="p-4 bg-[var(--tool-bg-main)] border-t border-[var(--tool-border)] z-10">
        <div class="flex gap-3 items-end max-w-5xl mx-auto">
          
          <!-- Textarea Wrapper -->
          <div class="relative flex-1 group">
            <textarea 
                [(ngModel)]="userInput" 
                (keydown.enter)="sendMessage($event)"
                [placeholder]="wf.t('tool.placeholder')"
                class="w-full bg-[var(--tool-bg-input)] text-[var(--tool-text-header)] rounded-none py-3 px-4 pr-12 outline-none border border-[var(--tool-border)] focus:border-[var(--tool-accent)] focus:ring-1 focus:ring-[var(--tool-accent)] font-mono text-sm resize-none overflow-hidden min-h-[52px] max-h-[150px] shadow-inner transition-colors"
                rows="1"
            ></textarea>
            
            <!-- Auto-Fill Button (Top Right inside input) -->
            <button (click)="autoFill()" [disabled]="isProcessing()"
                  class="absolute right-2 top-2 p-1.5 rounded-none text-[var(--tool-accent)] opacity-60 hover:opacity-100 hover:bg-black/10 transition-all" 
                  [title]="wf.t('common.auto_fill')">
                <app-icon name="auto_awesome" [size]="18"></app-icon>
            </button>
          </div>

          <!-- Send Button (Static, outside input) -->
          <button 
            (click)="sendMessage()" 
            [disabled]="!userInput.trim() || isProcessing()"
            class="w-12 h-[52px] shrink-0 rounded-none bg-[var(--tool-accent)] text-[var(--tool-on-accent)] flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md">
            <app-icon name="arrow_forward" [size]="24"></app-icon>
          </button>
        </div>
        
        <!-- Wrap Up Button -->
        <div class="text-center mt-3">
           <button (click)="requestWrapUp()" class="text-xs text-[var(--tool-accent)] hover:bg-[var(--tool-bg-header)] px-3 py-1 rounded-none transition-colors font-bold tracking-widest border border-transparent hover:border-[var(--tool-border)] uppercase">
             {{ wf.t('tool.compile') }}
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
export class ToolComponent implements OnInit, AfterViewChecked {
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
    this.chatSession = this.gemini.startToolChat(this.wf.currentLang());
    
    try {
      const response = await this.chatSession.sendMessage({ message: this.wf.t('tool.init_prompt') });
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      this.messages.update(m => [...m, { role: 'model', text: response.text, groundingChunks }]);
    } catch (error) {
      this.messages.update(m => [...m, { role: 'model', text: this.wf.t('common.error.connection_refused') }]);
    } finally {
      this.isProcessing.set(false);
    }
  }

  async sendMessage(event?: Event) {
    if (event) event.preventDefault();
    if (!this.userInput.trim() || this.isProcessing()) return;

    const userText = this.userInput;
    this.userInput = '';
    this.messages.update(m => [...m, { role: 'user', text: userText }]);
    this.isProcessing.set(true);
    
    setTimeout(() => this.scrollToBottom(), 0);

    try {
      const resultStream = await this.chatSession!.sendMessageStream({ message: userText });
      
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
        this.messages.update(m => {
          const last = m[m.length - 1];
          if (last.role === 'model' && last.isStreaming) {
             return [...m.slice(0, -1), { ...last, text: fullText }];
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
  
  async autoFill() {
      this.isProcessing.set(true);
      try {
          const context = {
              history: this.messages().map(m => `${m.role}: ${m.text}`).join('\n')
          };
          const suggestion = await this.gemini.generateFieldSuggestion('Next Command / Input', context, 'Suggest the next logical step or input for the tool. Keep it purely functional.');
          this.userInput = suggestion;
      } finally {
          this.isProcessing.set(false);
      }
  }

  async requestWrapUp() {
    this.userInput = this.wf.t('tool.compile_prompt');
    this.sendMessage();
  }
}
