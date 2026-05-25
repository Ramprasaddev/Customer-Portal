import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InquiriesComponent } from './inquiries.component';

import { TableModule }    from 'primeng/table';
import { TagModule }      from 'primeng/tag';
import { ButtonModule }   from 'primeng/button';
import { DialogModule }   from 'primeng/dialog';
import { TooltipModule }  from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { ChartModule }    from 'primeng/chart';

@NgModule({
  declarations: [InquiriesComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: InquiriesComponent }]),
    TableModule, TagModule, ButtonModule, DialogModule, TooltipModule, SkeletonModule, ChartModule,
  ],
})
export class InquiriesModule {}
