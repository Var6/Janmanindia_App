import mongoose from 'mongoose';
await mongoose.connect(process.env.MONGODB_URI);
const Cases = mongoose.connection.collection('cases');
const Activities = mongoose.connection.collection('activities');
const Users = mongoose.connection.collection('users');
const cases = await Cases.countDocuments({ caseNumber: /^JMI-IMP-/ });
const stubs = await Users.countDocuments({ email: /@stub\.janmanindia\.org$/ });
const acts  = await Activities.countDocuments({ title: { $in: [
  'PLV Training — Purnea','Nyaya Siksha Workshop','Madhubani Mob Lynching Fact Finding'
] } });
const totalCases = await Cases.countDocuments({});
const totalActs  = await Activities.countDocuments({});
const withHearings = await Cases.countDocuments({ caseNumber: /^JMI-IMP-/, 'courtAppearances.0': { $exists: true } });
const withFutureHearing = await Cases.countDocuments({ caseNumber: /^JMI-IMP-/, nextHearingDate: { $gte: new Date() } });
console.log({ imported_cases: cases, stub_community_users: stubs, sampled_acts_found: acts, total_cases: totalCases, total_activities: totalActs, imported_cases_with_hearings: withHearings, imported_cases_with_future_hearing: withFutureHearing });
await mongoose.disconnect();
