import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiService } from './api.service';
import { InstanceService } from './instance.service';

@Component({
  selector: 'app-instance-list',
  template:
    `<div class="row pad-top">
      <div class="col">
        <a routerLink="/home" routerLinkActive="active">Back</a>
      </div>
      <div class="col text-right">
        <a class="btn btn-link" href="#" (click)="submit()" [class.disabled]="this.instanceService.instances.length == 0">Submit</a>
      </div>
    </div>
    <div class="row" *ngFor="let instance of instanceService.instances">
      <div class="col-md-12">
        <pre>{{instance.content}}</pre>
        <button class="btn btn-danger" (click)="instanceService.deselect(instance)">
          Deselect
        </button>
      </div>
      <hr>
    </div>`
})
export class InstanceListComponent {
  constructor(
    private api: ApiService,
    private instanceService: InstanceService
  ) {}

  submit() {
    if (this.instanceService.instances.length <= 0) {
      alert('Select at least one instance before submitting.');
      return;
    }
    this.api.submit(this.instanceService.instances).subscribe(
      (response: any) => this.onSubmissionSuccess(response),
      (err: HttpErrorResponse) => this.onSubmissionFailure(err)
    );
  }

  onSubmissionSuccess(response: any) {
    alert('Submission Successful');
    this.instanceService.instances.splice(0);
  }

  onSubmissionFailure(err: HttpErrorResponse) {
    console.error(err);
    alert(`Submission Failed:\n${err.error}`);
  }
}
