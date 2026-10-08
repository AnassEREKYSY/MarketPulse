import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page py-20 text-center">
      <p class="num text-[64px] font-medium leading-none text-ink-faint">404</p>
      <h1 class="h1 mt-4">This page does not exist</h1>
      <a routerLink="/" class="btn-primary mt-6">Back to the overview</a>
    </div>
  `,
})
export class NotFoundPage {}
