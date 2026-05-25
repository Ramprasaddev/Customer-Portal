import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { CardModule }        from 'primeng/card';
import { TableModule }       from 'primeng/table';
import { ChartModule }       from 'primeng/chart';
import { TagModule }         from 'primeng/tag';
import { ButtonModule }      from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputTextModule }   from 'primeng/inputtext';
import { CalendarModule }    from 'primeng/calendar';
import { SkeletonModule }    from 'primeng/skeleton';
import { BadgeModule }       from 'primeng/badge';
import { TooltipModule }     from 'primeng/tooltip';
import { ChipModule }        from 'primeng/chip';
import { DividerModule }     from 'primeng/divider';
import { AvatarModule }      from 'primeng/avatar';

import { DashboardComponent } from './dashboard.component';

@NgModule({
  declarations: [DashboardComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: DashboardComponent }]),
    CardModule,
    TableModule,
    ChartModule,
    TagModule,
    ButtonModule,
    ProgressBarModule,
    InputTextModule,
    CalendarModule,
    SkeletonModule,
    BadgeModule,
    TooltipModule,
    ChipModule,
    DividerModule,
    AvatarModule,
  ],
})
export class DashboardModule {}
