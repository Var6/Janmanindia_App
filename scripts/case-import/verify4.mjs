import mongoose from 'mongoose';
await mongoose.connect(process.env.MONGODB_URI);
const Cases = mongoose.connection.collection('cases');
const cases = await Cases.aggregate([
  { $match: { caseNumber: /^JMI-IMP-/ } },
  { $lookup: { from: 'users', localField: 'community', foreignField: '_id', as: 'c' } },
  { $sort: { caseNumber: 1 } },
  { $project: { caseNumber:1, communityName: { $arrayElemAt: ['$c.name', 0] }, communityEmail: { $arrayElemAt: ['$c.email', 0] } } },
]).toArray();
cases.forEach(c => console.log(' ', c.caseNumber, '→', c.communityName, '|', c.communityEmail));
await mongoose.disconnect();
