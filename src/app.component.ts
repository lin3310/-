import { Component, inject, signal, effect, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService } from './services/workflow.service';

// Components
import { HomeComponent } from './components/home.component';
import { VibeCodeComponent } from './components/vibecode.component';
import { CrystallizeComponent } from './components/pipeline/crystallize.component';
import { CheckComponent } from './components/pipeline/check.component';
import { SimulationComponent } from './components/pipeline/simulation.component';
import { FinalComponent } from './components/pipeline/final.component';
import { DirectorComponent } from './components/director.component'; // Acts as Refine

// Manual Modes
import { ToolComponent } from './components/tool.component';
import { ArchitectComponent } from './components/architect.component';
import { AntiBiasComponent } from './components/antibias.component';

type View = 'home' | 'pipeline' | 'architect' | 'tool' | 'antibias';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    HomeComponent,
    VibeCodeComponent, CrystallizeComponent, CheckComponent, SimulationComponent, FinalComponent, DirectorComponent,
    ToolComponent, ArchitectComponent, AntiBiasComponent
  ],
  templateUrl: './app.component.html'
})
export class AppComponent {
  wf = inject(WorkflowService);
  private renderer = inject(Renderer2);
  
  currentView = signal<View>('home');

  constructor() {
    effect(() => {
      const theme = this.wf.theme();
      const root = document.documentElement;

      // Remove all possible theme classes to ensure a clean switch
      this.renderer.removeClass(root, 'dark');
      this.renderer.removeClass(root, 'black');
      this.renderer.removeClass(root, 'amoled');
      this.renderer.removeClass(root, 'slate');

      // Add the current theme class if it's not the default 'light'
      if (theme !== 'light') {
        this.renderer.addClass(root, theme);
      }
      localStorage.setItem('theme', theme);
    });
  }

  handleModeSelection(mode: 'pipeline' | 'architect' | 'tool' | 'director' | 'antibias') {
    if (mode === 'pipeline') {
      this.wf.reset();
      this.currentView.set('pipeline');
    } else if (mode === 'director') {
      this.wf.initDirectorMode();
      this.currentView.set('pipeline');
    } else {
      this.currentView.set(mode);
    }
  }

  handleArchitectRefinement(prompt: string) {
    this.wf.initDirectorMode(prompt);
    this.currentView.set('pipeline');
  }

  switchToView(view: 'architect' | 'tool') {
    this.currentView.set(view);
  }

  goHome() {
    this.currentView.set('home');
  }
}