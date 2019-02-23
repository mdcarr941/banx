import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

import { Problem } from '../../../../lib/schema';

@Component({
  selector: 'app-instance-list',
  templateUrl: './instance-list.component.html',
  styleUrls: ['./instance-list.component.css']
})
export class InstanceListComponent implements OnInit {
  @Input() selectedInstances;
  @Output() deselect = new EventEmitter<Problem>();

  constructor() { }

  ngOnInit() { }
}
