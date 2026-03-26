const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/campusway').then(async () => {
  const hcCol = mongoose.connection.db.collection('homeconfigs');
  const hc = await hcCol.findOne({});
  console.log('All sections:', JSON.stringify(hc.sections, null, 2));
  
  // Check home_settings
  const hsCol = mongoose.connection.db.collection('home_settings');
  const hs = await hsCol.findOne({});
  console.log('\nhome_settings featuredUniversities:', JSON.stringify(hs?.featuredUniversities?.slice(0,3)));
  console.log('universityPreview:', JSON.stringify(hs?.universityPreview));
  console.log('sectionVisibility:', JSON.stringify(hs?.sectionVisibility));
  
  await mongoose.disconnect();
}).catch(e => console.error(e));
