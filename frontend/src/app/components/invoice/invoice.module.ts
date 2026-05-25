// src/app/components/invoice/invoice.module.ts
import { NgModule }      from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { RouterModule }  from '@angular/router';
import { InvoiceComponent } from './invoice.component';

// PrimeNG
import { TableModule }    from 'primeng/table';
import { TagModule }      from 'primeng/tag';
import { ButtonModule }   from 'primeng/button';
import { DialogModule }   from 'primeng/dialog';
import { TooltipModule }  from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { InputTextModule }from 'primeng/inputtext';
import { BadgeModule }    from 'primeng/badge';
import { DividerModule }  from 'primeng/divider';
import { ChipModule }     from 'primeng/chip';

@NgModule({
  declarations: [InvoiceComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: InvoiceComponent }]),
    TableModule,
    TagModule,
    ButtonModule,
    DialogModule,
    TooltipModule,
    SkeletonModule,
    InputTextModule,
    BadgeModule,
    DividerModule,
    ChipModule,
  ],
})
export class InvoiceModule {}
