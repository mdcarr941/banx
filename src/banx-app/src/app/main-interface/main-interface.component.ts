import { Component, OnInit } from '@angular/core';

declare const isAdmin: Boolean;

@Component({
  selector: 'app-main-interface',
  templateUrl: './main-interface.component.html',
  styleUrls: ['./main-interface.component.css']
})
export class MainInterfaceComponent implements OnInit {
  isAdmin: Boolean = isAdmin;

  constructor() { }

  ngOnInit() {
  }

}
