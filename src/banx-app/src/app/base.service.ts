import { Injectable } from '@angular/core';

import { urlJoin } from '../../../lib/common';

@Injectable({
    providedIn: 'root'
})
export abstract class BaseService {
    // We are assuming that the app is hosted under the 'app' path,
    // but that there could be zero or more path components which
    // preceed 'app'.
    protected static readonly prefixRgx = /^(.*)\/app/;

    protected readonly prefix: string;
    protected abstract get endpoint(): string;

    constructor() {
        const pathname = window.location.pathname;
        const match = BaseService.prefixRgx.exec(pathname);
        if (!match) {
            throw new Error(`Failed to extract the app prefix from '${pathname}'`);
        }
        this.prefix = match[1];   
    }

    protected getUrl(end?: string) {
        if (!end) end = '';
        return urlJoin(this.endpoint, end);
    }

    protected getFullUrl(end?: string) {
        return urlJoin(window.origin, this.prefix, this.getUrl(end));
    }
}