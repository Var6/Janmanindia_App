import mongoose from 'mongoose';
await mongoose.connect(process.env.MONGODB_URI);
const Cases = mongoose.connection.collection('cases');
const devs = await Cases.find({ caseNumber: /^DEV-/ }).project({ caseNumber:1, causeTitle:1, caseTitle:1, district:1 }).toArray();
console.log(`DEV-* cases: ${devs.length}`);
devs.forEach(c => console.log(' ', c.caseNumber, '|', c.causeTitle || c.caseTitle));
await mongoose.disconnect();
