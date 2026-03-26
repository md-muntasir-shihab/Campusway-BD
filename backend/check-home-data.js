const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/campusway').then(async () => {
  const news = await mongoose.connection.db.collection('news').countDocuments({status: 'published'});
  const newsV2 = await mongoose.connection.db.collection('news_v2').countDocuments({status: 'published'});
  const resources = await mongoose.connection.db.collection('resources').countDocuments({isPublished: true});
  const banners = await mongoose.connection.db.collection('banners').countDocuments({isActive: true});
  const contentBlocks = await mongoose.connection.db.collection('content_blocks').countDocuments({});
  
  // Check deadline universities
  const unisWithDeadline = await mongoose.connection.db.collection('universities').countDocuments({
    isActive: true,
    applicationEndDate: { $exists: true, $ne: null }
  });
  
  // Check exam universities
  const unisWithExam = await mongoose.connection.db.collection('universities').countDocuments({
    isActive: true,
    $or: [
      { scienceExamDate: { $exists: true, $ne: null } },
      { artsExamDate: { $exists: true, $ne: null } },
      { businessExamDate: { $exists: true, $ne: null } }
    ]
  });
  
  // Check home_settings hero
  const hs = await mongoose.connection.db.collection('home_settings').findOne({});
  console.log('news published:', news);
  console.log('news_v2 published:', newsV2);
  console.log('resources published:', resources);
  console.log('banners active:', banners);
  console.log('content_blocks:', contentBlocks);
  console.log('unis with deadline:', unisWithDeadline);
  console.log('unis with exam dates:', unisWithExam);
  console.log('hero sectionVisibility:', hs?.sectionVisibility?.hero);
  console.log('hero config:', JSON.stringify(hs?.hero));
  
  await mongoose.disconnect();
}).catch(e => console.error(e));
