/**
 * BigValue.ts — Aritmética y representación de grandes números (Sección 3.6).
 * Almacena números mediante mantisa normalizada (1 <= |m| < 10) y exponente entero (base 10).
 * Soporta serialización a red (toWire/fromWire) y formateo corporativo / Libro Mayor.
 */

const SUPERSCRIPTS: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};

const spanishFormatter = new Intl.NumberFormat('es-ES', {
  useGrouping: true,
  maximumFractionDigits: 0,
});

function toSuperscript(num: number): string {
  return String(num)
    .split('')
    .map((c) => SUPERSCRIPTS[c] ?? c)
    .join('');
}

export class BigValue {
  readonly mantissa: number;
  readonly exponent: number;

  static readonly ZERO = new BigValue(0, 0);
  static readonly ONE = new BigValue(1, 0);

  constructor(mantissa = 0, exponent = 0) {
    if (mantissa === 0 || !Number.isFinite(mantissa)) {
      this.mantissa = 0;
      this.exponent = 0;
      return;
    }

    let m = mantissa;
    let e = Math.floor(exponent);

    const absM = Math.abs(m);
    if (absM >= 10 || absM < 1) {
      const shift = Math.floor(Math.log10(absM));
      m /= Math.pow(10, shift);
      e += shift;
    }

    // Corregir imprecisión de punto flotante en fronteras
    if (Math.abs(m) >= 10) {
      m /= 10;
      e += 1;
    } else if (Math.abs(m) < 1 && m !== 0) {
      m *= 10;
      e -= 1;
    }

    this.mantissa = Number(m.toFixed(12));
    this.exponent = e;
  }

  static fromNumber(n: number): BigValue {
    if (n === 0 || !Number.isFinite(n)) return BigValue.ZERO;
    return new BigValue(n, 0);
  }

  static fromBigInt(bi: bigint): BigValue {
    if (bi === 0n) return BigValue.ZERO;
    return BigValue.fromString(bi.toString());
  }

  static fromString(s: string): BigValue {
    const trimmed = s.trim().replace(/\s+/g, '');
    if (!trimmed || trimmed === '0') return BigValue.ZERO;

    if (trimmed.includes('e') || trimmed.includes('E')) {
      const [mStr, eStr] = trimmed.toLowerCase().split('e');
      const m = parseFloat(mStr);
      const e = parseInt(eStr, 10);
      return new BigValue(m, e);
    }

    const n = Number(trimmed);
    if (Number.isFinite(n) && Math.abs(n) < 1e15) {
      return BigValue.fromNumber(n);
    }

    // Para enteros grandes que superan precisión segura de Number
    const negative = trimmed.startsWith('-');
    const digits = negative ? trimmed.slice(1) : trimmed;
    const dotIdx = digits.indexOf('.');
    const intPart = dotIdx >= 0 ? digits.slice(0, dotIdx) : digits;
    const fracPart = dotIdx >= 0 ? digits.slice(dotIdx + 1) : '';

    if (intPart.length > 0 && intPart !== '0') {
      const e = intPart.length - 1;
      const combined = intPart[0] + '.' + intPart.slice(1) + fracPart;
      const m = parseFloat(combined) * (negative ? -1 : 1);
      return new BigValue(m, e);
    } else {
      // Fracción pura < 1
      const firstNonZero = fracPart.search(/[1-9]/);
      if (firstNonZero < 0) return BigValue.ZERO;
      const e = -(firstNonZero + 1);
      const m = parseFloat(fracPart.slice(firstNonZero)) * (negative ? -1 : 1);
      return new BigValue(m, e);
    }
  }

  static from(val: BigValue | number | string | bigint): BigValue {
    if (val instanceof BigValue) return val;
    if (typeof val === 'number') return BigValue.fromNumber(val);
    if (typeof val === 'bigint') return BigValue.fromBigInt(val);
    return BigValue.fromString(val);
  }

  static fromWire(wire: string): BigValue {
    return BigValue.fromString(wire);
  }

  toWire(): string {
    if (this.mantissa === 0) return '0';
    if (this.exponent >= 0 && this.exponent <= 9) {
      const num = this.toNumber();
      if (Number.isSafeInteger(num)) return num.toString();
    }
    return `${this.mantissa}e${this.exponent}`;
  }

  toNumber(): number {
    if (this.mantissa === 0) return 0;
    if (this.exponent > 308) return this.mantissa > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    if (this.exponent < -308) return 0;
    return this.mantissa * Math.pow(10, this.exponent);
  }

