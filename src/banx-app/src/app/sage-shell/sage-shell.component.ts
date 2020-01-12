import { Component, ViewChild } from '@angular/core';
import * as $ from 'jquery';

import { SageShellService } from '../sage-shell.service';
import { SageVariables } from '../../../../lib/sageServer';
import { NotificationService } from '../notification.service';

@Component({
  selector: 'app-sage-shell',
  templateUrl: './sage-shell.component.html',
  styleUrls: ['./sage-shell.component.css']
})
export class SageShellComponent {
  public code: string;

  constructor(
    private sageShellService: SageShellService,
    private notifications: NotificationService
  ) { }

  public readonly editorOptions = Object.freeze({
    theme: 'vs',
    language: 'python',
  });

  @ViewChild('resultTbody') resultTbody;

  private displayResult(response: SageVariables) {
    const elem: HTMLTableSectionElement = this.resultTbody.nativeElement;
    $(elem).empty();
    let row: HTMLTableRowElement;
    let data: HTMLTableDataCellElement;
    for (let key in response) { 
      row = document.createElement('tr');
      elem.append(row);
      data = document.createElement('td');
      row.append(data);
      data.innerText = key;
      data = document.createElement('td');
      row.append(data);
      data.innerText = response[key];
    }
  }

  public execute() {
    if (0 == this.code.length) return;

    this.notifications.showLoading('Executing your code.');
    this.sageShellService.execute(this.code)
    .subscribe(
      response => {
        this.notifications.showSuccess('Code execution complete.');
        this.displayResult(response)
      },
      err => {
        this.notifications.showError('Failed to excute your code. Check the console for a stack trace.');
        console.error(err.error)
      }
    );
  }
}
