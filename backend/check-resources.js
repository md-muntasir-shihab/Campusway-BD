const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/campusway').then(async () => {
  const total = await mongoose.connection.db.collection('resources').countDocuments();
  const pub = await mongoose.connection.db.collection('resources').countDocuments({isPublic: true});
  const pubAlt = await mongoose.connection.db.collection('resources').countDocuments({isPublished: true});
  const sample = await mongoose.connection.db.collection('resources').find({}).limit(2).toArray();
  console.log('resources total:', total, 'isPublic:', pub, 'isPublished:', pubAlt);
  if (sample.length > 0) {
    console.log('sample keys:', Object.keys(sample[0]));
    console.log('sample[0] isPublic:', sample[0].isPublic, 'isPublished:', sample[0].isPublished);
  }
  await mongoose.disconnect();
}).catch(e => console.error(e));
