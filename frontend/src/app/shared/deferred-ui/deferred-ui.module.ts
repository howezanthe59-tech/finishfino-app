import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { A11yPanelComponent } from '../a11y-panel/a11y-panel.component';
import { CookiePopupComponent } from '../cookie-popup/cookie-popup.component';

@NgModule({
  declarations: [
    A11yPanelComponent,
    CookiePopupComponent
  ],
  imports: [
    CommonModule,
    RouterModule
  ],
  exports: [
    A11yPanelComponent,
    CookiePopupComponent
  ]
})
export class DeferredUiModule {}