  add(other: BigValue | number | string): BigValue {
    const o = BigValue.from(other);
    if (this.mantissa === 0) return o;
    if (o.mantissa === 0) return this;

    const maxE = Math.max(this.exponent, o.exponent);
    const diff = maxE - Math.min(this.exponent, o.exponent);
    if (diff > 16) {
      return this.exponent > o.exponent ? this : o;
    }

    const m1 = this.mantissa * Math.pow(10, this.exponent - maxE);
    const m2 = o.mantissa * Math.pow(10, o.exponent - maxE);
    return new BigValue(m1 + m2, maxE);
  }

  sub(other: BigValue | number | string): BigValue {
    const o = BigValue.from(other);
    if (o.mantissa === 0) return this;
    return this.add(new BigValue(-o.mantissa, o.exponent));
  }

  mul(other: BigValue | number | string): BigValue {
    const o = BigValue.from(other);
    if (this.mantissa === 0 || o.mantissa === 0) return BigValue.ZERO;
    return new BigValue(this.mantissa * o.mantissa, this.exponent + o.exponent);
  }

  div(other: BigValue | number | string): BigValue {
    const o = BigValue.from(other);
    if (o.mantissa === 0) return BigValue.ZERO;
    if (this.mantissa === 0) return BigValue.ZERO;
    return new BigValue(this.mantissa / o.mantissa, this.exponent - o.exponent);
  }

  cmp(other: BigValue | number | string): number {
    const o = BigValue.from(other);
    if (this.mantissa === 0 && o.mantissa === 0) return 0;
    if (this.mantissa > 0 && o.mantissa <= 0) return 1;
    if (this.mantissa <= 0 && o.mantissa > 0) return -1;
    if (this.mantissa < 0 && o.mantissa < 0) {
      return -new BigValue(-this.mantissa, this.exponent).cmp(new BigValue(-o.mantissa, o.exponent));
    }

    if (this.exponent !== o.exponent) {
      return this.exponent > o.exponent ? 1 : -1;
    }
    const diff = this.mantissa - o.mantissa;
    if (Math.abs(diff) < 1e-11) return 0;
    return diff > 0 ? 1 : -1;
  }

  eq(other: BigValue | number | string): boolean { return this.cmp(other) === 0; }
  gt(other: BigValue | number | string): boolean { return this.cmp(other) > 0; }
  gte(other: BigValue | number | string): boolean { return this.cmp(other) >= 0; }
  lt(other: BigValue | number | string): boolean { return this.cmp(other) < 0; }
  lte(other: BigValue | number | string): boolean { return this.cmp(other) <= 0; }

  clampMin(min: BigValue | number | string): BigValue {
    const m = BigValue.from(min);
    return this.cmp(m) < 0 ? m : this;
  }

  clampMax(max: BigValue | number | string): BigValue {
    const m = BigValue.from(max);
    return this.cmp(m) > 0 ? m : this;
  }

  formatExact(): string {
    if (this.mantissa === 0) return '0';
    if (this.exponent >= 0 && this.exponent <= 15) {
      const num = Math.round(this.toNumber());
      return spanishFormatter.format(num);
    }
    return `${this.mantissa.toFixed(3).replace('.', ',')}×10${toSuperscript(this.exponent)}`;
  }

  formatShort(ledgerMode = false): string {
    if (this.mantissa === 0) return '0';
    const num = this.toNumber();

    let short = '';
    if (this.exponent < 4) {
      // < 10.000: entero con puntos en español
      short = spanishFormatter.format(Math.round(num));
    } else if (this.exponent < 6) {
      // 10.000 - 999.999 en k
      const k = num / 1_000;
      const dec = (k % 1 === 0 || k >= 100) ? Math.round(k).toString() : k.toFixed(1).replace('.', ',');
      short = `${dec} k`;
    } else if (this.exponent < 9) {
      // 1e6 - 1e9 en M
      const m = num / 1_000_000;
      const dec = m < 10 ? m.toFixed(2).replace('.', ',') : m.toFixed(1).replace('.', ',');
      short = `${dec} M`;
    } else if (this.exponent < 12) {
      // 1e9 - 1e12 en MM (miles de millones)
      const mm = num / 1_000_000_000;
      const dec = mm < 10 ? mm.toFixed(2).replace('.', ',') : mm.toFixed(1).replace('.', ',');
      short = `${dec} MM`;
    } else {
      // >= 1e12 en notación científica 1,23×10¹²
      const dec = this.mantissa.toFixed(2).replace('.', ',');
      short = `${dec}×10${toSuperscript(this.exponent)}`;
    }

    if (ledgerMode) {
      const exact = this.formatExact();
      if (exact !== short) {
        return `${short} (${exact})`;
      }
    }
    return short;
  }
}
