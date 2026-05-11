/* eslint-disable no-console */
// Create one community user per imported case (named after the primary
// petitioner) and re-point each JMI-IMP-* case's `community` ref at it.
import mongoose from 'mongoose';
import { LITIGATIONS } from './data.mjs';

const COMMIT = process.argv.includes('--commit');
await mongoose.connect(process.env.MONGODB_URI);
const Cases = mongoose.connection.collection('cases');
const Users = mongoose.connection.collection('users');

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);

const ops = [];
for (const lit of LITIGATIONS) {
  const ccase = await Cases.findOne({ courtCaseNumber: lit.courtCaseNumber }, { projection: { _id:1, caseNumber:1 } });
  if (!ccase) { console.log(`SKIP (case not in DB): ${lit.courtCaseNumber}`); continue; }

  const petitionerName = lit.petitioners[0] || 'Imported Petitioner';
  const email = `petitioner-${slug(ccase.caseNumber)}@imported.janmanindia.org`;

  let user = await Users.findOne({ email });
  if (!user) {
    const r = await Users.insertOne({
      name: petitionerName,
      email,
      role: 'community',
      phone: '',
      communityProfile: {
        verificationStatus: 'pending',
        plvStatus: 'none',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    user = { _id: r.insertedId, name: petitionerName, email };
    console.log(`CREATE user: ${petitionerName} (${user._id})`);
  }

  ops.push({ caseId: ccase._id, caseNumber: ccase.caseNumber, communityId: user._id, petitionerName });
}

console.log(`\n${COMMIT ? 'COMMIT' : 'DRY RUN'} — ${ops.length} cases to re-point`);
if (COMMIT) {
  for (const op of ops) {
    await Cases.updateOne({ _id: op.caseId }, { $set: { community: op.communityId } });
  }
  console.log('Done.');
}
await mongoose.disconnect();
