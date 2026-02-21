const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

export function toChosung(input: string): string {
  return Array.from(input)
    .map((char) => {
      const code = char.codePointAt(0);
      if (!code) return '';

      if (code >= 0xac00 && code <= 0xd7a3) {
        const index = code - 0xac00;
        const choIndex = Math.floor(index / 588);
        return CHO[choIndex] ?? '';
      }

      if (/[a-z0-9]/i.test(char)) return char.toLowerCase();
      return '';
    })
    .join('');
}

export function normalizeText(input: string): string {
  return input.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

export function isChosungQuery(q: string): boolean {
  const compact = q.replace(/\s+/g, '');
  if (!compact) return false;
  return /^[ㄱ-ㅎ]+$/.test(compact);
}
