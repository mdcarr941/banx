import { Component, OnInit, ViewChild } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { BanxUser, UserRole } from '../../../../lib/schema';
import { ApiService } from '../api.service';

declare const $: Function;

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  users$: BehaviorSubject<BanxUser[]> = new BehaviorSubject<BanxUser[]>([]);
  selectedUser: BanxUser;

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
    this.api.deleteUser(user.glid)
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

  modifyUser(user: BanxUser): void {
    this.selectedUser = user;
    $('#modifyUserModal').modal('show');
  }

  @ViewChild('adminCheckbox') adminCheckbox;
  @ViewChild('authorCheckbox') authorCheckbox;

  submitUserModifications(): void {
    const user = this.selectedUser;
    const roles: UserRole[] = [];
    if (this.adminCheckbox.nativeElement.checked) roles.push(UserRole.Admin);
    if (this.authorCheckbox.nativeElement.checked) roles.push(UserRole.Author);
    this.api.modifyUser(user.glid, roles)
    .subscribe(
    result => {
      if (result) {
        alert(`Successfully modified ${user.glid}.`);
        user.roles = roles;
      }
      else alert(`Failed to modify ${user.glid}.`);
      $('#modifyUserModal').modal('hide');
    },
    err => {
      alert(`An error occured while modifying ${user.glid}.`);
      $('#modifyUserModal').modal('hide');
    });
  }
}
