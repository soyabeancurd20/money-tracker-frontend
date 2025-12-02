// src/app/dashboard/dashboard.component.ts
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Transaction } from '../models/transaction.model';
import { TransactionApiService } from '../core/transaction-api.service';
import { Chart, ChartData, ArcElement, Tooltip, Legend, ChartOptions } from 'chart.js';

Chart.register(ArcElement, Tooltip, Legend);

@Component({
  selector: 'app-dashboard',
  template: `
  <div class="container">
    

    <div class="row" style="gap:18px;">
      <div class="col card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h1 style="margin:0;font-size:1.1rem;">Dashboard</h1>
            <div class="small" style="margin-top:6px">Overview of your finances</div>
          </div>
          <div class="small">Last sync: <strong>{{ lastSync | date:'short' }}</strong></div>
        </div>

        <div class="dashboard-cards" style="margin-top:12px;">
          <div class="kpi">
            <div class="label">Total Income</div>
            <div class="value">₱{{ totals.income | number:'1.0-2' }}</div>
            <div class="small" style="margin-top:8px">All time</div>
          </div>

          <div class="kpi">
            <div class="label">Total Expenses</div>
            <div class="value">₱{{ totals.expense | number:'1.0-2' }}</div>
            <div class="small" style="margin-top:8px">All time</div>
          </div>

          <div class="kpi">
            <div class="label">Balance</div>
            <div class="value" [style.color]="totals.balance < 0 ? 'var(--expense)' : 'inherit'">₱{{ totals.balance | number:'1.0-2' }}</div>
            <div class="small" style="margin-top:8px">Income − Expenses</div>
          </div>
        </div>

        <div style="margin-top:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0">Recent transactions</h3>
            <a routerLink="/transactions" class="small">View all</a>
          </div>

          <div *ngIf="recent.length === 0" class="empty">No transactions yet — add one on the Transactions page.</div>

          <table *ngIf="recent.length>0" class="table">
            <thead><tr><th>Date</th><th>Category</th><th>Note</th><th style="text-align:right">Amount</th></tr></thead>
            <tbody>
              <tr *ngFor="let t of recent">
                <td>{{ t.date | date:'mediumDate' }}</td>
                <td>{{ t.category }}</td>
                <td class="small">{{ t.note }}</td>
                <td style="text-align:right">
                  <span class="badge" [ngClass]="t.type==='Income' ? 'income' : 'expense'">
                    {{ t.type === 'Income' ? '+' : '−' }}₱{{ t.amount | number:'1.0-2' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Chart card -->
      <div class="col-3 card" style="display:flex;flex-direction:column;gap:12px;min-height:340px;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <h3 style="margin:0 0 6px 0">Spending breakdown</h3>
            <div class="small">Where your expenses go</div>
          </div>
          <div class="small"><a (click)="refresh()">Refresh</a></div>
        </div>

        <div style="flex:1; display:flex; align-items:center; justify-content:center; min-height:220px;">
          <canvas #doughnutCanvas width="300" height="300" style="max-width:100%"></canvas>
        </div>

        <div *ngIf="chartLabels.length" style="display:flex;flex-direction:column;gap:6px;">
          <div *ngFor="let l of chartLabels; let i = index" style="display:flex;justify-content:space-between;align-items:center;">
            <div class="small">{{ l }}</div>
            <div class="small">₱{{ chartValues[i] | number:'1.0-2' }}</div>
          </div>
        </div>

        <div *ngIf="!chartLabels.length" class="empty small">No expense data yet</div>
      </div>
    </div>
  </div>
  `,
  styles: []
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  totals = { income: 0, expense: 0, balance: 0 };
  recent: Transaction[] = [];
  lastSync: Date = new Date();

  chart?: Chart | null;
  chartLabels: string[] = [];
  chartValues: number[] = [];

  @ViewChild('doughnutCanvas') doughnutCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(private txApi: TransactionApiService) {}

  ngOnInit() {
    this.load();
  }

  ngAfterViewInit() {
    // chart will be created after data is loaded; ensure canvas is present
  }

  ngOnDestroy() {
    this.destroyChart();
  }

  private normalize(list: any[]): Transaction[] {
    return (list || []).map((t: any) => ({
      id: t.id || t._id || String(t._id || t.id || Math.random().toString(36).slice(2, 9)),
      type: t.type,
      category: t.category,
      amount: Number(t.amount || 0),
      date: t.date ? new Date(t.date).toISOString() : new Date().toISOString(),
      note: t.note || ''
    }));
  }

  load() {
    this.txApi.getAll().subscribe(list => {
      const all = this.normalize(list).sort((a, b) => +new Date(b.date) - +new Date(a.date));
      this.recent = all.slice(0, 8);
      const income = all.filter(t => t.type === 'Income').reduce((s, x) => s + Number(x.amount), 0);
      const expense = all.filter(t => t.type === 'Expense').reduce((s, x) => s + Number(x.amount), 0);
      this.totals = { income, expense, balance: income - expense };
      this.lastSync = new Date();

      // build chart data from Expense transactions
      const expenses = all.filter(t => t.type === 'Expense');
      const map = new Map<string, number>();
      expenses.forEach(e => map.set(e.category, (map.get(e.category) || 0) + Number(e.amount)));

      // sort by value descend
      const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);

      this.chartLabels = entries.map(e => e[0]);
      this.chartValues = entries.map(e => e[1]);

      // build or update Chart
      setTimeout(() => this.renderChart(), 0);
    }, err => {
      console.error('Failed to load transactions', err);
    });
  }

  refresh() {
    this.load();
  }

  private destroyChart() {
    if (this.chart) {
      try { this.chart.destroy(); } catch (e) { /* ignore */ }
      this.chart = null;
    }
  }

  private renderChart() {
    this.destroyChart();

    if (!this.doughnutCanvas) return;
    const ctx = this.doughnutCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // If no data, do nothing (chart not created)
    if (!this.chartValues || this.chartValues.length === 0) return;

    const data: ChartData<'doughnut'> = {
      labels: this.chartLabels,
      datasets: [{
        data: this.chartValues,
        // backgroundColor will be automatically generated if not provided by Chart.js,
        // but we can supply a gentle palette (optional)
        backgroundColor: this.generatePalette(this.chartValues.length),
        hoverOffset: 8
      }]
    };

    const options: ChartOptions<'doughnut'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
        tooltip: { callbacks: {} }
      }
    };

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data,
      options
    });
  }

  // gentle pastel palette generator based on HSL
  private generatePalette(n: number) {
    const palette: string[] = [];
    for (let i = 0; i < n; i++) {
      const hue = Math.round((i * 360) / n);
      const sat = 60; // saturation
      const light = 62; // lightness
      palette.push(`hsl(${hue} ${sat}% ${light}%)`);
    }
    return palette;
  }
}
