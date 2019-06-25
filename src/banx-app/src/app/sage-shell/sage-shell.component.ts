import { Component, ViewChild } from '@angular/core';
import * as $ from 'jquery';

import { SageShellService } from '../sage-shell.service';
import { SageVariables } from '../../../../lib/sageServer';

@Component({
  selector: 'app-sage-shell',
  templateUrl: './sage-shell.component.html',
  styleUrls: ['./sage-shell.component.css']
})
export class SageShellComponent {
  constructor(private sageShellService: SageShellService) { }

  @ViewChild('codeInput') codeInput;
  @ViewChild('result') result;

  private displayResult(response: SageVariables) {
    const elem: HTMLTableSectionElement = this.result.nativeElement;
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

  @ViewChild('resultDiv') resultDiv;

  private execute() {
    const code = this.codeInput.nativeElement.value;
    this.sageShellService.execute(code)
    .subscribe(
      response => this.displayResult(response),
      err => this.resultDiv.nativeElement.innerText = 'Error: ' + err.message
    );
  }
}
