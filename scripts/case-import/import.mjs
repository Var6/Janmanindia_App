/* eslint-disable no-console */
import mongoose from 'mongoose';
import { writeFileSync } from 'node:fs';
import { LITIGATIONS, HEARINGS, ACTIVITIES, USERS } from './data.mjs';

const DRY_RUN = !process.argv.includes('--commit');

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;
const Cases = db.collection('cases');
const Users = db.collection('users');
const Activities = db.collection('activities');

const oid = (s) => new mongoose.Types.ObjectId(s);

// Resolve role keys → ObjectIds
const resolve = (key) => USERS[key] ? oid(USERS[key]) : oid(USERS.sachina);

// Next JMI- internal tracker
const existing = await Cases.find({ caseNumber: /^JMI-IMP-/ }).project({ caseNumber: 1 }).toArray();
let nextSeq = existing
  .map(c => parseInt(c.caseNumber.replace(/^JMI-IMP-/, ''), 10))
  .filter(n => !isNaN(n))
  .reduce((m, n) => Math.max(m, n), 0);
const newInternal = () => `JMI-IMP-${String(++nextSeq).padStart(3, '0')}`;

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

// ---- LITIGATIONS ----
const stubCommunityOps = [];
const caseOps = [];
const hearingsByCase = new Map();
for (const h of HEARINGS) {
  if (!hearingsByCase.has(h.courtCaseNumber)) hearingsByCase.set(h.courtCaseNumber, []);
  hearingsByCase.get(h.courtCaseNumber).push(h);
}

for (const lit of LITIGATIONS) {
  // dedupe — skip if a case with this courtCaseNumber already exists
  const dupe = await Cases.findOne({ courtCaseNumber: lit.courtCaseNumber });
  if (dupe) { console.log(`SKIP (dupe): ${lit.courtCaseNumber}`); continue; }

  const internal = newInternal();
  const communityId = oid();
  const communityName = lit.petitioners[0] || 'Imported Petitioner';
  stubCommunityOps.push({
    _id: communityId,
    name: communityName,
    email: `imported-${slug(internal)}-${Date.now()}@stub.janmanindia.org`,
    role: 'community',
    communityProfile: { verificationStatus: 'pending', plvStatus: 'none' },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const litMembers = (lit.litigationMembers || ['sachina']).map(resolve);
  const lead = litMembers[0];

  const appearances = (hearingsByCase.get(lit.courtCaseNumber) || []).map(h => ({
    date: new Date(h.date),
    dailyOrderBrief: h.dailyOrderBrief,
    loggedBy: resolve(h.loggedBy),
    loggedAt: new Date(),
  }));
  // future-most hearing → nextHearingDate
  const today = new Date(); today.setHours(0,0,0,0);
  const futureHearings = appearances.map(a => a.date).filter(d => d >= today).sort((a,b) => a - b);
  const nextHearingDate = futureHearings[0] || undefined;

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
    documents: [],
    caseDiary: [],
    courtAppearances: appearances,
    auditLog: [{ at: new Date(), by: lead, action: 'imported', note: 'Bulk import from compiled district reports PDF' }],
    isExistingCase: lit.isExistingCase ?? false,
    currentStep: appearances.length ? `Last hearing: ${appearances[appearances.length-1].date.toISOString().slice(0,10)}` : undefined,
    existingNotes: lit.description,
    nextHearingDate,
    highCourtPath: lit.path === 'highcourt' ? {
      petitionFiled: { done: true, on: new Date() },
      counterAffidavitDocs: [],
      rejoinderDocs: [],
      listOfDates: [],
      orderDocs: [],
    } : undefined,
    criminalPath: lit.path === 'criminal' ? {
      firFiled: !!lit.courtCaseNumber.match(/FIR|P\.S\./i),
      chargesheetFiled: false,
      chargesheetAlertSent: false,
      chargeDocs: [],
      chargesFramed: false,
      trial: { prosecutionWitnesses: [], defenseWitnesses: [], evidenceDocs: [], forensicDocs: [] },
    } : undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// ---- ACTIVITIES ----
const activityOps = [];
for (const a of ACTIVITIES) {
  const assignee = resolve(a.assignee);
  // dedupe by title+dueDate+assignee
  const dupe = await Activities.findOne({ title: a.title, dueDate: new Date(a.dueDate), assignee });
  if (dupe) { console.log(`SKIP activity (dupe): ${a.title}`); continue; }
  activityOps.push({
    title: a.title,
    description: a.description,
    category: a.category,
    priority: 'medium',
    status: a.status || 'done',
    assignee,
    coAssignees: (a.coAssignees || []).map(resolve),
    dueDate: new Date(a.dueDate),
    endsAt: a.endsAt ? new Date(a.endsAt) : undefined,
    todos: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: resolve('shashwat'),
  });
}

// ---- SUMMARY ----
const summary = {
  mode: DRY_RUN ? 'DRY RUN — nothing written' : 'COMMIT',
  litigations_to_insert: caseOps.length,
  stub_community_users: stubCommunityOps.length,
  hearings_total: caseOps.reduce((n, c) => n + (c.courtAppearances?.length || 0), 0),
  activities_to_insert: activityOps.length,
  next_internal_tracker: `JMI-IMP-${String(nextSeq).padStart(3, '0')}`,
  by_district: caseOps.reduce((acc, c) => { acc[c.district] = (acc[c.district] || 0) + 1; return acc; }, {}),
  by_lead_lawyer: caseOps.reduce((acc, c) => {
    const key = Object.entries(USERS).find(([_, id]) => String(c.litigationMember) === id)?.[0] || 'unknown';
    acc[key] = (acc[key] || 0) + 1; return acc;
  }, {}),
};
console.log('\n========== SUMMARY ==========');
console.log(JSON.stringify(summary, null, 2));

writeFileSync('/tmp/import-preview.json', JSON.stringify({
  summary,
  sample_litigations: caseOps.slice(0, 3),
  sample_activities: activityOps.slice(0, 3),
  all_titles: caseOps.map(c => `${c.caseNumber}  ${c.courtCaseNumber}  —  ${c.causeTitle}`),
  activity_titles: activityOps.map(a => `${a.dueDate.toISOString().slice(0,10)}  ${a.title}`),
}, null, 2));
console.log('\nPreview written to /tmp/import-preview.json');

if (!DRY_RUN) {
  console.log('\nCOMMITTING…');
  if (stubCommunityOps.length) await Users.insertMany(stubCommunityOps);
  if (caseOps.length)          await Cases.insertMany(caseOps);
  if (activityOps.length)      await Activities.insertMany(activityOps);
  console.log('Done.');
}

await mongoose.disconnect();
