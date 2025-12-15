import { Component, OnInit } from '@angular/core';
import { Transaction } from '../models/transaction.model';
import { TransactionApiService } from '../core/transaction-api.service';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-transactions',
  template: `
  <div class="container">
    <div class="card">

      <!-- HEADER -->
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h2>Transactions</h2>

        <!-- FILTER -->
        <select [(ngModel)]="filterMode" (change)="applyFilter()">
          <option value="current">Current Month</option>
          <option value="all">All</option>
        </select>
      </div>

      <!-- LIST -->
      <table class="table" style="margin-top:12px;">
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Type</th>
            <th>Rule</th>
            <th style="text-align:right">Amount</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          <tr *ngFor="let t of filteredTransactions">
            <td>{{ t.date | date:'mediumDate' }}</td>
            <td>{{ t.category }}</td>
            <td>{{ t.type }}</td>
            <td>{{ t.budgetType || '-' }}</td>
            <td style="text-align:right">
              {{ t.type === 'Income' ? '+' : '-' }}₱{{ t.amount | number:'1.0-2' }}
            </td>
            <td style="text-align:right">
              <button (click)="startEdit(t)">Edit</button>
              <button (click)="confirmDelete(t.id)" style="color:#dc2626">
                Delete
              </button>
            </td>
          </tr>

          <tr *ngIf="filteredTransactions.length === 0">
            <td colspan="6" class="empty">
              No transactions found
            </td>
          </tr>
        </tbody>
      </table>

      <hr />

      <!-- FORM -->
      <h3>{{ editId ? 'Edit Transaction' : 'Add Transaction' }}</h3>

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
            placeholder="Amount"
            min="0.01"
            step="0.01"
            required
          />

          <input
            type="date"
            name="date"
            [(ngModel)]="model.date"
            required
          />
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

        <div style="display:flex;gap:8px;margin-top:10px;">
          <button type="submit" [disabled]="f.invalid">
            {{ editId ? 'Update' : 'Add' }}
          </button>
          <button type="button" (click)="resetForm()">Clear</button>
          <button *ngIf="editId" type="button" (click)="cancelEdit()">Cancel</button>
        </div>

      </form>
    </div>
  </div>
  `
})
export class TransactionsComponent implements OnInit {

  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];

  filterMode: 'current' | 'all' = 'current';

  editId: string | null = null;

  model: Partial<Transaction> = {
    type: 'Expense',
    category: '',
    amount: undefined,
    date: new Date().toISOString().split('T')[0],
    note: '',
    budgetType: 'Needs'
  };

  constructor(private txApi: TransactionApiService) {}

  ngOnInit() {
    this.load();
  }

  /* ---------------- LOAD ---------------- */

  load() {
    this.txApi.getAll().subscribe(list => {
      this.transactions = list.map((t: any) => ({
        id: t._id || t.id,
        type: t.type,
        category: t.category,
        amount: Number(t.amount),
        date: new Date(t.date).toISOString(),
        note: t.note || '',
        budgetType: t.budgetType
      }));
      this.applyFilter();
    });
  }

  /* ---------------- FILTER ---------------- */

  applyFilter() {
    if (this.filterMode === 'all') {
      this.filteredTransactions = [...this.transactions];
      return;
    }

    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();

    this.filteredTransactions = this.transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
  }

  /* ---------------- ADD / UPDATE ---------------- */

  submit(form: NgForm) {
    if (form.invalid) return;

    const payload = {
      type: this.model.type!,
      category: this.model.category!,
      amount: Number(this.model.amount),
      date: new Date(this.model.date!).toISOString(),
      note: this.model.note || '',
      budgetType: this.model.type === 'Expense'
        ? this.model.budgetType
        : undefined
    };

    if (this.editId) {
      this.txApi.update(this.editId, payload).subscribe(() => {
        this.load();
        this.resetForm();
      });
    } else {
      this.txApi.create(payload).subscribe(() => {
        this.load();
        this.resetForm();
      });
    }
  }

  /* ---------------- EDIT ---------------- */

  startEdit(t: Transaction) {
    this.editId = t.id;
    this.model = {
      ...t,
      amount: Number(t.amount),
      date: new Date(t.date).toISOString().split('T')[0]
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.resetForm();
  }

  /* ---------------- DELETE ---------------- */

  confirmDelete(id: string) {
    if (!confirm('Delete this transaction?')) return;

    this.txApi.delete(id).subscribe(() => {
      this.transactions = this.transactions.filter(t => t.id !== id);
      this.applyFilter();
    });
  }

  /* ---------------- UTIL ---------------- */

  resetForm() {
    this.editId = null;
    this.model = {
      type: 'Expense',
      category: '',
      amount: undefined,
      date: new Date().toISOString().split('T')[0],
      note: '',
      budgetType: 'Needs'
    };
  }
}
