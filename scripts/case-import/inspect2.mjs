import mongoose from 'mongoose';
await mongoose.connect(process.env.MONGODB_URI);
const U = mongoose.connection.collection('users');
const c = await U.findOne({ role: 'community' }, { projection: { _id:1, name:1, email:1, role:1, phone:1, communityProfile:1 } });
console.log('Sample community user:'); console.log(JSON.stringify(c, null, 2));
const A = mongoose.connection.collection('activities');
const sa = await A.findOne({}, { projection: { _id:1, title:1, category:1, status:1, assignee:1, dueDate:1 } });
console.log('\nSample activity:'); console.log(JSON.stringify(sa, null, 2));
await mongoose.disconnect();
