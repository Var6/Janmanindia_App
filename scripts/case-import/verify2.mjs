import mongoose from 'mongoose';
await mongoose.connect(process.env.MONGODB_URI);
const Cases = mongoose.connection.collection('cases');
const Users = mongoose.connection.collection('users');
const remaining = await Cases.find({ caseNumber: /^JMI-IMP-/ }).project({ caseNumber:1, causeTitle:1, community:1 }).toArray();
const stubs = await Users.countDocuments({ email: /@stub\.janmanindia\.org$/ });
console.log({ remaining_imported_cases: remaining, stub_users_left: stubs, total_cases: await Cases.countDocuments({}) });
await mongoose.disconnect();
