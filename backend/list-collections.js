const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/campusway').then(async () => {
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name).sort().join('\n'));
  await mongoose.disconnect();
}).catch(e => console.error(e));
