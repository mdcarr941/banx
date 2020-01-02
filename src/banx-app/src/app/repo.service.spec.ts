import { TestBed } from '@angular/core/testing';

import { RepoService } from './repo.service';
import { HttpClientModule } from '@angular/common/http';

describe('RepoService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [
      HttpClientModule
    ]
  }));

  it('should be created', () => {
    const service: RepoService = TestBed.get(RepoService);
    expect(service).toBeTruthy();
  });
});
