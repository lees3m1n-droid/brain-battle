// 사칙연산 수식 파서 (서버·브라우저 공용). 분수 연산이라 부동소수점 오차가 없다.
(function (root) {
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
  function frac(n, d) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; }

  // 문자열을 평가해 { value:{n,d}, nums:[사용한 숫자들] } 반환. 문법 오류면 throw.
  function evaluate(src) {
    const s = String(src).replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/');
    if (!s || s.length > 80) throw new Error('empty');
    const tokens = s.match(/\d+|[+\-*\/()]/g);
    if (!tokens || tokens.join('') !== s) throw new Error('bad char');
    let pos = 0;
    const nums = [];
    function peek() { return tokens[pos]; }
    function factor() {
      const t = tokens[pos++];
      if (t === undefined) throw new Error('eof');
      if (t === '(') {
        const v = expr();
        if (tokens[pos++] !== ')') throw new Error('paren');
        return v;
      }
      if (/^\d+$/.test(t)) { nums.push(Number(t)); return frac(Number(t), 1); }
      throw new Error('unexpected ' + t);
    }
    function term() {
      let v = factor();
      while (peek() === '*' || peek() === '/') {
        const op = tokens[pos++];
        const r = factor();
        if (op === '*') v = frac(v.n * r.n, v.d * r.d);
        else { if (r.n === 0) throw new Error('div0'); v = frac(v.n * r.d, v.d * r.n); }
      }
      return v;
    }
    function expr() {
      let v = term();
      while (peek() === '+' || peek() === '-') {
        const op = tokens[pos++];
        const r = term();
        v = op === '+' ? frac(v.n * r.d + r.n * v.d, v.d * r.d) : frac(v.n * r.d - r.n * v.d, v.d * r.d);
      }
      return v;
    }
    const value = expr();
    if (pos !== tokens.length) throw new Error('trailing');
    return { value, nums };
  }

  // 주어진 숫자들을 정확히 한 번씩 써서 target을 만드는 식인지 검사
  function check(src, numbers, target) {
    try {
      const { value, nums } = evaluate(src);
      const a = nums.slice().sort((x, y) => x - y).join(',');
      const b = numbers.slice().sort((x, y) => x - y).join(',');
      if (a !== b) return { ok: false, reason: 'nums' };
      if (value.d !== 1 || value.n !== target) return { ok: false, reason: 'value', value };
      return { ok: true, value };
    } catch (e) { return { ok: false, reason: 'syntax' }; }
  }

  function toNumber(v) { return v.n / v.d; }

  const api = { evaluate, check, toNumber, frac };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Expr = api;
})(typeof window !== 'undefined' ? window : globalThis);
