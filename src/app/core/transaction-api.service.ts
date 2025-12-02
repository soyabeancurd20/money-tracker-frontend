// src/app/core/transaction-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TransactionApiService {
  base = environment.apiBase || 'https://money-tracker-backend-o18p.onrender.com';
  constructor(private http: HttpClient) {}
  getAll() { return this.http.get<any[]>(`${this.base}/api/transactions`); }
  create(payload:any){ return this.http.post(`${this.base}/api/transactions`, payload); }
  update(id:string, p:any){ return this.http.put(`${this.base}/api/transactions/${id}`, p); }
  delete(id:string){ return this.http.delete(`${this.base}/api/transactions/${id}`); }
}
