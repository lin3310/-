import { Component, inject, signal, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowService, StructuredPersona } from '../../services/workflow.service';
import { GeminiService } from '../../services/gemini.service';
import { IconComponent } from '../ui/icon.component';

type PersonaSection = keyof StructuredPersona;

@Component({
  selector: 'app-crystallize',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="flex flex-col h-full bg-[var(--vibe-bg-main)] relative">
         
      <div class="p-6 text-center border-b border-[var(--vibe-border)] shadow-sm z-10 bg-[var(--vibe-bg-main)]">
        <h2 class="text-2xl font-bold text-[var(--text-primary)] font-display">{{ wf.t('crys.title') }}</h2>
        <p class="opacity-70 text-[var(--text-secondary)]">{{ wf.t('crys.subtitle') }}</p>
      </div>

      <div class="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth" #scrollContainer (scroll)="onScroll()">
        @if (isLoading()) {
          <div class="flex flex-col items-center justify-center h-full animate-pulse text-[var(--vibe-accent)]">
            <app-icon name="psychology" [size]="48" class="mb-4"></app-icon>
            <p class="font-medium">{{ wf.t('common.loading') }}</p>
          </div>
        } @else if (structuredPersona()) {
          <div class="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
            @for (card of personaCards; track card.key) {
              <div class="bg-[var(--vibe-bg-card)]/80 backdrop-blur-sm rounded-2xl shadow-lg border p-5 flex flex-col animate-fadeInUp border-[var(--vibe-border)] hover:shadow-xl transition-shadow" 
                   [style.animation-delay]="($index * 100) + 'ms'">
                <h3 class="text-base font-bold uppercase tracking-wider mb-3 flex items-center gap-2 text-[var(--vibe-accent)]">
                  <app-icon [name]="card.icon" [size]="20"></app-icon>
                  {{ wf.t(card.titleKey) }}
                </h3>
                
                @if (editingKey() === card.key) {
                  <textarea [(ngModel)]="editableContent" class="flex-1 w-full bg-[var(--vibe-bg-input)] border rounded-lg p-3 text-sm focus:ring-2 outline-none border-[var(--vibe-border)] focus:ring-[var(--vibe-accent)] text-[var(--text-primary)] leading-relaxed"
                            rows="8"></textarea>
                } @else {
                  <p class="flex-1 whitespace-pre-wrap text-sm text-[var(--text-secondary)] font-serif leading-relaxed">{{ structuredPersona()![card.key] }}</p>
                }

                <div class="mt-4 flex justify-end gap-2 items-center">
                   @if (cardLoading() === card.key) {
                     <div class="text-xs animate-pulse font-medium text-[var(--vibe-accent)]">{{ wf.t('common.loading') }}</div>
                   } @else if (editingKey() === card.key) {
                      <button (click)="cancelEdit()" class="p-2 rounded-full hover:bg-black/10 transition-colors">
                        <app-icon name="close" [size]="20" class="text-[var(--text-secondary)]"></app-icon>
                      </button>
                      <button (click)="saveEdit(card.key)" class="p-2 rounded-full hover:bg-green-500/20 transition-colors">
                        <app-icon name="check" [size]="20" class="text-green-600 dark:text-green-400"></app-icon>
                      </button>
                   } @else {
                      <button (click)="regenerate(card.key)" title="Regenerate" class="p-2 rounded-full transition-colors opacity-70 hover:opacity-100 bg-[var(--vibe-bg-header)] hover:bg-[var(--vibe-accent-bg)] hover:text-[var(--vibe-on-accent)]">
                        <app-icon name="autorenew" [size]="20"></app-icon>
                      </button>
                      <button (click)="startEdit(card.key)" title="Edit" class="p-2 rounded-full transition-colors opacity-70 hover:opacity-100 bg-[var(--vibe-bg-header)] hover:bg-[var(--vibe-accent-bg)] hover:text-[var(--vibe-on-accent)]">
                        <app-icon name="edit" [size]="20"></app-icon>
                      </button>
                   }
                </div>
              </div>
            }
          </div>
        } @else {
           <div class="text-center text-red-500 p-8">
             <h3 class="text-lg font-bold">{{ wf.t('crys.error.load_failed_title') }}</h3>
             <p>{{ wf.t('crys.error.load_failed_desc') }}</p>
            </div>
        }
      </div>

      <!-- Scroll Button -->
      @if (showScrollButton()) {
        <button (click)="scrollToBottom()" class="absolute bottom-28 right-6 z-20 w-12 h-12 rounded-full bg-[var(--vibe-accent-bg)] text-[var(--vibe-on-accent)] shadow-lg flex items-center justify-center hover:opacity-90 transition-all animate-bounce-in">
          <app-icon name="arrow_downward" [size]="24"></app-icon>
        </button>
      }

       <div class="p-4 md:p-6 bg-[var(--vibe-bg-card)]/90 backdrop-blur-md border-t flex justify-between items-center border-[var(--vibe-border)] z-20">
        <!-- Modify (Back) -->
        <button (click)="goToModify()" [disabled]="!structuredPersona()" 
                class="px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50 hover:bg-black/5 text-[var(--vibe-accent)]">
            <app-icon name="arrow_back" [size]="18"></app-icon>
            <span class="hidden md:inline">{{ wf.t('crys.btn_modify') }}</span>
        </button>
        
        <div class="flex justify-center gap-2 md:gap-4">
            <!-- Refine (Director) -->
            <button (click)="goToRefine()" [disabled]="!structuredPersona()" 
                    class="px-4 py-2 md:px-6 md:py-3 rounded-full border font-bold transition-all flex items-center gap-2 disabled:opacity-50 hover:bg-black/5 border-[var(--vibe-accent)] text-[var(--vibe-accent)] shadow-sm">
              <app-icon name="psychology" [size]="20"></app-icon>
              <span class="text-xs md:text-sm">{{ wf.t('crys.btn_refine') }}</span>
            </button>
            
            <!-- Check (Next) -->
            <button (click)="goToCheck()" [disabled]="!structuredPersona()" 
                    class="px-4 py-2 md:px-6 md:py-3 rounded-full text-[var(--vibe-on-accent)] font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 hover:opacity-90 active:scale-95 bg-[var(--vibe-accent-bg)]">
              <span class="text-xs md:text-sm">{{ wf.t('crys.btn_check') }}</span>
              <app-icon name="arrow_forward" [size]="20"></app-icon>
            </button>
        </div>
      </div>
    </div>
     <style>
      @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      .animate-fadeInUp { animation: fadeInUp 0.5s ease-out forwards; opacity: 0; }
      @keyframes bounce-in { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
      .animate-bounce-in { animation: bounce-in 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    </style>
  `
})
export class CrystallizeComponent implements OnInit, AfterViewChecked {
  wf = inject(WorkflowService); // Public for template
  private gemini = inject(GeminiService);

  isLoading = signal(true);
  structuredPersona = signal<StructuredPersona | null>(null);
  editingKey = signal<PersonaSection | null>(null);
  editableContent = '';
  cardLoading = signal<PersonaSection | null>(null);
  
  showScrollButton = signal(false);
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  
  personaCards: { key: PersonaSection, titleKey: any, icon: string }[] = [
    { key: 'appearance', titleKey: 'crys.card_appearance', icon: 'visibility' },
    { key: 'personality', titleKey: 'crys.card_personality', icon: 'sentiment_very_satisfied' },
    { key: 'backstory', titleKey: 'crys.card_backstory', icon: 'history_edu' },
    { key: 'speechStyle', titleKey: 'crys.card_speechStyle', icon: 'record_voice_over' },
    { key: 'behaviors', titleKey: 'crys.card_behaviors', icon: 'psychology_alt' },
  ];

  ngOnInit() {
    const persona = this.wf.state().structuredPersona;
    if (persona) {
      this.structuredPersona.set(persona);
    }
    this.isLoading.set(false);
  }

  ngAfterViewChecked() {
    // Initial check handled by template/user interaction
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

  startEdit(key: PersonaSection) {
    this.editingKey.set(key);
    this.editableContent = this.structuredPersona()![key];
  }

  cancelEdit() {
    this.editingKey.set(null);
  }

  saveEdit(key: PersonaSection) {
    const current = this.structuredPersona();
    if (current) {
      this.structuredPersona.set({ ...current, [key]: this.editableContent });
    }
    this.editingKey.set(null);
  }

  async regenerate(key: PersonaSection) {
    this.cardLoading.set(key);
    const current = this.structuredPersona();
    if (current) {
      try {
        const newContent = await this.gemini.regenerateVibeSection(this.wf.state().vibeFragment!, current, key);
        this.structuredPersona.set({ ...current, [key]: newContent });
      } catch (e) {
        console.error("Regeneration failed", e);
        alert(this.wf.t('crys.error.regeneration_failed'));
      } finally {
        this.cardLoading.set(null);
      }
    }
  }

  private compileAndSaveDraft() {
    const persona = this.structuredPersona();
    if (!persona) return;
    const finalDraft = this.gemini.compileStructuredPrompt(persona);
    this.wf.pushState({
      structuredPersona: persona,
      currentDraft: finalDraft
    });
  }
  
  goToModify() {
    this.wf.pushState({ step: 'vibe-entry', isModifying: true });
  }

  goToRefine() {
    this.compileAndSaveDraft();
    this.wf.setStep('refine-director');
  }

  goToCheck() {
    this.compileAndSaveDraft();
    this.wf.setStep('check');
  }
}