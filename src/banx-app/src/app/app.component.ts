import { Component } from '@angular/core';

import { RemoteUserService } from './remote-user.service';
import { BanxUser } from '../../../lib/schema';

export const enterKeyCode = 13; // The key code of the enter key.

declare const MathJax;

MathJax.Hub.Register.StartupHook('TeX Jax Ready', function() {
  MathJax.InputJax.TeX.Definitions.macros.answer = 'answer';
  MathJax.InputJax.TeX.Parse.Augment({
    answer: function(name) {
      this.Push(MathJax.ElementJax.mml.mtext('Answer: '));
      this.Push(this.ParseArg(name));
    }
  })
});

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private remoteUser: BanxUser;

  constructor(private remoteUserService: RemoteUserService) {
    this.remoteUser = remoteUserService.remoteUser;
  }
}
