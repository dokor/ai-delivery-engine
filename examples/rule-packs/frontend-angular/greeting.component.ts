// angular/smart-dumb-components — a presentational (dumb) component: input/output
// driven, no data access. A container component would orchestrate the data.
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-greeting',
  template: `<p (click)="greeted.emit()">Hello, {{ name }}</p>`
})
export class GreetingComponent {
  @Input() name = '';
  @Output() greeted = new EventEmitter<void>();
}
