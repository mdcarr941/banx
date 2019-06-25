import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { BaseService } from './base.service';
import { SageVariables } from '../../../lib/sageServer';

@Injectable({
    providedIn: 'root'
})
export class SageShellService extends BaseService {
    protected readonly endpoint = 'sageshell';
    
    constructor(private http: HttpClient) {
        super();
    }

    public execute(code: string): Observable<SageVariables> {
        return this.http.post<SageVariables>(this.getUrl(), {code: code});
    }
}