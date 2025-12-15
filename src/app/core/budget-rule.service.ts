import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BudgetRuleService {
  base = environment.apiBase || 'https://money-tracker-backend-o18p.onrender.com';

  constructor(private http: HttpClient) {}

  getRule() {
    return this.http.get<any>(`${this.base}/api/budget-rule`);
  }

  updateRule(rule: { needs: number; wants: number; savings: number }) {
    return this.http.put(`${this.base}/api/budget-rule`, rule);
  }
}
