import { Component, input } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <span class="material-symbols-rounded select-none" [class]="class()" [style.font-size.px]="size()">
      {{ name() }}
    </span>
  `
})
export class IconComponent {
  name = input.required<string>();
  size = input<number>(24);
  class = input<string>('');
}
