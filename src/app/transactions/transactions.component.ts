import { Component, OnInit } from '@angular/core';
import { Transaction } from '../models/transaction.model';
import { TransactionApiService } from '../core/transaction-api.service';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-transactions',
  template: `
  <div class="container">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h2 style="margin:0">Transactions</h2>
        <div class="small">Manage your income and expenses</div>
      </div>

      <div class="tx-layout">
        <!-- List -->
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
            <div class="small">Showing latest</div>
            <div class="small">Total: <strong>₱{{ totalAmount | number:'1.0-2' }}</strong></div>
          </div>

          <table class="table" style="margin-top:10px;">
            <thead><tr><th>Date</th><th>Category</th><th>Note</th><th style="text-align:right">Amount</th><th></th></tr></thead>
            <tbody>
              <tr *ngFor="let t of transactions">
                <td>{{ t.date | date:'mediumDate' }}</td>
                <td>{{ t.category }}</td>
                <td class="small">{{ t.note }}</td>
                <td style="text-align:right;color:{{ t.type==='Expense' ? 'var(--expense)' : 'var(--income)' }}">
                  {{ t.type === 'Income' ? '+' : '−' }}₱{{ t.amount | number:'1.0-2' }}
                </td>
                <td class="actions" style="text-align:right">
                  <button (click)="startEdit(t)">Edit</button>
                  <button (click)="confirmDelete(t.id)" style="color:var(--expense)">Delete</button>
                </td>
              </tr>
              <tr *ngIf="transactions.length===0"><td colspan="5" class="empty">No transactions yet — add one below.</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Form -->
        <div>
          <div class="card" style="padding:14px;">
            <h3 style="margin-top:0">{{ editId ? 'Edit transaction' : 'Add transaction' }}</h3>

            <form #f="ngForm" (ngSubmit)="submit(f)" novalidate>
              <div class="form-row" style="margin-bottom:8px;">
                <select name="type" [(ngModel)]="model.type" required>
                  <option value="Expense">Expense</option>
                  <option value="Income">Income</option>
                </select>

                <input name="category" [(ngModel)]="model.category" placeholder="Category" required />
              </div>

              <div class="form-row" style="margin-bottom:8px;">
                <input name="amount" type="number" [(ngModel)]="model.amount" placeholder="Amount" required min="0.01" step="0.01" />
                <input name="date" type="date" [(ngModel)]="model.date" required />
              </div>

              <div style="margin-bottom:10px;">
                <input name="note" [(ngModel)]="model.note" placeholder="Note (optional)" style="width:100%" />
              </div>

              <div style="display:flex;gap:8px;align-items:center;">
                <button type="submit" [disabled]="f.invalid" style="background:var(--accent);color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer">
                  {{ editId ? 'Update' : 'Add' }}
                </button>

                <button type="button" (click)="resetForm()" style="padding:10px 12px;border-radius:8px;">Clear</button>

                <button *ngIf="editId" type="button" (click)="cancelEdit()" style="padding:10px 12px;border-radius:8px;">Cancel</button>

                <div style="margin-left:auto" *ngIf="message" class="small">{{ message }}</div>
              </div>

              <div *ngIf="showErrors" class="help" style="margin-top:8px">Please fill required fields correctly.</div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
  `
})
export class TransactionsComponent implements OnInit {
  transactions: Transaction[] = [];
  model: Partial<Transaction> = {
    type: 'Expense',
    category: '',
    amount: undefined,
    date: new Date().toISOString().slice(0, 10),
    note: ''
  };
  editId: string | null = null;
  message = '';
  showErrors = false;
  totalAmount = 0;

  constructor(private txApi: TransactionApiService) {}

  ngOnInit() {
    this.load();
  }

  // Normalizes backend records to always include `id` and standardized fields
  private normalize(list: any[]): Transaction[] {
    return (list || []).map((t: any) => {
      const dateStr = t.date ? new Date(t.date).toISOString() : new Date().toISOString();
      return {
        id: t.id || t._id || String(t._id || t.id || Math.random().toString(36).slice(2,9)),
        type: t.type,
        category: t.category,
        amount: Number(t.amount || 0),
        date: dateStr,
        note: t.note || ''
      } as Transaction;
    });
  }

  load() {
    this.txApi.getAll().subscribe(list => {
      this.transactions = this.normalize(list).sort((a, b) => +new Date(b.date) - +new Date(a.date));
      this.computeTotals();
    }, err => {
      console.error(err);
      this.transactions = [];
      this.computeTotals();
    });
  }

  computeTotals() {
    this.totalAmount = this.transactions.reduce((s, t) => {
      return s + (t.type === 'Income' ? Number(t.amount) : -Number(t.amount));
    }, 0);
  }

  submit(form: NgForm) {
    this.showErrors = false;
    if (form.invalid) {
      this.showErrors = true;
      return;
    }

    const payload = {
      type: (this.model.type || 'Expense') as 'Income' | 'Expense',
      category: (this.model.category || '').trim(),
      amount: Number(this.model.amount),
      date: new Date(this.model.date!).toISOString(),
      note: this.model.note || ''
    };

    if (this.editId) {
      this.txApi.update(this.editId, payload).subscribe({
        next: () => {
          this.message = 'Updated';
          this.resetForm();
          this.load();
          setTimeout(()=> this.message = '', 1600);
        },
        error: (err) => {
          console.error(err);
          this.message = 'Update failed';
          setTimeout(()=> this.message = '', 1600);
        }
      });
    } else {
      this.txApi.create(payload).subscribe({
        next: () => {
          this.message = 'Added';
          this.resetForm();
          this.load();
          setTimeout(()=> this.message = '', 1600);
        },
        error: (err) => {
          console.error(err);
          this.message = 'Add failed';
          setTimeout(()=> this.message = '', 1600);
        }
      });
    }
  }

  startEdit(t: Transaction) {
    // t.date might be ISO string — convert to yyyy-mm-dd for input
    const iso = new Date(t.date).toISOString();
    const yyyyMmDd = iso.split('T')[0];
    this.editId = t.id;
    this.model = { ...t, date: yyyyMmDd, amount: Number(t.amount) } as any;
    // scroll to form so user notices edit
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.editId = null;
    this.resetForm();
  }

  resetForm() {
    this.editId = null;
    this.model = { type: 'Expense', category: '', amount: undefined, date: new Date().toISOString().slice(0,10), note: '' };
    this.showErrors = false;
  }

  confirmDelete(id: string) {
    if (!id) { console.warn('Missing id for delete'); return; }
    if (!confirm('Delete this transaction?')) return;

    this.txApi.delete(id).subscribe({
      next: () => {
        // optimistic: remove from local list for instant feedback
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.computeTotals();
        this.message = 'Deleted';
        setTimeout(()=> this.message = '', 1200);
      },
      error: (err) => {
        console.error(err);
        alert('Delete failed');
      }
    });
  }
}
