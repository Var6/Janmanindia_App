/* eslint-disable no-console */
// Second-pass import: inserts the EXTRA_LITIGATIONS (Kishanganj + Patna
// Cr.Misc 33897/2024) and EXTRA_ACTIVITIES (advisory consults).
//
// Each litigation gets its own community user named after the primary
// petitioner — so the case list shows real names, not "Dev Community".
// Idempotent: skips if courtCaseNumber already exists or activity with
// same title+assignee already exists.
import mongoose from 'mongoose';
import { USERS } from './data.mjs';
import { EXTRA_LITIGATIONS, EXTRA_ACTIVITIES } from './data-extra.mjs';

const COMMIT = process.argv.includes('--commit');
await mongoose.connect(process.env.MONGODB_URI);
const Cases = mongoose.connection.collection('cases');
const Users = mongoose.connection.collection('users');
const Activities = mongoose.connection.collection('activities');

const oid = (s) => new mongoose.Types.ObjectId(s);
const resolve = (key) => USERS[key] ? oid(USERS[key]) : oid(USERS.sachina);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);

const existing = await Cases.find({ caseNumber: /^JMI-IMP-/ }).project({ caseNumber: 1 }).toArray();
let nextSeq = existing
  .map(c => parseInt(c.caseNumber.replace(/^JMI-IMP-/, ''), 10))
  .filter(n => !isNaN(n))
  .reduce((m, n) => Math.max(m, n), 0);
const newInternal = () => `JMI-IMP-${String(++nextSeq).padStart(3, '0')}`;

const userOps = [];
const caseOps = [];

for (const lit of EXTRA_LITIGATIONS) {
  const dupe = await Cases.findOne({ courtCaseNumber: lit.courtCaseNumber });
  if (dupe) { console.log(`SKIP (exists): ${lit.courtCaseNumber}`); continue; }

  const internal = newInternal();
  const communityId = oid();
  const petitionerName = lit.petitioners[0] || 'Imported Petitioner';
  userOps.push({
    _id: communityId,
    name: petitionerName,
    email: `petitioner-${slug(internal)}@imported.janmanindia.org`,
    role: 'community',
    phone: '',
    communityProfile: { verificationStatus: 'pending', plvStatus: 'none' },
    createdAt: new Date(), updatedAt: new Date(),
  });

  const litMembers = (lit.litigationMembers || ['sachina']).map(resolve);
  const lead = litMembers[0];

  caseOps.push({
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
    community: communityId,
    litigationMember: lead,
    litigationMembers: litMembers,
    documents: [], caseDiary: [], courtAppearances: [],
    auditLog: [{ at: new Date(), by: lead, action: 'imported', note: 'Bulk import (second pass) from compiled district reports PDF' }],
    isExistingCase: true,
    existingNotes: lit.description,
    highCourtPath: lit.path === 'highcourt' ? {
      petitionFiled: { done: true, on: new Date() },
      counterAffidavitDocs: [], rejoinderDocs: [], listOfDates: [], orderDocs: [],
    } : undefined,
    criminalPath: lit.path === 'criminal' ? {
      firFiled: !!lit.courtCaseNumber.match(/FIR|P\.?S\.?/i),
      chargesheetFiled: false, chargesheetAlertSent: false, chargeDocs: [], chargesFramed: false,
      trial: { prosecutionWitnesses: [], defenseWitnesses: [], evidenceDocs: [], forensicDocs: [] },
    } : undefined,
    createdAt: new Date(), updatedAt: new Date(),
  });
}

const activityOps = [];
const defaultDate = new Date('2025-12-01');
for (const a of EXTRA_ACTIVITIES) {
  const assignee = resolve(a.assignee || 'sachina');
  const dupe = await Activities.findOne({ title: a.title, assignee });
  if (dupe) { console.log(`SKIP activity (exists): ${a.title}`); continue; }
  activityOps.push({
    title: a.title,
    description: a.description,
    category: a.category || 'other',
    priority: 'medium',
    status: 'done',
    assignee,
    coAssignees: [],
    dueDate: a.dueDate ? new Date(a.dueDate) : defaultDate,
    todos: [],
    createdAt: new Date(), updatedAt: new Date(),
    createdBy: resolve('shashwat'),
  });
}

console.log(`\n${COMMIT ? 'COMMIT' : 'DRY RUN'}`);
console.log({ new_litigations: caseOps.length, new_petitioner_users: userOps.length, new_activities: activityOps.length });

if (COMMIT) {
  if (userOps.length) await Users.insertMany(userOps);
  if (caseOps.length) await Cases.insertMany(caseOps);
  if (activityOps.length) await Activities.insertMany(activityOps);
  console.log('Done.');
}
await mongoose.disconnect();
