import mongoose from 'mongoose';
const uri = process.env.MONGODB_URI;
if (!uri) { console.error('No MONGODB_URI'); process.exit(1); }
await mongoose.connect(uri);
const User = mongoose.connection.collection('users');
const names = ['Sachina','Adity','Shiva','Shashwat','Nawaz','Roshin','Natraj','Suchi','Mugdha'];
for (const n of names) {
  const rows = await User.find({ name: { $regex: n, $options: 'i' } }, { projection: { _id:1, name:1, email:1, role:1, googleEmail:1 } }).toArray();
  console.log(`\n=== ${n} ===`);
  rows.forEach(r => console.log(`  ${r._id}  ${r.name}  [${r.role}]  ${r.email || ''}  gcal:${r.googleEmail || '-'}`));
}
await mongoose.disconnect();
