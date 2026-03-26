const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/campusway').then(async () => {
  const hsCol = mongoose.connection.db.collection('homesettings');
  const count = await hsCol.countDocuments();
  const doc = await hsCol.findOne({});
  console.log('Count:', count);
  if (doc) {
    console.log('Doc _id:', doc._id);
    console.log('Current featuredUniversities length:', (doc.featuredUniversities || []).length);
  }
  await mongoose.disconnect();
}).catch(e => console.error(e));
