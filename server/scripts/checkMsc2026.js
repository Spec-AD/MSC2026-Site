/**
 * 检查 MSC 2026 Tournament 文档状态（无 populate，避免 model 注册依赖）
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const t = await Tournament.findOne({ title: 'MSC 2026' }).lean();
  
  if (!t) { console.log('❌ 未找到 MSC 2026 赛事'); process.exit(0); }

  console.log('ID:', t._id.toString());
  console.log('Status:', t.status);
  console.log('CreatedBy:', t.createdBy?.toString());
  console.log('Managers:', (t.managers || []).map(m => m.toString()));
  console.log('Registration:', t.registrationStart, '→', t.registrationEnd);
  console.log('Timeline:', t.startTime, '→', t.endTime);
  console.log('TimeApproved:', t.timeApproved);
  console.log('AdvanceCount:', t.advanceCount);
  console.log('Seeding:', t.seeding);
  console.log('Tags:', t.tags);
  console.log('RegForm Fields:', t.registrationForm?.length || 0);
  if (t.registrationForm) {
    t.registrationForm.forEach(f => console.log('  -', f.label, `(${f.type})`, f.required ? '[必填]' : ''));
  }
  console.log('Registrations:', t.registrations?.length || 0);
  console.log('');
  (t.registrations || []).forEach((r, i) => {
    console.log(`[${i+1}] userId: ${r.userId?.toString() || '?'} — form:`, JSON.stringify(r.formData));
  });

  await mongoose.disconnect();
}
check().catch(e => { console.error(e); process.exit(1); });
