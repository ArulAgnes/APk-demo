/** Shared local aliases so math modules do not import app-level types. */
export type Vec = number[];
export type Mat = number[][];

export interface Complex {
  re: number;
  im: number;
}

export const c = (re: number, im = 0): Complex => ({ re, im });
export const cadd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
export const csub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im });
export const cmul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
export const cdiv = (a: Complex, b: Complex): Complex => {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
};
export const cabs = (a: Complex): number => Math.hypot(a.re, a.im);
export const cscale = (a: Complex, k: number): Complex => ({ re: a.re * k, im: a.im * k });
export const cconj = (a: Complex): Complex => ({ re: a.re, im: -a.im });

export const cfmt = (a: Complex, digits = 6): string => {
  const re = Number(a.re.toFixed(digits));
  const im = Number(a.im.toFixed(digits));
  if (Math.abs(im) < 1e-10) return String(re === 0 ? 0 : re);
  const sign = im < 0 ? "-" : "+";
  const aim = Math.abs(im);
  if (Math.abs(re) < 1e-10) return `${aim === 1 ? "" : aim}i`;
  return `${re} ${sign} ${aim === 1 ? "" : aim}i`;
};
export const cIsReal = (a: Complex, tol = 1e-8): boolean => Math.abs(a.im) < tol;
