const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/campusway').then(async () => {
  // Check home_settings
  const hsCol = mongoose.connection.db.collection('home_settings');
  const hsCount = await hsCol.countDocuments();
  const hs = await hsCol.findOne({});
  console.log('home_settings count:', hsCount);
  if (hs) {
    console.log('  _id:', hs._id);
    console.log('  featuredUniversities length:', (hs.featuredUniversities || []).length);
    console.log('  universityPreview.featuredMode:', hs.universityPreview?.featuredMode);
  }

  // Check homeconfigs
  const hcCol = mongoose.connection.db.collection('homeconfigs');
  const hcCount = await hcCol.countDocuments();
  const hc = await hcCol.findOne({});
  console.log('homeconfigs count:', hcCount);
  if (hc) {
    console.log('  sections count:', (hc.sections || []).length);
    console.log('  sections:', JSON.stringify((hc.sections || []).slice(0,3)));
  }

  // Get 8 active unis
  const unis = await mongoose.connection.db.collection('universities')
    .find({isActive: true}, {projection: {_id:1, name:1}})
    .limit(8).toArray();
  const featuredEntries = unis.map((u, i) => ({ universityId: u._id.toString(), order: i, enabled: true }));

  if (hs) {
    const result = await hsCol.updateOne({_id: hs._id}, {
      $set: {
        'featuredUniversities': featuredEntries,
        'universityPreview.featuredMode': 'manual',
        'universityPreview.maxFeaturedItems': 8
      }
    });
    console.log('home_settings updated:', result.modifiedCount);
  } else {
    // Insert new doc
    const result = await hsCol.insertOne({
      featuredUniversities: featuredEntries,
      universityPreview: { featuredMode: 'manual', maxFeaturedItems: 8 }
    });
    console.log('home_settings inserted:', result.insertedId);
  }

  console.log('Featured unis configured:', unis.map(u => u.name));
  await mongoose.disconnect();
}).catch(e => console.error(e));
