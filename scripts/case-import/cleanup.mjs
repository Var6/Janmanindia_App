/* eslint-disable no-console */
import mongoose from 'mongoose';
const COMMIT = process.argv.includes('--commit');
await mongoose.connect(process.env.MONGODB_URI);
const Cases = mongoose.connection.collection('cases');
const Users = mongoose.connection.collection('users');

const DEV_COMMUNITY = new mongoose.Types.ObjectId('69f4f2271ad4d6230c358c63');
const KEEP = 'JMI-IMP-001';

const all = await Cases.find({ caseNumber: /^JMI-IMP-/ }).toArray();
const keep = all.find(c => c.caseNumber === KEEP);
const drop = all.filter(c => c.caseNumber !== KEEP);
const stubs = await Users.find({ email: /@stub\.janmanindia\.org$/ }).toArray();

console.log({
  total_imported: all.length,
  keeping: keep && `${keep.caseNumber} ${keep.causeTitle}`,
  deleting_cases: drop.length,
  deleting_stub_users: stubs.length,
  mode: COMMIT ? 'COMMIT' : 'DRY RUN',
});

if (COMMIT) {
  // 1. Reassign the kept case to Dev Community
  await Cases.updateOne({ _id: keep._id }, { $set: { community: DEV_COMMUNITY } });
  // 2. Delete the other imported cases
  await Cases.deleteMany({ caseNumber: { $in: drop.map(c => c.caseNumber) } });
  // 3. Delete all stub community users (including the one for the kept case — it's now orphaned)
  await Users.deleteMany({ email: /@stub\.janmanindia\.org$/ });
  console.log('Done.');
}
await mongoose.disconnect();
