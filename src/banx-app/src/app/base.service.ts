import { Injectable } from '@angular/core';

import { urlJoin } from '../../../lib/common';

@Injectable({
    providedIn: 'root'
})
export abstract class BaseService {
    protected abstract get endpoint(): string;

    protected getUrl(end?: string) {
        if (!end) end = '';
        return urlJoin(this.endpoint, end);
    }

    protected getFullUrl(end?: string) {
        return urlJoin(window.origin, this.getUrl(end));
    }
}