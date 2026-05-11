import mongoose from 'mongoose';
await mongoose.connect(process.env.MONGODB_URI);
const U = mongoose.connection.collection('users');
const devs = await U.find({ role: 'community' }, { projection: { _id:1, name:1, email:1, phone:1, createdAt:1 } }).toArray();
console.log('All community users:');
devs.forEach(u => console.log(' ', u._id, '|', u.name, '|', u.email));
await mongoose.disconnect();
