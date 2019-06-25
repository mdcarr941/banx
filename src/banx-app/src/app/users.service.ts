import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { IBanxUser, BanxUser, UserRole } from '../../../lib/schema';
import { BaseService } from './base.service';

@Injectable({
    providedIn: 'root'
})
export class UsersService extends BaseService {
    protected readonly endpoint = 'users';

    constructor(private http: HttpClient) {
      super();
    }

    list(): Observable<BanxUser[]> {
      return this.http.get<IBanxUser[]>(this.getUrl())
        .pipe(map(response => response.map(iuser => new BanxUser(iuser))));
    }
  
    insert(user: BanxUser): Observable<BanxUser> {
      return this.http.post<BanxUser>(this.getUrl(), user)
        .pipe(map(response => new BanxUser(response)));
    }
  
    delete(glid: string): Observable<Boolean> {
      return this.http.delete<any>(this.getUrl(glid))
        .pipe(map(response => response.deleteSucceeded));
    }
  
    modify(glid: string, roles: UserRole[]): Observable<Boolean> {
      return this.http.post<any>(this.getUrl(glid), roles)
        .pipe(map(response => response.result));
    }
}