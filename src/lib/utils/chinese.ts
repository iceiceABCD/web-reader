import * as OpenCC from "opencc-js";

const t2sConverter = OpenCC.Converter({ from: "tw", to: "cn" });
const s2tConverter = OpenCC.Converter({ from: "cn", to: "tw" });

export function traditionalToSimplified(text: string): string {
  try {
    return t2sConverter(text);
  } catch {
    return text;
  }
}

export function simplifiedToTraditional(text: string): string {
  try {
    return s2tConverter(text);
  } catch {
    return text;
  }
}
