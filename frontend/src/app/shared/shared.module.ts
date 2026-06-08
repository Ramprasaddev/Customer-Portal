import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StripZerosPipe } from '../pipes/strip-zeros.pipe';

@NgModule({
  declarations: [StripZerosPipe],
  imports: [CommonModule],
  exports: [StripZerosPipe],
})
export class SharedModule {}
