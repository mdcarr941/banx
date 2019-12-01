import { Component, ViewChild } from '@angular/core';
//import { AngularMonacoEditorComponent } from 'angular-monaco-editor';
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
  constructor(
    private sageShellService: SageShellService,
    private notifications: NotificationService
  ) { }

  readonly editorOptions = Object.freeze({
    theme: 'vs',
    language: 'python',
  });

  @ViewChild('resultTbody', {static: true}) resultTbody;

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

  //@ViewChild('codeInput') codeInput: AngularMonacoEditorComponent;

  private execute() {
    // const code = this.codeInput.value;
    // if (0 == code.length) return;

    // this.notifications.showLoading('Executing your code.');
    // this.sageShellService.execute(code)
    // .subscribe(
    //   response => {
    //     this.notifications.showSuccess('Code execution complete.');
    //     this.displayResult(response)
    //   },
    //   err => {
    //     this.notifications.showError('Failed to excute your code. Check the console for a stack trace.');
    //     console.error(err.error)
    //   }
    // );
  }
}
