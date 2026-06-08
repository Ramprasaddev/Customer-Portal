import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'stripZeros'
})
export class StripZerosPipe implements PipeTransform {
  transform(value: any): string {
    if (value === null || value === undefined) return '';
    const s = String(value);
    // preserve empty or all-zero -> return '0' if all zeros
    const stripped = s.replace(/^0+/, '');
    if (stripped === '') return '0';
    return stripped;
  }
}
