import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LayoutComponent],
  template: '<app-layout><router-outlet></router-outlet></app-layout>'
})
export class AppComponent {
  title = 'MarketPulse Jobs';
}


