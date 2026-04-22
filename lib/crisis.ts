const DISTRESS_KEYWORDS = [
  "suicide", "kill myself", "hurt myself", "end my life", "khatam", "marna",
  "bachao", "maar", "peet", "rape", "torture", "abuse", "danger",
  "आत्महत्या", "खत्म", "बचाओ", "बलात्कार", "मार", "डर", "जान",
];

export function detectsDistress(text: string | null | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return DISTRESS_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}
