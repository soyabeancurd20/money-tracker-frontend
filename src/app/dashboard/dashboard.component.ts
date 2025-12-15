import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy
} from "@angular/core";
import { TransactionApiService } from "../core/transaction-api.service";
import { BudgetRuleService } from "../core/budget-rule.service";
import { Transaction } from "../models/transaction.model";

declare const Chart: any;

@Component({
  selector: "app-dashboard",
  template: `
  <div class="container dashboard-grid">

    <!-- HEADER -->
    <div class="card header">
      <h2>Dashboard (Monthly)</h2>
      <div class="small">{{ currentMonth }}</div>
    </div>

    <!-- KPI -->
    <div class="card kpis">
      <div class="kpi">
        <div class="label">Income</div>
        <div class="value">₱{{ income | number:'1.0-2' }}</div>
      </div>
      <div class="kpi">
        <div class="label">Expenses</div>
        <div class="value">₱{{ expense | number:'1.0-2' }}</div>
      </div>
      <div class="kpi">
        <div class="label">Balance</div>
        <div class="value">₱{{ income - expense | number:'1.0-2' }}</div>
      </div>
    </div>

    <!-- RULE -->
    <div class="card rule">
      <h3>Budget Rule (%)</h3>
      <div class="rule-row">
        <label>Needs <input type="number" [(ngModel)]="rule.needs" (input)="recalculate()" /></label>
        <label>Wants <input type="number" [(ngModel)]="rule.wants" (input)="recalculate()" /></label>
        <label>Savings <input type="number" [(ngModel)]="rule.savings" (input)="recalculate()" /></label>
        <button (click)="resetRule()">Reset</button>
      </div>
      <div *ngIf="ruleTotal !== 100" class="over">
        Total must equal 100%
      </div>
    </div>

    <!-- STATUS -->
    <div class="card status">
      <h3>Budget Status</h3>

      <div class="budget-item">
        <div class="row">
          <strong>Needs</strong>
          <span class="delta" [class.up]="needsDelta>0" [class.down]="needsDelta<0">
            {{ needsDelta | number:'1.0-0' }}%
          </span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill danger" [style.width.%]="needsPct">
            {{ needsPct | number:'1.0-0' }}%
          </div>
        </div>
        <div class="small">
          {{ needsRemaining | currency:'PHP':'symbol':'1.0-0' }}
          {{ needsRemaining >= 0 ? 'remaining' : 'over budget' }}
        </div>
      </div>

      <div class="budget-item">
        <div class="row">
          <strong>Wants</strong>
          <span class="delta" [class.up]="wantsDelta>0" [class.down]="wantsDelta<0">
            {{ wantsDelta | number:'1.0-0' }}%
          </span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill warn" [style.width.%]="wantsPct">
            {{ wantsPct | number:'1.0-0' }}%
          </div>
        </div>
        <div class="small">
          {{ wantsRemaining | currency:'PHP':'symbol':'1.0-0' }}
          {{ wantsRemaining >= 0 ? 'remaining' : 'over budget' }}
        </div>
      </div>

      <div class="budget-item">
        <div class="row">
          <strong>Savings</strong>
          <span class="delta" [class.up]="savingsDelta>0" [class.down]="savingsDelta<0">
            {{ savingsDelta | number:'1.0-0' }}%
          </span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill success" [style.width.%]="savingsPct">
            {{ savingsPct | number:'1.0-0' }}%
          </div>
        </div>
        <div class="small">
          {{ savingsRemaining | currency:'PHP':'symbol':'1.0-0' }}
          {{ savingsRemaining >= 0 ? 'above target' : 'below target' }}
        </div>
      </div>
    </div>

    <!-- CHARTS -->
    <div class="card chart">
      <h3>Budget Breakdown</h3>
      <div class="chart-body">
        <canvas id="budgetChart"></canvas>
      </div>
    </div>

    <div class="card chart">
      <h3>Expense by Category</h3>
      <div class="chart-body">
        <canvas id="categoryChart"></canvas>
      </div>
    </div>

    <!-- MONTHLY COMPARISON -->
<div class="card chart">
  <h3>Income vs Expenses (Last 6 Months)</h3>
  <div class="chart-body">
    <canvas id="monthlyComparisonChart"></canvas>
  </div>
</div>


  </div>
  `,
  styles: [`
    .dashboard-grid{
      display:grid;
      grid-template-columns:repeat(12,1fr);
      gap:16px;
    }
    .header{grid-column:span 12;}
    .kpis{
      grid-column:span 12;
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:12px;
    }
    .rule,.status{grid-column:span 6;}
    .chart{grid-column:span 6;min-height:360px;display:flex;flex-direction:column;}
    .chart-body{flex:1;position:relative;}
    canvas{position:absolute;inset:0;width:100%!important;height:100%!important;}
    .kpi{background:#f9fafb;padding:14px;border-radius:10px;}
    .rule-row{display:flex;gap:10px;align-items:center;}
    .rule-row input{width:60px;}
    .budget-item{margin-bottom:14px;}
    .row{display:flex;justify-content:space-between;}
    .progress-bar{height:10px;background:#e5e7eb;border-radius:999px;overflow:hidden;}
    .progress-fill{
      height:100%;
      display:flex;
      align-items:center;
      justify-content:flex-end;
      padding-right:6px;
      font-size:11px;
      color:#fff;
      font-weight:600;
      transition:width .6s cubic-bezier(.4,0,.2,1);
    }
    .danger{background:#ef4444;}
    .warn{background:#f59e0b;}
    .success{background:#22c55e;}
    .delta.up{color:#16a34a;}
    .delta.down{color:#dc2626;}
    .over{color:#dc2626;font-weight:600;}
    @media(max-width:900px){
      .rule,.status,.chart{grid-column:span 12;}
      .kpis{grid-template-columns:1fr;}
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {

monthlyChart: any;

  chart:any;
  categoryChart:any;

  income=0;
  expense=0;

  rule={needs:50,wants:30,savings:20};
  ruleTotal=100;

  needs={spent:0,limit:0};
  wants={spent:0,limit:0};
  savings={spent:0,limit:0};

  needsPct=0;
  wantsPct=0;
  savingsPct=0;

  needsRemaining=0;
  wantsRemaining=0;
  savingsRemaining=0;

  needsDelta=0;
  wantsDelta=0;
  savingsDelta=0;

  currentMonth=new Date().toLocaleString("default",{month:"long",year:"numeric"});

  constructor(
    private txApi:TransactionApiService,
    private ruleApi:BudgetRuleService
  ){}

  ngOnInit(){
    this.ruleApi.getRule().subscribe(r=>{
      this.rule=r;
      this.recalculate();
    });
    this.load();
  }

  ngOnDestroy() {
  if (this.chart) this.chart.destroy();
  if (this.categoryChart) this.categoryChart.destroy();
  if (this.monthlyChart) this.monthlyChart.destroy();
}


  resetRule(){
    this.rule={needs:50,wants:30,savings:20};
    this.recalculate();
  }

  load(){
    this.txApi.getAll().subscribe((txs:Transaction[])=>{
      const now=new Date();
      const m=now.getMonth(), y=now.getFullYear();

      const current=txs.filter(t=>{
        const d=new Date(t.date);
        return d.getMonth()===m && d.getFullYear()===y;
      });

      this.income=current.filter(t=>t.type==="Income")
        .reduce((s,t)=>s+Number(t.amount),0);

      this.expense=current.filter(t=>t.type==="Expense")
        .reduce((s,t)=>s+Number(t.amount),0);

      this.needs.spent=this.wants.spent=this.savings.spent=0;

      


      current.filter(t=>t.type==="Expense").forEach(t=>{
        if(t.budgetType==="Needs") this.needs.spent+=Number(t.amount);
        if(t.budgetType==="Wants") this.wants.spent+=Number(t.amount);
        if(t.budgetType==="Savings") this.savings.spent+=Number(t.amount);
      });

      this.recalculate();
      setTimeout(()=>this.renderCharts(current),100);

      setTimeout(() => {
  this.renderCharts(current);
  this.renderMonthlyComparison(txs);
}, 100);

    });
  }

  recalculate(){
    this.ruleTotal=this.rule.needs+this.rule.wants+this.rule.savings;
    if(this.ruleTotal!==100) return;

    this.needs.limit=this.income*(this.rule.needs/100);
    this.wants.limit=this.income*(this.rule.wants/100);
    this.savings.limit=this.income*(this.rule.savings/100);

    this.needsPct=Math.min((this.needs.spent/this.needs.limit)*100,150);
    this.wantsPct=Math.min((this.wants.spent/this.wants.limit)*100,150);
    this.savingsPct=Math.min((this.savings.spent/this.savings.limit)*100,150);

    this.needsRemaining=this.needs.limit-this.needs.spent;
    this.wantsRemaining=this.wants.limit-this.wants.spent;
    this.savingsRemaining=this.savings.spent-this.savings.limit;

    this.ruleApi.updateRule(this.rule).subscribe();
  }

  renderCharts(expenses: Transaction[]) {
  if (this.chart) this.chart.destroy();
  if (this.categoryChart) this.categoryChart.destroy();

  /* =======================
     BUDGET BREAKDOWN (DOUGHNUT WITH %)
     ======================= */

  const values = [
    this.needs.spent || 0,
    this.wants.spent || 0,
    this.savings.spent || 0
  ];

  const total = values.reduce((a, b) => a + b, 0);

  this.chart = new Chart(
    document.getElementById("budgetChart"),
    {
      type: "doughnut",
      data: {
        labels: ["Needs", "Wants", "Savings"],
        datasets: [
          {
            data: values.map(v => v || 0.001),
            backgroundColor: ["#ef4444", "#f59e0b", "#22c55e"]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              generateLabels: (chart: any) => {
                const data = chart.data.datasets[0].data;
                return chart.data.labels.map((label: string, i: number) => {
                  const value = data[i];
                  const pct = total
                    ? ((value / total) * 100).toFixed(0)
                    : 0;

                  return {
                    text: `${label} (${pct}%)`,
                    fillStyle: chart.data.datasets[0].backgroundColor[i],
                    hidden: false,
                    index: i
                  };
                });
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const value = ctx.raw;
                const pct = total
                  ? ((value / total) * 100).toFixed(1)
                  : 0;
                return `₱${value.toLocaleString()} (${pct}%)`;
              }
            }
          }
        }
      }
    }
  );

  /* =======================
     CATEGORY BAR CHART
     ======================= */

  const map = new Map<string, number>();
  expenses.forEach(e => {
    if (e.type === "Expense") {
      map.set(e.category, (map.get(e.category) || 0) + Number(e.amount));
    }
  });

  const labels = [...map.keys()];
  const valuesBar = [...map.values()];

  this.categoryChart = new Chart(
    document.getElementById("categoryChart"),
    {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            data: valuesBar,
            backgroundColor: valuesBar.map((_, i) =>
              i === 0
                ? "#dc2626"     // most
                : i === valuesBar.length - 1
                ? "#16a34a"     // least
                : "#60a5fa"
            )
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    }
  );
}


  renderMonthlyComparison(txs: Transaction[]) {
  if (this.monthlyChart) this.monthlyChart.destroy();

  const labels: string[] = [];
  const incomeData: number[] = [];
  const expenseData: number[] = [];

  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = date.toLocaleString("default", { month: "short" });
    labels.push(monthLabel);

    const monthTx = txs.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === date.getMonth() &&
             d.getFullYear() === date.getFullYear();
    });

    incomeData.push(
      monthTx
        .filter(t => t.type === "Income")
        .reduce((s, t) => s + Number(t.amount), 0)
    );

    expenseData.push(
      monthTx
        .filter(t => t.type === "Expense")
        .reduce((s, t) => s + Number(t.amount), 0)
    );
  }

  const canvas = document.getElementById(
    "monthlyComparisonChart"
  ) as HTMLCanvasElement;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  this.monthlyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Income",
          data: incomeData,
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,0.15)",
          tension: 0.35,
          fill: true
        },
        {
          label: "Expenses",
          data: expenseData,
          borderColor: "#ef4444",
          backgroundColor: "rgba(239,68,68,0.15)",
          tension: 0.35,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

}
