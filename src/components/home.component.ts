import { Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService } from '../services/workflow.service';
import { IconComponent } from './ui/icon.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="min-h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-[var(--bg-body)] text-[var(--text-primary)] font-sans relative">
      
      <!-- Settings Corner -->
      <div class="absolute top-4 right-4 flex gap-3">
        <!-- Theme Toggle -->
        <button (click)="wf.cycleTheme()" class="w-10 h-10 flex items-center justify-center bg-[var(--bg-surface-container)] rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors">
          <app-icon [name]="wf.themeIcon()" [size]="20"></app-icon>
        </button>
        <!-- Lang Toggle -->
        <button (click)="wf.cycleLang()" class="px-3 py-1 bg-[var(--bg-surface-container)] rounded-full text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors uppercase">
          {{ wf.currentLang() }}
        </button>
      </div>

      <div class="text-center mb-12 animate-fade-in-down">
        <h1 class="text-5xl mb-2 text-[var(--text-primary)]" style="font-family: 'Patrick Hand', cursive;">{{ wf.t('home.title') }}</h1>
        <p class="text-2xl text-[var(--text-primary)]" style="font-family: 'Patrick Hand', cursive;">{{ wf.t('home.subtitle') }}</p>
      </div>

      <!-- New Layout -->
      <div class="w-full max-w-5xl mx-auto animate-fade-in-up">
        <div class="flex flex-col gap-12">
          
          <!-- Main Workflow Card -->
          <div class="w-full bg-[var(--vibe-bg-card)] border border-[var(--vibe-border)] rounded-3xl p-8 shadow-lg flex flex-col justify-between">
            <div>
              <h2 class="text-3xl font-bold text-[var(--vibe-accent)] mb-2">{{ wf.t('home.workflow_title') }}</h2>
              <p class="text-[var(--vibe-accent)]/80 mb-8">{{ wf.t('home.workflow_desc') }}</p>
            </div>
            <div class="space-y-4">
              <!-- Vibe Mode Button -->
              <button (click)="selectMode.emit('pipeline')" class="w-full text-left p-6 rounded-2xl bg-[var(--vibe-accent-bg)] text-[var(--vibe-on-accent)] shadow-md hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-4">
                <app-icon name="palette" [size]="32"></app-icon>
                <div>
                  <span class="text-xl font-bold">{{ wf.t('home.mode_vibe') }}</span>
                  <p class="text-sm opacity-80">{{ wf.t('home.desc_vibe') }} {{ wf.t('home.recommended') }}</p>
                </div>
              </button>
               <!-- Director Mode Button -->
              <button (click)="selectMode.emit('director')" class="w-full text-left p-6 rounded-2xl bg-[var(--vibe-accent-bg-alt)] border border-[var(--vibe-border)] text-[var(--vibe-accent)] hover:shadow-lg hover:bg-[var(--vibe-bg-main)] hover:-translate-y-1 transition-all flex items-center gap-4">
                 <app-icon name="psychology" [size]="32"></app-icon>
                 <div>
                    <span class="text-xl font-bold">{{ wf.t('home.mode_director') }}</span>
                    <p class="text-sm opacity-80">{{ wf.t('home.desc_director') }}</p>
                 </div>
              </button>
            </div>
          </div>

          <!-- Standalone Tools Section -->
          <div>
            <h2 class="text-center text-xl font-bold text-[var(--text-secondary)] mb-6">{{ wf.t('home.tools_title') }}</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <!-- Architect -->
              <button (click)="selectMode.emit('architect')" class="p-6 rounded-2xl text-left bg-[var(--arch-bg-card)] border border-[var(--arch-border)] text-[var(--arch-accent)] hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-4 h-full">
                <app-icon name="architecture" [size]="32"></app-icon>
                <div>
                  <span class="text-xl font-bold">{{ wf.t('home.mode_arch') }}</span>
                  <p class="text-sm opacity-80 mt-1">{{ wf.t('home.desc_arch') }}</p>
                </div>
              </button>
              <!-- Tool -->
              <button (click)="selectMode.emit('tool')" class="p-6 rounded-2xl text-left bg-[var(--tool-bg-main)] border border-[var(--tool-border)] text-[var(--tool-text-header)] hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-4 h-full">
                 <app-icon name="precision_manufacturing" [size]="32"></app-icon>
                 <div>
                  <span class="text-xl font-bold">{{ wf.t('home.mode_tool') }}</span>
                  <p class="text-sm opacity-80 mt-1">{{ wf.t('home.desc_tool') }}</p>
                </div>
              </button>
               <!-- Anti-Bias -->
              <button (click)="selectMode.emit('antibias')" class="p-6 rounded-2xl text-left bg-[var(--antibias-bg-main)] border border-[var(--antibias-border)] text-[var(--antibias-text-header)] hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-4 h-full">
                 <app-icon name="hub" [size]="32"></app-icon>
                 <div>
                  <span class="text-xl font-bold">{{ wf.t('home.mode_antibias') }}</span>
                  <p class="text-sm opacity-80 mt-1">{{ wf.t('home.desc_antibias') }}</p>
                </div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fade-in-down {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fade-in-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-down { animation: fade-in-down 0.6s ease-out forwards; }
    .animate-fade-in-up { 
        animation: fade-in-up 0.6s ease-out 0.2s forwards;
        opacity: 0; /* Start hidden for animation */
    }
  `]
})
export class HomeComponent {
  wf = inject(WorkflowService);
  selectMode = output<'pipeline' | 'architect' | 'tool' | 'director' | 'antibias'>();
}
