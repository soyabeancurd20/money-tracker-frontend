import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Transaction } from '../models/transaction.model';
const API = 'https://money-tracker-backend-o18p.onrender.com/api/transactions';
@Injectable({ providedIn: 'root' })
export class TransactionApiService {
  constructor(private http: HttpClient) {}
  getAll(): Observable<Transaction[]> { return this.http.get<Transaction[]>(API); }
  create(payload: Omit<Transaction,'id'>) { return this.http.post<Transaction>(API, payload); }
  update(id:string, patch: Partial<Transaction>) { return this.http.put<Transaction>(`${API}/${id}`, patch); }
  delete(id:string) { return this.http.delete(`${API}/${id}`); }
}
