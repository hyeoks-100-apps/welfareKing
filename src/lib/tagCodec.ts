export function encodeTag(tag: string): string {
  return encodeURIComponent(tag.trim());
}

export function decodeTag(param: string): string {
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
}
