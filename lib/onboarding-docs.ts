/**
 * Helpers for assessing how complete a staff member's onboarding paperwork is.
 * Used by the HR onboarding panel to surface a warning + a checklist of what's
 * still missing for any active staff record.
 */

export interface OnboardingDocsLike {
  panUrl?: string;
  aadharUrl?: string;
  bankAccount?: { holder?: string; accountNumber?: string; ifsc?: string; bankName?: string };
  cvUrl?: string;
  academicDocs?: { label?: string; url?: string }[];
  priorExperience?: string;
  emergencyContact?: { name?: string; phone?: string; relation?: string };
  otherDocs?: { label?: string; url?: string }[];
}

export interface DocCheck {
  key: string;
  label: string;
  present: boolean;
}

/** Order matters — drives the checklist UI. */
export function checkOnboardingDocs(d?: OnboardingDocsLike | null): DocCheck[] {
  const docs = d ?? {};
  return [
    { key: "pan",       label: "PAN card",                present: Boolean(docs.panUrl) },
    { key: "aadhaar",   label: "Aadhaar card",            present: Boolean(docs.aadharUrl) },
    { key: "bank",      label: "Bank account (holder + number + IFSC)",
      present: Boolean(docs.bankAccount?.holder && docs.bankAccount?.accountNumber && docs.bankAccount?.ifsc) },
    { key: "cv",        label: "CV / resume",             present: Boolean(docs.cvUrl) },
    { key: "academic",  label: "Academic documents",      present: (docs.academicDocs?.length ?? 0) > 0 },
    { key: "priorExp",  label: "Prior experience summary", present: Boolean(docs.priorExperience?.trim()) },
    { key: "emergency", label: "Emergency contact",
      present: Boolean(docs.emergencyContact?.name && docs.emergencyContact?.phone) },
  ];
}

export function missingOnboardingDocs(d?: OnboardingDocsLike | null): DocCheck[] {
  return checkOnboardingDocs(d).filter(c => !c.present);
}

export function onboardingCompleteness(d?: OnboardingDocsLike | null): { present: number; total: number; pct: number } {
  const checks = checkOnboardingDocs(d);
  const present = checks.filter(c => c.present).length;
  return { present, total: checks.length, pct: Math.round((present / checks.length) * 100) };
}
