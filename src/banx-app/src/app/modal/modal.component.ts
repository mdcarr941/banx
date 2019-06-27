import * as $ from 'jquery';

import { Component, ViewChild, Input } from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css']
})
export class ModalComponent {
  @Input() public title = 'Modal Dialog';

  constructor() { }

  @ViewChild('modalDiv') private modalDiv;

  public show(): void {
    $(this.modalDiv.nativeElement).show();
  }

  public hide(): void {
    $(this.modalDiv.nativeElement).hide();
  }
}
