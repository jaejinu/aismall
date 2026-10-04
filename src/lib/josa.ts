/* 받침 유무로 조사를 고른다. 한글이 아니면 받침 없음으로 본다. */
export function josa(word: string, pair: "을를" | "은는" | "이가") {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasFinal = code >= 0 && code <= 11171 && code % 28 > 0;
  return word + (hasFinal ? pair[0] : pair[1]);
}
