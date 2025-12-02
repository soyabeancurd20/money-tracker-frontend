import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    
   <div class="topbar card" style="margin-bottom:18px;">
      <div class="inner">
        <div class="brand">Money Tracker</div>
        <nav class="nav">
          <a routerLink="/dashboard">Dashboard</a>
          <a routerLink="/transactions">Transactions</a>
        </nav>
      </div>
    </div>
<main class="container">
  <router-outlet></router-outlet>
</main>
  `,
  styles: []
})
export class AppComponent {
  title = 'simple-money-tracker';
}
