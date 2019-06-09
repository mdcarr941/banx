import { Component, OnInit, ViewChild } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { BanxUser } from '../../../../lib/schema';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  users$: BehaviorSubject<BanxUser[]> = new BehaviorSubject<BanxUser[]>([]);

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.api.listUsers().subscribe(this.users$);
  }

  @ViewChild('userGlidInput') userGlidInput;

  addUser(): void {
    const glid: string = this.userGlidInput.nativeElement.value;
    if (!glid || glid.length == 0) return;
    this.api.insertUser(new BanxUser({glid: glid, roles: []}))
    .subscribe(user => {
      this.users$.value.push(user);
      this.users$.next(this.users$.value);
      this.userGlidInput.nativeElement.value = '';
    });
  }

  deleteUser(user: BanxUser): void {
    if (!confirm(`Are you sure you want to delete ${user.glid}? This action cannot be undone.`)) {
      return;
    }
    this.api.deleteUser(user)
    .subscribe(deleteSucceeded => {
      if (!deleteSucceeded) {
        alert('Failed to delete the user.');
        return;
      }
      const index = this.users$.value.findIndex(entry => entry.glid == user.glid);
      if (index < 0) {
        console.error('Failed to remove a user from users$.');
        return;
      }
      this.users$.value.splice(index, 1);
      this.users$.next(this.users$.value);
    });
  }
}
