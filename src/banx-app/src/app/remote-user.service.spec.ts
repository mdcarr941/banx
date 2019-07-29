import { TestBed } from '@angular/core/testing';

import { RemoteUserService } from './remote-user.service';

describe('RemoteUserService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: RemoteUserService = TestBed.get(RemoteUserService);
    expect(service).toBeTruthy();
  });
});
