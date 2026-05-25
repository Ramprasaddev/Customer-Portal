// src/app/components/finance/finance.module.ts
import { NgModule }       from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { RouterModule }   from '@angular/router';
import { FinanceComponent } from './finance.component';

// PrimeNG
import { TableModule }    from 'primeng/table';
import { TagModule }      from 'primeng/tag';
import { ButtonModule }   from 'primeng/button';
import { ChartModule }    from 'primeng/chart';
import { TooltipModule }  from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { InputTextModule }from 'primeng/inputtext';

@NgModule({
  declarations: [FinanceComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: FinanceComponent }]),
    TableModule,
    TagModule,
    ButtonModule,
    ChartModule,
    TooltipModule,
    SkeletonModule,
    InputTextModule,
  ],
})
export class FinanceModule {}
