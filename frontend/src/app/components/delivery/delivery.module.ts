import { NgModule }     from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ChartModule }  from 'primeng/chart';
import { DeliveryComponent } from './delivery.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [DeliveryComponent],
  imports: [
    CommonModule, FormsModule,
    RouterModule.forChild([{ path: '', component: DeliveryComponent }]),
    ChartModule, SharedModule,
  ],
})
export class DeliveryModule {}
