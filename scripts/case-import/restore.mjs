/* eslint-disable no-console */
// Restore the 23 imported cases that were wrongly deleted, and trim the
// DEV-* seed cases down to one sample.
//
// Differences from import.mjs:
//   - reuses the existing "Dev Community" user for `community` instead of
//     creating per-case stub users (which broke the case detail page)
//   - skips inserts when courtCaseNumber already exists
import mongoose from 'mongoose';
import { LITIGATIONS, HEARINGS, USERS } from './data.mjs';

const COMMIT = process.argv.includes('--commit');
await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;
const Cases = db.collection('cases');

const oid = (s) => new mongoose.Types.ObjectId(s);
const DEV_COMMUNITY = oid('69f4f2271ad4d6230c358c63');
const resolve = (key) => USERS[key] ? oid(USERS[key]) : oid(USERS.sachina);

const existing = await Cases.find({ caseNumber: /^JMI-IMP-/ }).project({ caseNumber: 1 }).toArray();
let nextSeq = existing
  .map(c => parseInt(c.caseNumber.replace(/^JMI-IMP-/, ''), 10))
  .filter(n => !isNaN(n))
  .reduce((m, n) => Math.max(m, n), 0);
const newInternal = () => `JMI-IMP-${String(++nextSeq).padStart(3, '0')}`;

const hearingsByCase = new Map();
for (const h of HEARINGS) {
  if (!hearingsByCase.has(h.courtCaseNumber)) hearingsByCase.set(h.courtCaseNumber, []);
  hearingsByCase.get(h.courtCaseNumber).push(h);
}

const toInsert = [];
for (const lit of LITIGATIONS) {
  const dupe = await Cases.findOne({ courtCaseNumber: lit.courtCaseNumber });
  if (dupe) { console.log(`SKIP (exists): ${lit.courtCaseNumber}  →  ${dupe.caseNumber}`); continue; }

  const internal = newInternal();
  const litMembers = (lit.litigationMembers || ['sachina']).map(resolve);
  const lead = litMembers[0];

  const appearances = (hearingsByCase.get(lit.courtCaseNumber) || []).map(h => ({
    date: new Date(h.date),
    dailyOrderBrief: h.dailyOrderBrief,
    loggedBy: resolve(h.loggedBy),
    loggedAt: new Date(),
  }));
  const today = new Date(); today.setHours(0,0,0,0);
  const futureHearings = appearances.map(a => a.date).filter(d => d >= today).sort((a,b) => a - b);
  const nextHearingDate = futureHearings[0] || undefined;

  toInsert.push({
    caseTitle: lit.causeTitle,
    caseNumber: internal,
    status: lit.status || 'Open',
    path: lit.path,
    caseType: lit.caseType,
    district: lit.district,
    causeTitle: lit.causeTitle,
    courtCaseNumber: lit.courtCaseNumber,
    courtName: lit.courtName,
    relevantSections: lit.relevantSections,
    courtType: lit.courtType,
    state: lit.state || 'Bihar',
    parties: { petitioners: lit.petitioners, respondents: lit.respondents },
    community: DEV_COMMUNITY,
    litigationMember: lead,
    litigationMembers: litMembers,
    documents: [],
    caseDiary: [],
    courtAppearances: appearances,
    auditLog: [{ at: new Date(), by: lead, action: 'imported', note: 'Bulk import from compiled district reports PDF (restored)' }],
    isExistingCase: lit.isExistingCase ?? false,
    currentStep: appearances.length ? `Last hearing: ${appearances[appearances.length-1].date.toISOString().slice(0,10)}` : undefined,
    existingNotes: lit.description,
    nextHearingDate,
    highCourtPath: lit.path === 'highcourt' ? {
      petitionFiled: { done: true, on: new Date() },
      counterAffidavitDocs: [], rejoinderDocs: [], listOfDates: [], orderDocs: [],
    } : undefined,
    criminalPath: lit.path === 'criminal' ? {
      firFiled: !!lit.courtCaseNumber.match(/FIR|P\.S\./i),
      chargesheetFiled: false, chargesheetAlertSent: false, chargeDocs: [], chargesFramed: false,
      trial: { prosecutionWitnesses: [], defenseWitnesses: [], evidenceDocs: [], forensicDocs: [] },
    } : undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// DEV-* trim: keep one sample, drop the rest
const KEEP_DEV = 'DEV-CRM-001';
const devToDelete = await Cases.find({ caseNumber: { $regex: /^DEV-/, $ne: KEEP_DEV } }).project({ caseNumber:1 }).toArray();

console.log({
  mode: COMMIT ? 'COMMIT' : 'DRY RUN',
  imported_to_restore: toInsert.length,
  dev_to_delete: devToDelete.length,
  dev_kept: KEEP_DEV,
});

if (COMMIT) {
  if (toInsert.length) await Cases.insertMany(toInsert);
  if (devToDelete.length) await Cases.deleteMany({ caseNumber: { $in: devToDelete.map(c => c.caseNumber) } });
  console.log('Done.');
}
await mongoose.disconnect();
