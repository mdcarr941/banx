import { Component, OnInit } from '@angular/core';

declare const isAdmin: Boolean;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private isAdmin: Boolean = isAdmin;
  ngOnInit() {}
}
