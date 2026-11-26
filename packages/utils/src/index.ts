export * from './money';
export * from './phone';
export * from './dates';
export * from './categories';
export * from './windows';
export * from './geo';

/** "Full Moon 10K: Night Run!" → "full-moon-10k-night-run" */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
