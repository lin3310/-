import { Component, output, inject, ChangeDetectionStrategy, ViewChild, ElementRef, signal, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService } from '../services/workflow.service';
import { IconComponent } from './ui/icon.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full relative overflow-hidden bg-[var(--bg-body)] text-[var(--text-primary)] font-sans">
      
      <!-- Scrollable Container -->
      <div class="h-full overflow-y-auto scroll-smooth" #scrollContainer (scroll)="onScroll()">
        <div class="flex flex-col items-center justify-center p-6 sm:p-12 min-h-full">
          
          <!-- Settings Corner (Absolute to the container or fixed) -->
          <div class="fixed top-6 right-6 flex gap-3 z-50">
            <!-- Theme Toggle -->
            <button (click)="wf.cycleTheme()" class="w-12 h-12 flex items-center justify-center bg-[var(--bg-surface-container)] rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors shadow-sm backdrop-blur-md border border-[var(--border-primary)]/20">
              <app-icon [name]="wf.themeIcon()" [size]="24"></app-icon>
            </button>
            <!-- Lang Toggle -->
            <button (click)="wf.cycleLang()" class="px-4 py-2 bg-[var(--bg-surface-container)] rounded-full text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors uppercase shadow-sm backdrop-blur-md border border-[var(--border-primary)]/20">
              {{ wf.currentLang() }}
            </button>
          </div>

          <div class="text-center mb-16 animate-fade-in-down max-w-4xl mx-auto mt-12 md:mt-0">
            <h1 class="text-5xl md:text-7xl lg:text-8xl mb-6 text-[var(--text-primary)] font-display font-black tracking-tight leading-none drop-shadow-sm">
              {{ wf.t('home.title') }}
            </h1>
            <p class="text-xl md:text-3xl text-[var(--text-secondary)] font-hand opacity-90">
              {{ wf.t('home.subtitle') }}
            </p>
          </div>

          <!-- New Layout -->
          <div class="w-full max-w-6xl mx-auto animate-fade-in-up delay-100 pb-20">
            <div class="flex flex-col gap-12">
              
              <!-- Main Workflow Card -->
              <div class="w-full bg-[var(--vibe-bg-card)] border border-[var(--vibe-border)] rounded-[2rem] p-8 md:p-12 shadow-xl flex flex-col justify-between relative overflow-hidden group">
                <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--vibe-accent)] to-[var(--vibe-border)]"></div>
                
                <div class="relative z-10 mb-8">
                  <h2 class="text-3xl md:text-4xl font-display font-bold text-[var(--vibe-accent)] mb-3">{{ wf.t('home.workflow_title') }}</h2>
                  <p class="text-[var(--vibe-accent)]/80 text-lg max-w-2xl">{{ wf.t('home.workflow_desc') }}</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                  <!-- Vibe Mode Button -->
                  <button (click)="selectMode.emit('pipeline')" class="w-full text-left p-6 md:p-8 rounded-2xl bg-[var(--vibe-accent-bg)] text-[var(--vibe-on-accent)] shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-6 group/btn">
                    <div class="p-3 bg-white/20 rounded-full group-hover/btn:scale-110 transition-transform">
                      <app-icon name="palette" [size]="36"></app-icon>
                    </div>
                    <div>
                      <span class="text-2xl font-bold font-display block mb-1">{{ wf.t('home.mode_vibe') }}</span>
                      <p class="text-sm opacity-90 leading-relaxed">{{ wf.t('home.desc_vibe') }} <span class="font-bold">{{ wf.t('home.recommended') }}</span></p>
                    </div>
                  </button>
                  <!-- Director Mode Button -->
                  <button (click)="selectMode.emit('director')" class="w-full text-left p-6 md:p-8 rounded-2xl bg-[var(--vibe-bg-main)] border-2 border-[var(--vibe-border)] text-[var(--vibe-accent)] hover:shadow-xl hover:border-[var(--vibe-accent)] hover:-translate-y-1 transition-all duration-300 flex items-center gap-6 group/btn">
                    <div class="p-3 bg-[var(--vibe-bg-header)] rounded-full group-hover/btn:scale-110 transition-transform">
                        <app-icon name="psychology" [size]="36"></app-icon>
                    </div>
                    <div>
                        <span class="text-2xl font-bold font-display block mb-1">{{ wf.t('home.mode_director') }}</span>
                        <p class="text-sm opacity-80 leading-relaxed">{{ wf.t('home.desc_director') }}</p>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Standalone Tools Section -->
              <div>
                <h2 class="text-center text-xl font-bold text-[var(--text-secondary)] mb-8 uppercase tracking-widest opacity-60">{{ wf.t('home.tools_title') }}</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <!-- Architect -->
                  <button (click)="selectMode.emit('architect')" class="p-6 rounded-2xl text-left bg-[var(--arch-bg-card)] border border-[var(--arch-border)] text-[var(--arch-accent)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 h-full group">
                    <div class="w-12 h-12 flex items-center justify-center rounded-xl bg-[var(--arch-accent-bg)]/10 text-[var(--arch-accent)] group-hover:bg-[var(--arch-accent-bg)] group-hover:text-[var(--arch-on-accent)] transition-colors">
                      <app-icon name="architecture" [size]="28"></app-icon>
                    </div>
                    <div>
                      <span class="text-xl font-bold font-display block">{{ wf.t('home.mode_arch') }}</span>
                      <p class="text-sm opacity-70 mt-2 leading-relaxed">{{ wf.t('home.desc_arch') }}</p>
                    </div>
                  </button>
                  <!-- Tool -->
                  <button (click)="selectMode.emit('tool')" class="p-6 rounded-2xl text-left bg-[var(--tool-bg-main)] border border-[var(--tool-border)] text-[var(--tool-text-header)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 h-full group">
                    <div class="w-12 h-12 flex items-center justify-center rounded-xl bg-[var(--tool-accent)]/10 text-[var(--tool-text-header)] group-hover:bg-[var(--tool-accent)] group-hover:text-[var(--tool-on-accent)] transition-colors">
                        <app-icon name="precision_manufacturing" [size]="28"></app-icon>
                    </div>
                    <div>
                      <span class="text-xl font-bold font-display block">{{ wf.t('home.mode_tool') }}</span>
                      <p class="text-sm opacity-70 mt-2 leading-relaxed">{{ wf.t('home.desc_tool') }}</p>
                    </div>
                  </button>
                  <!-- Anti-Bias -->
                  <button (click)="selectMode.emit('antibias')" class="p-6 rounded-2xl text-left bg-[var(--antibias-bg-main)] border border-[var(--antibias-border)] text-[var(--antibias-text-header)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 h-full group">
                    <div class="w-12 h-12 flex items-center justify-center rounded-xl bg-[var(--antibias-accent)]/10 text-[var(--antibias-accent)] group-hover:bg-[var(--antibias-accent)] group-hover:text-[var(--antibias-on-accent)] transition-colors">
                        <app-icon name="hub" [size]="28"></app-icon>
                    </div>
                    <div>
                      <span class="text-xl font-bold font-display block">{{ wf.t('home.mode_antibias') }}</span>
                      <p class="text-sm opacity-70 mt-2 leading-relaxed">{{ wf.t('home.desc_antibias') }}</p>
                    </div>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <!-- Scroll Button -->
      @if (showScrollButton()) {
        <button (click)="scrollToBottom()" class="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-[var(--bg-surface-container)] text-[var(--text-secondary)] shadow-lg border border-[var(--border-primary)] flex items-center justify-center hover:brightness-90 transition-all animate-bounce-in">
          <app-icon name="arrow_downward" [size]="24"></app-icon>
        </button>
      }
    </div>
  `,
  styles: [`
    @keyframes fade-in-down {
      from { opacity: 0; transform: translateY(-30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fade-in-up {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-down { animation: fade-in-down 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-fade-in-up { 
        animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        opacity: 0;
    }
    .delay-100 { animation-delay: 0.1s; }
    @keyframes bounce-in { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
    .animate-bounce-in { animation: bounce-in 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
  `]
})
export class HomeComponent implements AfterViewChecked {
  wf = inject(WorkflowService);
  selectMode = output<'pipeline' | 'architect' | 'tool' | 'director' | 'antibias'>();

  showScrollButton = signal(false);
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  ngAfterViewChecked() {
    // Optional: check initial scroll state
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
}