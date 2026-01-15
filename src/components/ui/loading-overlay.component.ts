
import { Component, input, effect, signal, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (isVisible()) {
      <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-fadeIn text-white">
        <!-- Animated Sigil -->
        <div class="relative w-32 h-32 mb-8">
           <!-- Outer Ring -->
           <div class="absolute inset-0 border-2 border-white/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
           <!-- Inner Dashed Ring -->
           <div class="absolute inset-4 border-2 border-dashed border-white/40 rounded-full animate-[spin_8s_linear_infinite_reverse]"></div>
           <!-- Core Pulse -->
           <div class="absolute inset-0 flex items-center justify-center">
              <div class="w-4 h-4 bg-white rounded-full animate-ping"></div>
           </div>
           <!-- Rotating Icon -->
           <div class="absolute inset-0 flex items-center justify-center animate-pulse">
              <app-icon [name]="iconName()" [size]="48" class="text-white/90"></app-icon>
           </div>
        </div>

        <h3 class="text-2xl md:text-3xl font-display font-bold text-white tracking-widest uppercase mb-2 animate-pulse text-center px-4">
           {{ currentStepText() }}
        </h3>
        <p class="text-white/60 font-mono text-sm">{{ subtitle() }}</p>
      </div>
    }
  `,
  styles: [`
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
  `]
})
export class LoadingOverlayComponent implements OnInit, OnDestroy {
  isVisible = input.required<boolean>();
  steps = input<string[]>(['Processing...']);
  subtitle = input<string>('Please wait...');
  iconName = input<string>('psychology');

  currentStepText = signal('');
  private intervalId: any;

  constructor() {
    effect(() => {
        if (this.isVisible()) {
            this.startAnimation();
        } else {
            this.stopAnimation();
        }
    });
  }

  ngOnInit() {
      if (this.isVisible()) this.startAnimation();
  }

  ngOnDestroy() {
      this.stopAnimation();
  }

  private startAnimation() {
      this.stopAnimation(); // Clear existing
      const steps = this.steps();
      if (steps.length === 0) return;

      this.currentStepText.set(steps[0]);
      
      if (steps.length > 1) {
          let index = 0;
          this.intervalId = setInterval(() => {
              index = (index + 1) % steps.length;
              this.currentStepText.set(steps[index]);
          }, 1500);
      }
  }

  private stopAnimation() {
      if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
      }
  }
}
