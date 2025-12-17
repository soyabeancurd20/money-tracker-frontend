import { Component, OnInit } from "@angular/core";
import { Transaction } from "../models/transaction.model";
import { TransactionApiService } from "../core/transaction-api.service";
import { NgForm } from "@angular/forms";

@Component({
  selector: "app-transactions",
  template: `
    <div class="container">
      <div class="card">
        <!-- HEADER -->
        <div class="header-row">
          <h2>Transactions</h2>
          <select [(ngModel)]="filterMode" (change)="applyFilter()">
            <option value="current">Current Month</option>
            <option value="all">All</option>
          </select>
        </div>

        <!-- DESKTOP TABLE -->
        <table class="table desktop-only">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Type</th>
              <th>Rule</th>
              <th class="right">Amount</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            <tr *ngFor="let t of filteredTransactions">
              <td>
                {{ t.date | date : "MMM d, yyyy" }}
              </td>
              <td>{{ t.category }}</td>
              <td>{{ t.type }}</td>
              <td>{{ t.budgetType || "-" }}</td>
              <td class="right">
                <span
                  [class.income]="t.type === 'Income'"
                  [class.expense]="t.type === 'Expense'"
                >
                  {{ t.type === "Income" ? "+" : "-" }}₱{{
                    t.amount | number : "1.0-0"
                  }}
                </span>
              </td>
              <td class="actions">
                <button (click)="startEdit(t)">Edit</button>
                <button class="danger" (click)="confirmDelete(t.id)">
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- MOBILE CARDS -->
        <div class="mobile-only">
          <div class="tx-card" *ngFor="let t of filteredTransactions">
            <div class="tx-row">
              <strong>{{ t.category }}</strong>
              <span
                [class.income]="t.type === 'Income'"
                [class.expense]="t.type === 'Expense'"
              >
                {{ t.type === "Income" ? "+" : "-" }}₱{{
                  t.amount | number : "1.0-0"
                }}
              </span>
            </div>

            <div class="tx-meta">
              <span>{{ t.date | date : "MMM d, yyyy" }}</span>
              <span>{{ t.type }}</span>
              <span>{{ t.budgetType || "-" }}</span>
            </div>

            <div class="tx-actions">
              <button (click)="startEdit(t)">Edit</button>
              <button class="danger" (click)="confirmDelete(t.id)">
                Delete
              </button>
            </div>
          </div>
        </div>

        <hr />

        <!-- FORM -->
        <h3>{{ editId ? "Edit Transaction" : "Add Transaction" }}</h3>

        <form #f="ngForm" (ngSubmit)="submit(f)" novalidate>
          <div class="form-row">
            <select name="type" [(ngModel)]="model.type" required>
              <option value="Expense">Expense</option>
              <option value="Income">Income</option>
            </select>

            <input
              name="category"
              [(ngModel)]="model.category"
              placeholder="Category"
              required
            />
          </div>

          <div class="form-row">
            <input
              type="number"
              name="amount"
              [(ngModel)]="model.amount"
              (input)="onAmountChange()"
              placeholder="Amount"
              min="0.01"
              step="0.01"
              required
            />
            <div
              *ngIf="liveRemaining !== null"
              class="live-balance"
              [class.over]="isOverBalance"
            >
              Remaining balance: ₱{{ liveRemaining | number : "1.0-0" }}
            </div>

            <input type="date" name="date" [(ngModel)]="model.date" required />
          </div>

          <div class="form-row" *ngIf="model.type === 'Expense'">
            <select name="budgetType" [(ngModel)]="model.budgetType" required>
              <option value="Needs">Needs</option>
              <option value="Wants">Wants</option>
              <option value="Savings">Savings</option>
            </select>
          </div>

          <div class="form-row">
            <input
              name="note"
              [(ngModel)]="model.note"
              placeholder="Note (optional)"
            />
          </div>

          <div class="actions-row">
            <button type="submit" [disabled]="f.invalid || isOverBalance">
              {{ editId ? "Update" : "Add" }}
            </button>

            <button type="button" (click)="resetForm()">Clear</button>
            <button *ngIf="editId" type="button" (click)="cancelEdit()">
              Cancel
            </button>
          </div>
        </form>
        <div *ngIf="errorMessage" class="error">
          {{ errorMessage }}
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .live-balance {
        margin-top: 6px;
        font-size: 0.85rem;
        color: #16a34a;
        font-weight: 500;
      }

      .live-balance.over {
        color: #dc2626;
      }

      .error {
        margin-top: 8px;
        color: #dc2626;
        font-size: 0.9rem;
        font-weight: 500;
      }

      .header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 10px;
        border-bottom: 1px solid #e5e7eb;
        white-space: nowrap;
      }

      .right {
        text-align: right;
      }

      .income {
        color: #16a34a;
        font-weight: 600;
      }
      .expense {
        color: #dc2626;
        font-weight: 600;
      }

      .actions button {
        margin-left: 6px;
      }
      .danger {
        color: #dc2626;
      }

      /* MOBILE CARDS */
      .tx-card {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 12px;
        margin-bottom: 12px;
        background: #fff;
      }

      .tx-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 1rem;
      }

      .tx-meta {
        display: flex;
        gap: 12px;
        margin-top: 6px;
        font-size: 0.85rem;
        color: #6b7280;
        flex-wrap: wrap;
      }

      .tx-actions {
        display: flex;
        gap: 8px;
        margin-top: 10px;
      }

      .form-row {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
      }

      .actions-row {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      /* RESPONSIVE SWITCH */
      .desktop-only {
        display: table;
      }
      .mobile-only {
        display: none;
      }

      @media (max-width: 768px) {
        .desktop-only {
          display: none;
        }
        .mobile-only {
          display: block;
        }
        .form-row {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class TransactionsComponent implements OnInit {
  liveRemaining: number | null = null;
  isOverBalance = false;

  balance = 0;
  errorMessage = "";

  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];

  filterMode: "current" | "all" = "current";
  editId: string | null = null;

  model: Partial<Transaction> = this.emptyModel();

  constructor(private txApi: TransactionApiService) {}

  ngOnInit() {
    this.load();
  }

  onAmountChange() {
    if (this.model.type !== "Expense") {
      this.liveRemaining = null;
      this.isOverBalance = false;
      return;
    }

    const amount = Number(this.model.amount ?? 0);
    this.liveRemaining = this.balance - amount;
    this.isOverBalance = this.liveRemaining < 0;
  }

  load() {
    this.txApi.getAll().subscribe((list) => {
      this.transactions = list.map((t: any) => ({
        id: t._id || t.id,
        type: t.type,
        category: t.category,
        amount: Number(t.amount),
        date: new Date(t.date).toISOString(),
        note: t.note || "",
        budgetType: t.budgetType,
      }));

      // 🔥 Calculate current balance
      const income = this.transactions
        .filter((t) => t.type === "Income")
        .reduce((s, t) => s + (t.amount ?? 0), 0);

      const expense = this.transactions
        .filter((t) => t.type === "Expense")
        .reduce((s, t) => s + (t.amount ?? 0), 0);

      this.balance = income - expense;

      this.applyFilter();
    });
  }

  applyFilter() {
    if (this.filterMode === "all") {
      this.filteredTransactions = [...this.transactions];
      return;
    }

    const now = new Date();
    this.filteredTransactions = this.transactions.filter((t) => {
      const d = new Date(t.date);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });
  }

  submit(form: NgForm) {
  this.errorMessage = '';

  // 1️⃣ Basic form validation
  if (form.invalid) return;

  // 2️⃣ 🔴 HARD BLOCK: Expense exceeds balance
  if (
    this.model.type === 'Expense' &&
    Number(this.model.amount ?? 0) > this.balance &&
    !this.editId
  ) {
    this.errorMessage = 'Expense exceeds available balance.';
    return;
  }

  // 3️⃣ Build payload ONLY if valid
  const payload = {
    type: this.model.type!,
    category: this.model.category!,
    amount: Number(this.model.amount ?? 0),
    date: new Date(this.model.date!).toISOString(),
    note: this.model.note || '',
    budgetType:
      this.model.type === 'Expense' ? this.model.budgetType : undefined
  };

  // 4️⃣ Create or update
  const request = this.editId
    ? this.txApi.update(this.editId, payload)
    : this.txApi.create(payload);

  request.subscribe(() => {
    this.load();
    this.resetForm();
  });
}


  startEdit(t: Transaction) {
    this.editId = t.id;
    this.model = {
      ...t,
      amount: Number(t.amount),
      date: new Date(t.date).toISOString().split("T")[0],
    };
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  cancelEdit() {
    this.resetForm();
  }

  confirmDelete(id: string) {
    if (!confirm("Delete this transaction?")) return;
    this.txApi.delete(id).subscribe(() => {
      this.transactions = this.transactions.filter((t) => t.id !== id);
      this.applyFilter();
    });
  }

  resetForm() {
    this.editId = null;
    this.model = this.emptyModel();
  }

  emptyModel(): Partial<Transaction> {
    return {
      type: "Expense",
      category: "",
      amount: undefined,
      date: new Date().toISOString().split("T")[0],
      note: "",
      budgetType: "Needs",
    };
  }
}
