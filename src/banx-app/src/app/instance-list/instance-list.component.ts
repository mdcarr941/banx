import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { ProblemsService } from '../problems.service';
import { InstanceService } from '../instance.service';
import { NotificationService } from '../notification.service';

@Component({
  selector: 'app-instance-list',
  templateUrl: './instance-list.component.html'
})
export class InstanceListComponent {
  constructor(
    private api: ProblemsService,
    private instanceService: InstanceService,
    private notifications: NotificationService
  ) {}

  private clearSelection() {
    this.instanceService.instances$.next([]);
  }

  private submit() {
    if (this.instanceService.instances$.value.length <= 0) {
      alert('Select at least one instance before submitting.');
      return;
    }

    this.notifications.showLoading('Submitting your assignment.');
    this.api.submit(this.instanceService.instances$.value).subscribe(
      (response: any) => this.onSubmissionSuccess(response),
      (err: HttpErrorResponse) => this.onSubmissionFailure(err)
    );
  }

  private onSubmissionSuccess(response: any) {
    this.notifications.showSuccess('Problems submitted.');
    this.clearSelection();
  }

  private onSubmissionFailure(err: HttpErrorResponse) {
    this.notifications.showError('Submission failed.');
    console.error(err);
  }
}
