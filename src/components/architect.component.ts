import { Component, inject, signal, output, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { GeminiService } from '../services/gemini.service';
import { WorkflowService } from '../services/workflow.service';
import { IconComponent } from './ui/icon.component';

@Component({
  selector: 'app-architect',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col h-full bg-[var(--arch-bg-main)] overflow-hidden relative">
       <!-- Header -->
      <div class="flex items-center justify-between p-4 bg-[var(--arch-bg-header)] backdrop-blur-md border-b border-[var(--arch-border)] z-10 shadow-sm">
        <div class="flex items-center gap-3">
           <div class="w-10 h-10 rounded-full bg-[var(--arch-accent-bg)] text-[var(--arch-on-accent)] flex items-center justify-center shadow-md">
             <app-icon name="architecture" [size]="24"></app-icon>
          </div>
          <div>
            <h2 class="text-lg font-bold text-[var(--arch-text-secondary)]">{{ wf.t('arch.title') }}</h2>
            <p class="text-xs text-[var(--arch-accent)]/70">{{ wf.t('arch.subtitle') }}</p>
          </div>
        </div>
        <button (click)="close.emit()" class="p-2 rounded-full hover:bg-black/10 transition-colors text-[var(--arch-accent)]">
          <app-icon name="close" [size]="24"></app-icon>
        </button>
      </div>

      <!-- Main Content (Stepper) -->
      <div class="flex-1 overflow-y-auto scroll-smooth" #scrollContainer (scroll)="onScroll()">
        <div class="max-w-3xl mx-auto p-6 pb-20">
          
          <!-- Progress Bar -->
          <div class="flex items-center justify-between mb-10 px-4">
             @for (step of steps; track $index) {
                <div class="flex flex-col items-center gap-2 cursor-pointer relative z-10 group" 
                     (click)="currentStep.set($index)"
                     [class.opacity-50]="currentStep() < $index">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-sm group-hover:scale-110"
                       [class.bg-[var(--arch-accent-bg)]]="currentStep() >= $index"
                       [class.text-[var(--arch-on-accent)]]="currentStep() >= $index"
                       [class.bg-[var(--arch-bg-step-inactive)]]="currentStep() < $index"
                       [class.text-[var(--arch-text-secondary)]]="currentStep() < $index">
                    {{ $index + 1 }}
                  </div>
                  <span class="text-xs font-bold tracking-wide" [class.text-[var(--arch-accent)]]="currentStep() >= $index">{{ wf.t(step.label) }}</span>
                </div>
                @if ($index < steps.length - 1) {
                  <div class="flex-1 h-[2px] mx-2 rounded-full transition-colors duration-500" 
                       [class.bg-[var(--arch-accent-bg)]]="currentStep() > $index"
                       [class.bg-[var(--arch-bg-step-inactive)]]="currentStep() <= $index"></div>
                }
             }
          </div>

          <form [formGroup]="form" class="space-y-8">
            
            <!-- Step 1: Core Identity -->
            @if (currentStep() === 0) {
              <div class="space-y-6 animate-fadeIn">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Name -->
                  <div class="space-y-2 relative group">
                    <label class="text-sm font-bold text-[var(--arch-text-secondary)] ml-1">{{ wf.t('arch.label_name') }}</label>
                    <div class="relative">
                      <input formControlName="name" type="text" class="w-full p-4 bg-[var(--arch-bg-input)] border border-[var(--arch-border)] rounded-2xl focus:ring-2 focus:ring-[var(--arch-accent)] outline-none shadow-sm transition-all text-[var(--text-primary)] pr-12">
                      <button (click)="magicFill('name')" type="button" [disabled]="isGenerating()" 
                              class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-black/10 text-[var(--arch-accent)] transition-colors" title="{{ wf.t('common.auto_fill') }}">
                         <app-icon name="auto_awesome" [size]="20"></app-icon>
                      </button>
                    </div>
                  </div>
                   <!-- Age -->
                   <div class="space-y-2 relative">
                    <label class="text-sm font-bold text-[var(--arch-text-secondary)] ml-1">{{ wf.t('arch.label_age') }}</label>
                    <div class="relative">
                      <input formControlName="age" type="text" class="w-full p-4 bg-[var(--arch-bg-input)] border border-[var(--arch-border)] rounded-2xl focus:ring-2 focus:ring-[var(--arch-accent)] outline-none shadow-sm transition-all text-[var(--text-primary)] pr-12">
                      <button (click)="magicFill('age')" type="button" [disabled]="isGenerating()"
                              class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-black/10 text-[var(--arch-accent)] transition-colors" title="{{ wf.t('common.auto_fill') }}">
                         <app-icon name="auto_awesome" [size]="20"></app-icon>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Relationship -->
                <div class="space-y-2">
                    <label class="text-sm font-bold text-[var(--arch-text-secondary)] ml-1">{{ wf.t('arch.label_rel') }} <span class="text-red-500">*</span></label>
                    <div class="relative">
                      <textarea formControlName="relationship" rows="3" class="w-full p-4 bg-[var(--arch-bg-input)] border border-[var(--arch-border)] rounded-2xl focus:ring-2 focus:ring-[var(--arch-accent)] outline-none shadow-sm transition-all text-[var(--text-primary)] pr-12 resize-none"></textarea>
                      <button (click)="magicFill('relationship')" type="button" [disabled]="isGenerating()"
                              class="absolute right-3 top-3 p-2 rounded-full hover:bg-black/10 text-[var(--arch-accent)] transition-colors" title="{{ wf.t('common.auto_fill') }}">
                         <app-icon name="auto_awesome" [size]="20"></app-icon>
                      </button>
                    </div>
                </div>

                <!-- Tags -->
                <div class="space-y-2">
                    <label class="text-sm font-bold text-[var(--arch-text-secondary)] ml-1">{{ wf.t('arch.label_tags') }}</label>
                    <div class="relative">
                      <input formControlName="tags" type="text" [placeholder]="wf.t('arch.placeholder_tags')" class="w-full p-4 bg-[var(--arch-bg-input)] border border-[var(--arch-border)] rounded-2xl focus:ring-2 focus:ring-[var(--arch-accent)] outline-none shadow-sm transition-all text-[var(--text-primary)] pr-12">
                      <button (click)="magicFill('tags')" type="button" [disabled]="isGenerating()"
                              class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-black/10 text-[var(--arch-accent)] transition-colors" title="{{ wf.t('common.auto_fill') }}">
                         <app-icon name="auto_awesome" [size]="20"></app-icon>
                      </button>
                    </div>
                </div>

                <!-- Fusion Description -->
                <div class="space-y-2">
                    <label class="text-sm font-bold text-[var(--arch-text-secondary)] ml-1">{{ wf.t('arch.label_desc') }}</label>
                    <div class="relative">
                      <textarea formControlName="fusionDescription" rows="5" class="w-full p-4 bg-[var(--arch-bg-input)] border border-[var(--arch-border)] rounded-2xl focus:ring-2 focus:ring-[var(--arch-accent)] outline-none shadow-sm transition-all text-[var(--text-primary)] pr-12 resize-none"></textarea>
                      <button (click)="magicFill('fusionDescription')" type="button" [disabled]="isGenerating()"
                              class="absolute right-3 top-3 p-2 rounded-full hover:bg-black/10 text-[var(--arch-accent)] transition-colors" title="{{ wf.t('common.auto_fill') }}">
                         <app-icon name="auto_awesome" [size]="20"></app-icon>
                      </button>
                    </div>
                </div>
              </div>
            }

            <!-- Step 2: Language -->
            @if (currentStep() === 1) {
               <div class="space-y-6 animate-fadeIn">
                <!-- Lang -->
                <div class="space-y-2">
                    <label class="text-sm font-bold text-[var(--arch-text-secondary)] ml-1">{{ wf.t('arch.label_lang') }}</label>
                    <div class="relative">
                       <input formControlName="primaryLang" type="text" class="w-full p-4 bg-[var(--arch-bg-input)] border border-[var(--arch-border)] rounded-2xl focus:ring-2 focus:ring-[var(--arch-accent)] outline-none shadow-sm transition-all text-[var(--text-primary)] pr-12">
                       <button (click)="magicFill('primaryLang')" type="button" [disabled]="isGenerating()"
                              class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-black/10 text-[var(--arch-accent)] transition-colors" title="{{ wf.t('common.auto_fill') }}">
                         <app-icon name="auto_awesome" [size]="20"></app-icon>
                      </button>
                    </div>
                </div>
                <!-- Proficiency -->
                <div class="space-y-2">
                    <label class="text-sm font-bold text-[var(--arch-text-secondary)] ml-1">{{ wf.t('arch.label_prof') }}</label>
                    <div class="relative">
                      <input formControlName="proficiency" type="text" class="w-full p-4 bg-[var(--arch-bg-input)] border border-[var(--arch-border)] rounded-2xl focus:ring-2 focus:ring-[var(--arch-accent)] outline-none shadow-sm transition-all text-[var(--text-primary)] pr-12">
                      <button (click)="magicFill('proficiency')" type="button" [disabled]="isGenerating()"
                              class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-black/10 text-[var(--arch-accent)] transition-colors" title="{{ wf.t('common.auto_fill') }}">
                         <app-icon name="auto_awesome" [size]="20"></app-icon>
                      </button>
                    </div>
                </div>
                <!-- Tics -->
                <div class="space-y-2">
                    <label class="text-sm font-bold text-[var(--arch-text-secondary)] ml-1">{{ wf.t('arch.label_tics') }}</label>
                     <div class="relative">
                      <input formControlName="tics" type="text" class="w-full p-4 bg-[var(--arch-bg-input)] border border-[var(--arch-border)] rounded-2xl focus:ring-2 focus:ring-[var(--arch-accent)] outline-none shadow-sm transition-all text-[var(--text-primary)] pr-12">
                      <button (click)="magicFill('tics')" type="button" [disabled]="isGenerating()"
                              class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-black/10 text-[var(--arch-accent)] transition-colors" title="{{ wf.t('common.auto_fill') }}">
                         <app-icon name="auto_awesome" [size]="20"></app-icon>
                      </button>
                    </div>
                </div>
                <!-- Style Desc -->
                <div class="space-y-2">
                    <label class="text-sm font-bold text-[var(--arch-text-secondary)] ml-1">{{ wf.t('arch.label_style') }}</label>
                     <div class="relative">
                      <textarea formControlName="styleDescription" rows="4" class="w-full p-4 bg-[var(--arch-bg-input)] border border-[var(--arch-border)] rounded-2xl focus:ring-2 focus:ring-[var(--arch-accent)] outline-none shadow-sm transition-all text-[var(--text-primary)] pr-12 resize-none"></textarea>
                       <button (click)="magicFill('styleDescription')" type="button" [disabled]="isGenerating()"
                               class="absolute right-3 top-3 p-2 rounded-full hover:bg-black/10 text-[var(--arch-accent)] transition-colors" title="{{ wf.t('common.auto_fill') }}">
                         <app-icon name="auto_awesome" [size]="20"></app-icon>
                      </button>
                    </div>
                </div>
               </div>
            }

            <!-- Step 3: Attitude & Emotion -->
            @if (currentStep() === 2) {
               <div class="space-y-6 animate-fadeIn">
                 <!-- Demeanor -->
                 <div class="space-y-2">
                    <label class="text-sm font-bold text-[var(--arch-text-secondary)] ml-1">{{ wf.t('arch.label_demeanor') }}</label>
                    <div class="relative">
                      <textarea formControlName="generalDemeanor" rows="3" class="w-full p-4 bg-[var(--arch-bg-input)] border border-[var(--arch-border)] rounded-2xl focus:ring-2 focus:ring-[var(--arch-accent)] outline-none shadow-sm transition-all text-[var(--text-primary)] pr-12 resize-none"></textarea>
                      <button (click)="magicFill('generalDemeanor')" type="button" [disabled]="isGenerating()"
                              class="absolute right-3 top-3 p-2 rounded-full hover:bg-black/10 text-[var(--arch-accent)] transition-colors" title="{{ wf.t('common.auto_fill') }}">
                         <app-icon name="auto_awesome" [size]="20"></app-icon>
                      </button>
                    </div>
                </div>
                 <!-- Towards User -->
                 <div class="space-y-2">
                    <label class="text-sm font-bold text-[var(--arch-text-secondary)] ml-1">{{ wf.t('arch.label_towards') }}</label>
                    <div class="relative">
                       <textarea formControlName="towardsUser" rows="3" class="w-full p-4 bg-[var(--arch-bg-input)] border border-[var(--arch-border)] rounded-2xl focus:ring-2 focus:ring-[var(--arch-accent)] outline-none shadow-sm transition-all text-[var(--text-primary)] pr-12 resize-none"></textarea>
                       <button (click)="magicFill('towardsUser')" type="button" [disabled]="isGenerating()"
                               class="absolute right-3 top-3 p-2 rounded-full hover:bg-black/10 text-[var(--arch-accent)] transition-colors" title="{{ wf.t('common.auto_fill') }}">
                         <app-icon name="auto_awesome" [size]="20"></app-icon>
                       </button>
                    </div>
                </div>
               </div>
            }

            <!-- Step 4: Examples -->
            @if (currentStep() === 3) {
               <div class="space-y-6 animate-fadeIn">
                 <!-- Tone Words -->
                 <div class="space-y-2">
                    <label class="text-sm font-bold text-[var(--arch-text-secondary)] ml-1">{{ wf.t('arch.label_tone') }}</label>
                    <div class="relative">
                      <input formControlName="toneWords" type="text" class="w-full p-4 bg-[var(--arch-bg-input)] border border-[var(--arch-border)] rounded-2xl focus:ring-2 focus:ring-[var(--arch-accent)] outline-none shadow-sm transition-all text-[var(--text-primary)] pr-12">
                      <button (click)="magicFill('toneWords')" type="button" [disabled]="isGenerating()"
                              class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-black/10 text-[var(--arch-accent)] transition-colors" title="{{ wf.t('common.auto_fill') }}">
                         <app-icon name="auto_awesome" [size]="20"></app-icon>
                      </button>
                    </div>
                </div>
                 <!-- Examples -->
                 <div class="space-y-2">
                    <label class="text-sm font-bold text-[var(--arch-text-secondary)] ml-1">{{ wf.t('arch.label_examples') }}</label>
                     <div class="relative">
                       <textarea formControlName="examples" [placeholder]="wf.t('arch.placeholder_examples')" rows="8" class="w-full p-4 bg-[var(--arch-bg-input)] border border-[var(--arch-border)] rounded-2xl focus:ring-2 focus:ring-[var(--arch-accent)] outline-none shadow-sm transition-all text-[var(--text-primary)] pr-12 resize-none"></textarea>
                       <button (click)="magicFill('examples')" type="button" [disabled]="isGenerating()"
                               class="absolute right-3 top-3 p-2 rounded-full hover:bg-black/10 text-[var(--arch-accent)] transition-colors" title="{{ wf.t('common.auto_fill') }}">
                         <app-icon name="auto_awesome" [size]="20"></app-icon>
                      </button>
                    </div>
                </div>
                <!-- Trigger -->
                <div class="space-y-2">
                    <label class="text-sm font-bold text-[var(--arch-text-secondary)] ml-1">{{ wf.t('arch.label_trigger') }}</label>
                    <div class="relative">
                      <input formControlName="finalInstruction" type="text" class="w-full p-4 bg-[var(--arch-bg-input)] border border-[var(--arch-border)] rounded-2xl focus:ring-2 focus:ring-[var(--arch-accent)] outline-none shadow-sm transition-all text-[var(--text-primary)] pr-12">
                      <button (click)="magicFill('finalInstruction')" type="button" [disabled]="isGenerating()"
                              class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-black/10 text-[var(--arch-accent)] transition-colors" title="{{ wf.t('common.auto_fill') }}">
                         <app-icon name="auto_awesome" [size]="20"></app-icon>
                      </button>
                    </div>
                </div>
               </div>
            }

             <!-- Step 5: Result -->
             @if (currentStep() === 4) {
               <div class="space-y-4 animate-fadeIn">
                 <div class="p-6 bg-[var(--arch-bg-card)] border border-[var(--arch-border)] rounded-2xl relative shadow-sm">
                    <pre class="whitespace-pre-wrap text-sm font-mono text-[var(--text-primary)] overflow-x-auto leading-relaxed">{{ generatedPrompt() }}</pre>
                 </div>
                  <div class="flex gap-3 justify-end">
                    <button type="button" (click)="copyToClipboard()" class="px-6 py-2.5 rounded-full text-[var(--arch-accent)] font-bold hover:bg-black/10 transition-colors flex items-center gap-2">
                      <app-icon name="content_copy" [size]="18"></app-icon> {{ wf.t('common.copy') }}
                    </button>
                    <button type="button" (click)="onRefineWithDirector()" class="px-6 py-2.5 rounded-full bg-[var(--arch-accent-bg)] text-[var(--arch-on-accent)] hover:opacity-90 font-bold transition-all shadow-md active:scale-95 flex items-center gap-2">
                      <app-icon name="psychology" [size]="18"></app-icon> {{ wf.t('arch.btn_refine') }}
                    </button>
                  </div>
               </div>
             }

          </form>
        </div>
      </div>

      <!-- Scroll Down Button -->
      @if (showScrollButton()) {
        <button (click)="scrollToBottom()" 
                class="absolute bottom-24 right-6 w-12 h-12 rounded-full bg-[var(--arch-accent-bg)] text-[var(--arch-on-accent)] shadow-lg flex items-center justify-center hover:opacity-90 transition-all z-20 animate-bounce-in">
          <app-icon name="arrow_downward" [size]="24"></app-icon>
        </button>
      }

      <!-- Footer Actions -->
      <div class="p-4 bg-[var(--arch-bg-card)] border-t border-[var(--arch-border)] flex justify-between items-center z-10">
         @if (currentStep() > 0 && currentStep() < 4) {
           <button type="button" (click)="prevStep()" class="px-8 py-3 rounded-full text-[var(--arch-accent)] font-bold hover:bg-black/10 transition-colors flex items-center gap-2">
             <app-icon name="arrow_back" [size]="18"></app-icon>
             {{ wf.t('common.back') }}
           </button>
         } @else {
           <div></div>
         }

         @if (currentStep() < 3) {
           <button type="button" (click)="nextStep()" class="px-8 py-3 rounded-full bg-[var(--arch-accent-bg)] text-[var(--arch-on-accent)] font-bold hover:opacity-90 shadow-md transition-all active:scale-95 flex items-center gap-2">
             {{ wf.t('common.next') }}
             <app-icon name="arrow_forward" [size]="18"></app-icon>
           </button>
         } @else if (currentStep() === 3) {
            <button type="button" (click)="generate()" 
              [disabled]="isGenerating()"
              class="px-8 py-3 rounded-full bg-[var(--arch-accent-bg)] text-[var(--arch-on-accent)] font-bold hover:opacity-90 shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
              @if (isGenerating()) {
                <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              }
              {{ wf.t('arch.btn_generate') }}
           </button>
         } @else {
            <button type="button" (click)="currentStep.set(0)" class="px-8 py-3 rounded-full border border-[var(--arch-accent)] text-[var(--arch-accent)] font-bold hover:bg-black/10 transition-colors">
             {{ wf.t('common.start_over') }}
           </button>
         }
      </div>
      
      <!-- Loading Overlay (Magic Fill) -->
      @if (isGenerating() && currentStep() !== 3 && currentStep() !== 4) {
         <div class="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
            <div class="bg-[var(--arch-bg-card)] p-4 rounded-xl shadow-lg border border-[var(--arch-border)] flex items-center gap-3">
               <span class="animate-spin text-[var(--arch-accent)]"><app-icon name="auto_awesome" [size]="24"></app-icon></span>
               <span class="font-bold text-[var(--arch-accent)]">{{ wf.t('common.ai_magic') }}</span>
            </div>
         </div>
      }
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
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fadeIn {
        animation: fadeIn 0.4s ease-out forwards;
      }
    </style>
  `
})
export class ArchitectComponent {
  private fb: FormBuilder;
  private gemini = inject(GeminiService);
  wf = inject(WorkflowService); // Public for i18n
  
  close = output<void>();
  refineWithDirector = output<string>();
  
  // Mapping steps to translation keys
  steps = [
    { label: 'arch.step1' },
    { label: 'arch.step2' },
    { label: 'arch.step3' },
    { label: 'arch.step4' },
    { label: 'arch.step5' }
  ];
  
  currentStep = signal(0);
  isGenerating = signal(false);
  generatedPrompt = signal('');
  showScrollButton = signal(false);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  form: FormGroup;

  constructor() {
    this.fb = inject(FormBuilder);
    this.form = this.fb.group({
      name: ['', Validators.required],
      age: [''],
      relationship: ['', Validators.required],
      tags: [''],
      fusionDescription: [''],
      primaryLang: [''],
      proficiency: [''],
      tics: [''],
      styleDescription: [''],
      generalDemeanor: [''],
      towardsUser: [''],
      toneWords: [''],
      examples: [''],
      finalInstruction: ['']
    });
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

  nextStep() {
    if (this.currentStep() < this.steps.length - 1) {
      this.currentStep.update(v => v + 1);
      setTimeout(() => this.scrollContainer.nativeElement.scrollTop = 0, 0); 
    }
  }

  prevStep() {
    if (this.currentStep() > 0) {
      this.currentStep.update(v => v - 1);
      setTimeout(() => this.scrollContainer.nativeElement.scrollTop = 0, 0);
    }
  }

  // Use this for the "Magic Wand" buttons
  async magicFill(controlName: string) {
    const control = this.form.get(controlName);
    if (control) {
      this.isGenerating.set(true);
      try {
        // Collect current form data as context
        const context = this.form.value;
        const suggestion = await this.gemini.generateFieldSuggestion(controlName, context);
        control.setValue(suggestion);
      } catch (e) {
          console.error(e);
      } finally {
        this.isGenerating.set(false);
      }
    }
  }

  async generate() {
    this.isGenerating.set(true);
    try {
      const result = await this.gemini.compileArchitectPrompt(this.form.value);
      this.generatedPrompt.set(result);
      this.currentStep.set(4);
      setTimeout(() => this.scrollToBottom(), 100);
    } catch (e) {
      console.error(e);
      alert('Failed to generate prompt');
    } finally {
      this.isGenerating.set(false);
    }
  }

  copyToClipboard() {
    navigator.clipboard.writeText(this.generatedPrompt());
  }
  
  onRefineWithDirector() {
    this.refineWithDirector.emit(this.generatedPrompt());
  }
}
