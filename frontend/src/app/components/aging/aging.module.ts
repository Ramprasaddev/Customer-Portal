// src/app/components/aging/aging.module.ts
import { NgModule }       from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { RouterModule }   from '@angular/router';
import { AgingComponent } from './aging.component';
import { SharedModule } from '../../shared/shared.module';

// PrimeNG
import { TableModule }    from 'primeng/table';
import { TagModule }      from 'primeng/tag';
import { ButtonModule }   from 'primeng/button';
import { ChartModule }    from 'primeng/chart';
import { TooltipModule }  from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { InputTextModule }from 'primeng/inputtext';

@NgModule({
  declarations: [AgingComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: AgingComponent }]),
    TableModule,
    TagModule,
    ButtonModule,
    ChartModule,
    TooltipModule,
    SkeletonModule,
    InputTextModule,
    SharedModule,
  ],
})
export class AgingModule {}
