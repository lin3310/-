import { Component, inject, computed, ViewChild, ElementRef, signal, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService } from '../../services/workflow.service';
import { IconComponent } from '../ui/icon.component';

@Component({
  selector: 'app-final',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="flex flex-col h-full bg-[var(--final-bg-main)] relative">
      
      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto px-6 pb-6 scroll-smooth" #scrollContainer (scroll)="onScroll()">
        <div class="p-8 text-center animate-slideDown">
            <div class="w-16 h-16 bg-[var(--final-accent-bg)] text-[var(--final-on-accent)] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <app-icon name="check" [size]="36"></app-icon>
            </div>
            <h2 class="text-3xl font-bold text-[var(--final-accent)] font-display">{{ wf.t('final.title') }}</h2>
            <p class="text-[var(--final-accent-light)]">{{ wf.t('final.subtitle') }}</p>
        </div>

        <div class="max-w-4xl mx-auto relative group">
          <div class="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <button (click)="copy()" class="bg-[var(--final-accent)] text-[var(--final-on-accent)] px-3 py-2 rounded-lg text-xs font-bold shadow-md hover:scale-105 transition-transform flex items-center gap-1">
              <app-icon name="content_copy" [size]="16"></app-icon> {{ wf.t('common.copy') }}
            </button>
          </div>
          <div class="bg-[var(--final-bg-card)] p-8 rounded-xl shadow-lg border border-[var(--final-border)]">
            <pre class="whitespace-pre-wrap font-mono text-sm text-[var(--text-primary)] leading-relaxed">{{ prompt() }}</pre>
          </div>
        </div>
        
        <!-- Export Actions -->
        <div class="max-w-4xl mx-auto mt-6">
           <h3 class="text-sm font-bold text-[var(--final-accent-light)] uppercase tracking-wider mb-3 text-center">{{ wf.t('final.export_options') }}</h3>
           <div class="flex flex-wrap justify-center gap-3">
              <button (click)="download('md')" class="px-4 py-2 bg-[var(--final-bg-card)] border border-[var(--final-border)] text-[var(--final-accent)] rounded-full hover:bg-black/5 transition-colors flex items-center gap-2 text-sm font-bold shadow-sm">
                 <app-icon name="markdown" [size]="18"></app-icon> {{ wf.t('final.export_md') }}
              </button>
              <button (click)="download('txt')" class="px-4 py-2 bg-[var(--final-bg-card)] border border-[var(--final-border)] text-[var(--final-accent)] rounded-full hover:bg-black/5 transition-colors flex items-center gap-2 text-sm font-bold shadow-sm">
                 <app-icon name="description" [size]="18"></app-icon> {{ wf.t('final.export_txt') }}
              </button>
              <button (click)="download('json')" class="px-4 py-2 bg-[var(--final-bg-card)] border border-[var(--final-border)] text-[var(--final-accent)] rounded-full hover:bg-black/5 transition-colors flex items-center gap-2 text-sm font-bold shadow-sm">
                 <app-icon name="data_object" [size]="18"></app-icon> {{ wf.t('final.export_json') }}
              </button>
           </div>
        </div>
        <div class="h-10"></div>
      </div>

      <!-- Scroll Button -->
      @if (showScrollButton()) {
        <button (click)="scrollToBottom()" class="absolute bottom-24 right-6 z-20 w-12 h-12 rounded-full bg-[var(--final-accent)] text-[var(--final-on-accent)] shadow-lg flex items-center justify-center hover:opacity-90 transition-all animate-bounce-in border border-[var(--final-border)]">
          <app-icon name="arrow_downward" [size]="24"></app-icon>
        </button>
      }

      <div class="p-6 text-center border-t border-[var(--final-border)] bg-[var(--final-bg-main)] z-10">
        <button (click)="restart()" class="text-[var(--final-accent-light)] hover:text-[var(--final-accent)] font-medium flex items-center justify-center gap-2 mx-auto transition-colors">
           <app-icon name="restart_alt" [size]="20"></app-icon> {{ wf.t('common.create_new') }}
        </button>
      </div>
    </div>
    <style>
      @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
      .animate-slideDown { animation: slideDown 0.6s ease-out forwards; }
      @keyframes bounce-in { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
      .animate-bounce-in { animation: bounce-in 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    </style>
  `
})
export class FinalComponent implements AfterViewChecked {
  wf = inject(WorkflowService);
  prompt = computed(() => this.wf.state().currentDraft);

  showScrollButton = signal(false);
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  ngAfterViewChecked() {
    // Initial check handled by user interaction
  }

  onScroll() {
    const el = this.scrollContainer.nativeElement;
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 100;
    this.showScrollButton.set(!isAtBottom);
  }

  scrollToBottom() {
    try {
      this.scrollContainer.nativeElement.scrollTo({ top: this.scrollContainer.nativeElement.scrollHeight, behavior: 'smooth' });
    } catch(e) {}
  }

  copy() {
    navigator.clipboard.writeText(this.prompt());
    alert(this.wf.t('common.copied'));
  }

  download(ext: 'md' | 'txt' | 'json') {
    let content = this.prompt();
    let filename = `Persona_Prompt_${new Date().toISOString().split('T')[0]}.${ext}`;

    if (ext === 'json') {
        const structured = this.wf.state().structuredPersona;
        if (structured) {
           content = JSON.stringify({
              systemPrompt: content,
              metadata: structured
           }, null, 2);
        } else {
           content = JSON.stringify({ systemPrompt: content }, null, 2);
        }
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  restart() {
    if (confirm(this.wf.t('common.confirm_restart'))) {
        this.wf.reset();
    }
  }
}