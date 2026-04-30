/**
 * 验证曲库搜索格式逻辑修复
 */
const maimai = [{ _id: '1', title: 'Test Song', basic_info: { artist: 'Artist1' }, ds: [13.5], level: ['MASTER'] }];
const chuni  = [{ _id: '2', title: 'Chuni Song', basic_info: { artist: 'Artist2' }, ds: [14], level: ['EXPERT'] }];
const arcaea = [{ _id: '3', title: 'Arcaea Song', aliases: [], ds: [11], level: ['FTR'] }];

// 旧版（柯里化）——会抛错
try {
  const oldFormat = (source, game) => arr => arr.map(s => ({ _id: s._id, game, title: s.title }));
  const oldResult = [...oldFormat(maimai, 'maimai')];
  console.log('旧版: ❌ 不应该到达这里');
} catch (e) {
  console.log('旧版: ✅ 预期错误:', e.message);
}

// 新版（直接映射）
const newFormat = (arr, game) => arr.map(s => ({ _id: s._id, game, title: s.title }));
const newResult = [
  ...newFormat(maimai, 'maimai'),
  ...newFormat(chuni, 'chunithm'),
  ...newFormat(arcaea, 'arcaea'),
];
console.log('新版: ✅ 结果数:', newResult.length);
newResult.forEach(r => console.log('  -', r.game, r.title));
