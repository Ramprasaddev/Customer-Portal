import { NgModule }     from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ChartModule }  from 'primeng/chart';
import { DeliveryComponent } from './delivery.component';

@NgModule({
  declarations: [DeliveryComponent],
  imports: [
    CommonModule, FormsModule,
    RouterModule.forChild([{ path: '', component: DeliveryComponent }]),
    ChartModule,
  ],
})
export class DeliveryModule {}
