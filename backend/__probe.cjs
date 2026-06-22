// Temporary diagnostic — lists admin accounts' role + exam-related permissions.
// Read-only. Helps decide whether the Exam Center failure is a permission issue.
const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const Users = mongoose.connection.collection('users');
  const admins = await Users.find({
    role: { $in: ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'] },
  })
    .project({
      email: 1, role: 1, fullName: 1,
      'permissionsV2.exam_center': 1,
      'permissionsV2.question_bank': 1,
      'permissionsV2.exams': 1,
      'permissionsV2.notifications': 1,
    })
    .limit(25)
    .toArray();

  console.log('=== Admin accounts (role + exam permissions) ===');
  for (const a of admins) {
    const p = a.permissionsV2 || {};
    console.log(
      `role=${a.role}  email=${a.email}  ` +
      `exam_center=${p.exam_center ? 'Y' : '-'} ` +
      `question_bank=${p.question_bank ? 'Y' : '-'} ` +
      `exams=${p.exams ? 'Y' : '-'} ` +
      `notifications=${p.notifications ? 'Y' : '-'}`,
    );
  }
  console.log(`\nTotal admin-type accounts: ${admins.length}`);
  await mongoose.disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
