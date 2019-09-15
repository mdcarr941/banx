import { TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';

import { ProblemsService } from './problems.service';

describe('ProblemsService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [
      HttpClientModule
    ]
  }));

  it('should be created', () => {
    const service: ProblemsService = TestBed.get(ProblemsService);
    expect(service).toBeTruthy();
  });
});
