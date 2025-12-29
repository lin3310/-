import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowService, ConflictItem, RemixData } from '../../services/workflow.service';
import { GeminiService } from '../../services/gemini.service';
import { IconComponent } from '../ui/icon.component';

@Component({
  selector: 'app-check',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="flex flex-col h-full bg-[var(--vibe-bg-main)]">
      
      <!-- Header -->
      <div class="flex items-center p-4 bg-[var(--vibe-bg-card)] border-b shadow-sm shrink-0 border-[var(--vibe-border)]">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-full bg-[var(--vibe-bg-header)]">
              <app-icon name="fact_check" [size]="24" class="text-[var(--vibe-accent)]"></app-icon>
          </div>
          <h2 class="text-lg font-bold text-[var(--vibe-accent)]">{{ wf.t('check.title') }}</h2>
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto relative">
        <div class="p-6 max-w-3xl mx-auto space-y-6 animate-fadeIn">
          
          <!-- Loading State -->
          @if (isAnalyzing()) {
            <div class="flex flex-col items-center justify-center py-20 text-[var(--vibe-accent)]">
              <div class="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mb-6 border-[var(--vibe-border)] border-t-[var(--vibe-accent)]"></div>
              <h3 class="text-xl font-bold">{{ wf.t('common.loading') }}</h3>
              <p class="opacity-60 mt-2">{{ wf.t('check.title') }}...</p>
            </div>
          }

          <!-- Results State -->
          @if (!isAnalyzing()) {
            <!-- Status Header -->
            <div class="p-6 rounded-2xl border flex items-center gap-4 transition-colors"
                 [class.bg-[#eafdf0]]="conflictCount() === 0" [class.dark:bg-[#152b1e]]="conflictCount() === 0"
                 [class.border-[#b7f3cb]]="conflictCount() === 0" [class.dark:border-[#42604f]]="conflictCount() === 0"
                 [class.bg-[#fff8e1]]="conflictCount() > 0" [class.dark:bg-[#2e260e]]="conflictCount() > 0"
                 [class.border-[#ffe082]]="conflictCount() > 0" [class.dark:border-[#6b5b27]]="conflictCount() > 0">
               
               <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                    [class.bg-[#c4eed0]]="conflictCount() === 0" [class.dark:bg-[#2b4737]]="conflictCount() === 0"
                    [class.text-[#146c2e]]="conflictCount() === 0" [class.dark:text-[#a2e0b9]]="conflictCount() === 0"
                    [class.bg-[#ffecb3]]="conflictCount() > 0" [class.dark:bg-[#4a3f1a]]="conflictCount() > 0"
                    [class.text-[#ff6f00]]="conflictCount() > 0" [class.dark:text-[#f7d189]]="conflictCount() > 0">
                  <app-icon [name]="conflictCount() === 0 ? 'check_circle' : 'warning'" [size]="28"></app-icon>
               </div>
               
               <div>
                 <h3 class="font-bold text-lg text-black dark:text-white">
                   {{ conflictCount() === 0 ? wf.t('check.good') : wf.t('check.issues') }}
                 </h3>
                 <p class="text-sm opacity-80 text-black dark:text-gray-300">
                   {{ wf.t('check.items_found', { count: conflictCount() }) }}
                 </p>
               </div>
            </div>

            <!-- Conflict Cards List -->
            @if (conflicts().length > 0) {
               <div class="space-y-4">
                 @for (conflict of conflicts(); track $index) {
                   <div class="bg-[var(--vibe-bg-card)] rounded-xl border border-[#ffe082] dark:border-[#6b5b27] shadow-sm overflow-hidden animate-slideUp" [style.animation-delay]="$index * 100 + 'ms'">
                      <div class="p-4 border-b border-[#ffe082] dark:border-[#6b5b27] bg-[#fffbf0] dark:bg-[#2e260e] flex items-center gap-2">
                         <span class="text-xl">⚠️</span>
                         <div class="font-bold text-[#5d4037] dark:text-yellow-200 flex items-center gap-2 flex-wrap">
                            @for (card of conflict.cards; track card; let isLast = $last) {
                               <span class="px-2 py-0.5 bg-white dark:bg-[#4a3f1a] border border-[#ffe082] dark:border-[#6b5b27] rounded text-xs uppercase">{{card}}</span>
                               @if (!isLast) { <span class="text-xs text-gray-400">⚔️</span> }
                            }
                         </div>
                         <span class="ml-auto text-xs font-bold px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 uppercase">{{conflict.severity}}</span>
                      </div>
                      <div class="p-4 space-y-3">
                         <p class="text-[#3e2723] dark:text-gray-200 text-sm leading-relaxed"><strong class="text-[#bf360c] dark:text-orange-400">{{ wf.t('check.issue_label') }}</strong> {{ conflict.description }}</p>
                         <p class="text-[#33691e] dark:text-green-200 text-sm bg-[#f1f8e9] dark:bg-green-900/30 p-3 rounded-lg"><strong class="text-[#33691e] dark:text-green-300">{{ wf.t('check.suggestion_label') }}</strong> {{ conflict.suggestion }}</p>
                      </div>
                      <div class="p-3 bg-black/5 border-t border-[#ffe082] dark:border-[#6b5b27] flex flex-wrap justify-end gap-2">
                         <button (click)="ignoreConflict($index)" class="px-4 py-1.5 rounded-lg text-sm text-[#5d4037] dark:text-yellow-200 hover:bg-[#ffe082]/20 dark:hover:bg-white/10 font-medium">
                           {{ wf.t('check.btn_ignore') }}
                         </button>
                         
                         <button (click)="turnIntoFeature($index)" [disabled]="isProcessingAction($index)"
                                 class="px-4 py-1.5 rounded-lg text-sm bg-[#b2dfdb] text-[#004d40] font-bold hover:bg-[#80cbc4] shadow-sm flex items-center gap-2 disabled:opacity-50 dark:bg-teal-800 dark:text-teal-100 dark:hover:bg-teal-700">
                            @if (isHarmonizing() === $index) { <span class="animate-spin text-xs">↻</span> }
                            @else { <app-icon name="auto_awesome" [size]="16"></app-icon> }
                            {{ wf.t('check.btn_feature') }}
                         </button>

                         <button (click)="autoFix($index)" [disabled]="isProcessingAction($index)"
                                 class="px-4 py-1.5 rounded-lg text-sm bg-[#ffb74d] text-[#3e2723] font-bold hover:bg-[#ffa726] shadow-sm flex items-center gap-2 disabled:opacity-50 dark:bg-orange-600 dark:text-black dark:hover:bg-orange-500">
                            @if (isFixing() === $index) { <span class="animate-spin text-xs">↻</span> }
                            @else { <app-icon name="auto_fix" [size]="16"></app-icon> }
                            {{ wf.t('check.btn_fix') }}
                         </button>
                      </div>
                   </div>
                 }
               </div>
            }
          }
        </div>
      </div>

      <!-- Footer Navigation -->
      <div class="p-4 bg-[var(--vibe-bg-card)] border-t flex justify-between items-center gap-4 shrink-0 border-[var(--vibe-border)]">
         <button (click)="wf.undo()" class="px-4 py-2 rounded-full text-sm font-medium hover:bg-black/5 transition-colors flex items-center gap-1 text-[var(--text-secondary)]">
            <app-icon name="arrow_back" [size]="18"></app-icon> {{ wf.t('common.back') }}
         </button>
         
         <div class="flex-1 flex justify-center">
            <button (click)="triggerRemix()" [disabled]="isRemixing() || !!wf.state().remixData"
              class="px-6 py-3 rounded-full text-[var(--vibe-on-accent)] font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 hover:opacity-90 bg-gradient-to-r from-purple-500 to-indigo-600 disabled:from-gray-400 disabled:to-gray-500">
              @if (isRemixing()) {
                 <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              } @else {
                 <app-icon name="upgrade" [size]="20"></app-icon>
              }
              {{ wf.t('check.btn_remix') }}
            </button>
         </div>

         <button (click)="proceedToSim()" 
                 class="px-4 py-2 rounded-full border font-bold hover:bg-black/5 transition-all flex items-center gap-2 border-[var(--vibe-accent)] text-[var(--vibe-accent)]">
           {{ wf.t('check.btn_sim') }} <app-icon name="arrow_forward" [size]="18"></app-icon>
         </button>
      </div>
    </div>

    <!-- Remix Result Modal -->
    @if (showRemixModal() && remixData()) {
      <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn" (click)="showRemixModal.set(false)">
        <div class="bg-[var(--vibe-bg-card)] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[var(--vibe-border)] animate-slideUp" (click)="$event.stopPropagation()">
          <div class="p-6 border-b border-[var(--vibe-border)]">
            <h3 class="text-2xl font-bold text-[var(--vibe-accent)]">{{ wf.t('check.remix_modal.title') }}</h3>
            <p class="text-sm text-[var(--text-secondary)] mt-1">{{ wf.t('check.remix_modal.desc') }}</p>
          </div>
          <div class="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
            <!-- Inner Voice -->
            <div class="p-4 rounded-lg bg-[var(--vibe-bg-main)] border border-[var(--vibe-border)]">
              <h4 class="font-bold text-sm uppercase text-[var(--vibe-accent)]/80">{{ wf.t('check.remix_modal.field_inner_voice') }}</h4>
              <p class="mt-1 text-sm text-[var(--text-primary)] font-serif">{{ remixData()!.inner_voice }}</p>
            </div>
            <!-- Core Wound -->
            <div class="p-4 rounded-lg bg-[var(--vibe-bg-main)] border border-[var(--vibe-border)]">
              <h4 class="font-bold text-sm uppercase text-[var(--vibe-accent)]/80">{{ wf.t('check.remix_modal.field_core_wound') }}</h4>
              <p class="mt-1 text-sm text-[var(--text-primary)] font-serif">{{ remixData()!.core_wound }}</p>
            </div>
            <!-- Secret Desire -->
            <div class="p-4 rounded-lg bg-[var(--vibe-bg-main)] border border-[var(--vibe-border)]">
              <h4 class="font-bold text-sm uppercase text-[var(--vibe-accent)]/80">{{ wf.t('check.remix_modal.field_secret_desire') }}</h4>
              <p class="mt-1 text-sm text-[var(--text-primary)] font-serif">{{ remixData()!.secret_desire }}</p>
            </div>
            <!-- Worldview -->
            <div class="p-4 rounded-lg bg-[var(--vibe-bg-main)] border border-[var(--vibe-border)]">
              <h4 class="font-bold text-sm uppercase text-[var(--vibe-accent)]/80">{{ wf.t('check.remix_modal.field_worldview') }}</h4>
              <p class="mt-1 text-sm text-[var(--text-primary)] font-serif">{{ remixData()!.worldview }}</p>
            </div>
          </div>
          <div class="p-4 bg-[var(--vibe-bg-header)] flex justify-end gap-3">
            <button (click)="showRemixModal.set(false)" class="px-6 py-2 rounded-full text-sm font-bold text-[var(--vibe-accent)] hover:bg-black/10">{{ wf.t('common.close') }}</button>
            <button (click)="acceptRemix()" class="px-6 py-2 rounded-full text-sm font-bold bg-[var(--vibe-accent-bg)] text-[var(--vibe-on-accent)] hover:opacity-90">{{ wf.t('check.remix_modal.accept') }}</button>
          </div>
        </div>
      </div>
    }

    <style>
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
      @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.2, 0.0, 0, 1.0) forwards; opacity: 0; animation-fill-mode: forwards; }
    </style>
  `
})
export class CheckComponent implements OnInit {
  wf = inject(WorkflowService);
  private gemini = inject(GeminiService);
  
  isAnalyzing = signal(true);
  conflicts = signal<ConflictItem[]>([]);
  conflictCount = computed(() => this.conflicts().length);
  
  isFixing = signal<number | null>(null);
  isHarmonizing = signal<number | null>(null);
  isRemixing = signal(false);
  
  showRemixModal = signal(false);
  remixData = signal<RemixData | null>(null);

  async ngOnInit() {
    if (!this.wf.state().analysisReport) {
       await this.runAnalysis();
    } else {
       this.conflicts.set(this.wf.state().analysisReport!);
       this.isAnalyzing.set(false);
    }
  }

  async runAnalysis() {
    this.isAnalyzing.set(true);
    try {
      const persona = this.wf.state().structuredPersona;
      if (persona) {
          const result = await this.gemini.analyzeConflicts(persona);
          this.conflicts.set(result);
          this.wf.pushState({ analysisReport: result });
      }
    } catch (e) {
      console.error(e);
      this.conflicts.set([]);
    } finally {
      this.isAnalyzing.set(false);
    }
  }
  
  isProcessingAction(index: number) {
    return this.isFixing() === index || this.isHarmonizing() === index;
  }

  async autoFix(index: number) {
    this.isFixing.set(index);
    await this.processResolution(index, (persona, conflict) => 
        this.gemini.autoFixConflict(persona, conflict.description, conflict.suggestion));
    this.isFixing.set(null);
  }

  async turnIntoFeature(index: number) {
    this.isHarmonizing.set(index);
    await this.processResolution(index, (persona, conflict) => 
        this.gemini.harmonizeConflict(persona, conflict.description));
    this.isHarmonizing.set(null);
  }

  private async processResolution(index: number, action: (p: any, c: any) => Promise<any>) {
    const conflict = this.conflicts()[index];
    const currentPersona = this.wf.state().structuredPersona;
    if (!currentPersona) return;
    try {
      const updatedPersona = await action(currentPersona, conflict);
      const newDraft = this.gemini.compileStructuredPrompt(updatedPersona);
      this.wf.pushState({
        structuredPersona: updatedPersona,
        currentDraft: newDraft
      });
      this.conflicts.update(list => list.filter((_, i) => i !== index));
      this.wf.pushState({ analysisReport: this.conflicts() });
    } catch (e) {
      alert(this.wf.t('check.error.action_failed'));
    }
  }

  ignoreConflict(index: number) {
    this.conflicts.update(list => list.filter((_, i) => i !== index));
    this.wf.pushState({ analysisReport: this.conflicts() });
  }

  async triggerRemix() {
    this.isRemixing.set(true);
    const persona = this.wf.state().structuredPersona;
    if (!persona) {
        this.isRemixing.set(false);
        return;
    }
    try {
        const result = await this.gemini.remixPersona(persona);
        this.remixData.set(result);
        this.showRemixModal.set(true);
    } catch (e) {
        console.error("Remix failed", e);
        alert(this.wf.t('check.error.remix_failed'));
    } finally {
        this.isRemixing.set(false);
    }
  }
  
  acceptRemix() {
    const persona = this.wf.state().structuredPersona;
    const remix = this.remixData();
    if (!persona || !remix) return;

    const remixedPersona = { ...persona, ...remix };
    const newDraft = this.gemini.compileStructuredPrompt(remixedPersona);

    this.wf.pushState({
        structuredPersona: remixedPersona,
        remixData: remix,
        currentDraft: newDraft
    });
    this.showRemixModal.set(false);
  }

  proceedToSim() {
    this.wf.setStep('simulation');
  }
}
