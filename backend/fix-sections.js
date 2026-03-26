const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/campusway').then(async () => {
  const hcCol = mongoose.connection.db.collection('homeconfigs');
  
  const newSections = [
    { id: 'search', title: 'Search Bar', isActive: true, order: 0 },
    { id: 'hero', title: 'Hero Banner', isActive: true, order: 1 },
    { id: 'campaign_banners', title: 'Campaign Banners', isActive: true, order: 2 },
    { id: 'featured', title: 'Featured Universities', isActive: true, order: 3 },
    { id: 'category_filter', title: 'Category & Cluster Filter', isActive: true, order: 4 },
    { id: 'deadlines', title: 'Admission Deadlines', isActive: true, order: 5 },
    { id: 'upcoming_exams', title: 'Upcoming Exams', isActive: true, order: 6 },
    { id: 'online_exam_preview', title: 'Online Exam Preview', isActive: true, order: 7 },
    { id: 'news', title: 'Latest News', isActive: true, order: 8 },
    { id: 'resources', title: 'Resources Preview', isActive: true, order: 9 },
    { id: 'content_blocks', title: 'Global CTA / Content Block', isActive: true, order: 10 },
    { id: 'stats', title: 'Quick Stats', isActive: true, order: 11 },
  ];

  const result = await hcCol.updateOne({}, { $set: { sections: newSections } });
  console.log('homeconfigs updated:', result.modifiedCount);
  
  await mongoose.disconnect();
}).catch(e => console.error(e));
