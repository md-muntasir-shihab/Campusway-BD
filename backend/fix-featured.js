const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/campusway').then(async () => {
  const unis = await mongoose.connection.db.collection('universities')
    .find({isActive: true}, {projection: {_id:1, slug:1, name:1}})
    .limit(8).toArray();
  const featuredEntries = unis.map((u, i) => ({ universityId: u._id.toString(), order: i, enabled: true }));
  const hsCol = mongoose.connection.db.collection('homesettings');
  const result = await hsCol.updateOne({}, { 
    $set: { 
      'featuredUniversities': featuredEntries, 
      'universityPreview.featuredMode': 'manual', 
      'universityPreview.maxFeaturedItems': 8 
    } 
  });
  console.log('Updated:', result.modifiedCount, 'entries:', featuredEntries.length);
  console.log('Featured:', unis.map(u => u.name));
  await mongoose.disconnect();
}).catch(e => console.error(e));
