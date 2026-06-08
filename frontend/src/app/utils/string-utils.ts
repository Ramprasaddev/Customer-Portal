export function stripLeadingZeros(v: any): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  const stripped = s.replace(/^0+/, '');
  return stripped === '' ? '0' : stripped;
}
