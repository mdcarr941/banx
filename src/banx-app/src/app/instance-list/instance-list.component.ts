import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiService } from '../api.service';
import { InstanceService } from '../instance.service';

@Component({
  selector: 'app-instance-list',
  templateUrl: './instance-list.component.html'
})
export class InstanceListComponent {
  constructor(
    private api: ApiService,
    private instanceService: InstanceService
  ) {}

  private clearSelection() {
    this.instanceService.instances$.next([]);
  }

  private submit() {
    if (this.instanceService.instances$.value.length <= 0) {
      alert('Select at least one instance before submitting.');
      return;
    }
    this.api.submit(this.instanceService.instances$.value).subscribe(
      (response: any) => this.onSubmissionSuccess(response),
      (err: HttpErrorResponse) => this.onSubmissionFailure(err)
    );
  }

  private onSubmissionSuccess(response: any) {
    alert('Submission Successful');
    this.clearSelection();
  }

  private onSubmissionFailure(err: HttpErrorResponse) {
    console.error(err);
    alert(`Submission Failed:\n${err.error}`);
  }
}
