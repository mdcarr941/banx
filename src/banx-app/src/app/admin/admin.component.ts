import { Component, OnInit, ViewChild } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { BanxUser, UserRole } from '../../../../lib/schema';
import { UsersService } from '../users.service';
import { ModalComponent } from '../modal/modal.component';
import { NotificationService } from '../notification.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  users$: BehaviorSubject<BanxUser[]> = new BehaviorSubject<BanxUser[]>([]);
  selectedUser: BanxUser;

  constructor(
    private users: UsersService,
    private notifications: NotificationService
  ) { }

  ngOnInit() {
    this.users.list().subscribe(this.users$);
  }

  @ViewChild('userGlidInput') userGlidInput;

  addUser(): void {
    const glid: string = this.userGlidInput.nativeElement.value;
    if (!glid || glid.length == 0) return;

    this.notifications.showLoading(`Adding ${glid}.`);
    this.users.insert(new BanxUser({glid: glid, roles: []}))
    .subscribe(user => {
      this.notifications.showSuccess(`Succesfully added ${glid}.`);
      this.users$.value.push(user);
      this.users$.next(this.users$.value);
      this.userGlidInput.nativeElement.value = '';
    }, err => {
      this.notifications.showError(`Failed to ${glid}.`);
      console.error(err);
    });
  }

  deleteUser(user: BanxUser): void {
    if (!confirm(`Are you sure you want to delete ${user.glid}? This action cannot be undone.`)) {
      return;
    }

    this.notifications.showLoading(`Deleting ${user.glid}.`);
    this.users.delete(user.glid)
    .subscribe(deleteSucceeded => {
      if (!deleteSucceeded) {
        this.notifications.showError(`Failed to delete ${user.glid}.`);
        return;
      }
      const index = this.users$.value.findIndex(entry => entry.glid == user.glid);
      if (index < 0) {
        console.error('Failed to remove a user from users$ (this shouldn\'t happen).');
        return;
      }
      this.users$.value.splice(index, 1);
      this.users$.next(this.users$.value);
      this.notifications.showSuccess(`Deleted user ${user.glid}.`);
    }, err => {
      this.notifications.showError(`An error occured while attempting to delete ${user.glid}.`);
      console.error(err);
    });
  }

  @ViewChild('adminModal') adminModal: ModalComponent;

  modifyUser(user: BanxUser): void {
    this.selectedUser = user;
    this.adminModal.show()
  }

  @ViewChild('adminCheckbox') adminCheckbox;
  @ViewChild('authorCheckbox') authorCheckbox;

  submitUserModifications(): void {
    const user = this.selectedUser;
    const roles: UserRole[] = [];
    if (this.adminCheckbox.nativeElement.checked) roles.push(UserRole.Admin);
    if (this.authorCheckbox.nativeElement.checked) roles.push(UserRole.Author);

    this.notifications.showLoading(`Modifying ${user.glid}.`);
    this.users.modify(user.glid, roles)
    .subscribe(
    result => {
      if (result) {
        this.notifications.showSuccess(`Successfully modified ${user.glid}.`);
        user.roles = roles;
      }
      else this.notifications.showError(`Failed to modify ${user.glid}.`);
      this.adminModal.hide();
    },
    err => {
      this.notifications.showError(`An error occured while modifying ${user.glid}.`);
      this.adminModal.hide();
    });
  }
}
