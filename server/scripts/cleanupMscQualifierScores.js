require('dotenv').config();

const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');
const User = require('../models/User');

const TOURNAMENT_ID = '69f2c6ac3b94b363cf5e82b6';

async function main() {
  const apply = process.argv.includes('--apply');
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI 未配置');

  await mongoose.connect(process.env.MONGO_URI);

  const tournament = await Tournament.findById(TOURNAMENT_ID)
    .select('title registrations.userId qualifierScores')
    .lean();
  if (!tournament) throw new Error(`赛事不存在: ${TOURNAMENT_ID}`);

  const registeredIds = new Set(
    (tournament.registrations || []).map(reg => String(reg.userId))
  );
  const invalidScores = (tournament.qualifierScores || []).filter(
    score => !registeredIds.has(String(score.userId))
  );

  const invalidUserIds = [...new Set(invalidScores.map(score => String(score.userId)))];
  const users = await User.find({ _id: { $in: invalidUserIds } })
    .select('username uid')
    .lean();
  const userMap = new Map(users.map(user => [String(user._id), user]));

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    collection: Tournament.collection.name,
    tournamentId: String(tournament._id),
    tournamentTitle: tournament.title,
    registrations: registeredIds.size,
    qualifierScoresBefore: (tournament.qualifierScores || []).length,
    scoresToRemove: invalidScores.length,
    affectedUsers: invalidUserIds.length,
    entries: invalidScores.map(score => {
      const user = userMap.get(String(score.userId));
      return {
        scoreId: String(score._id),
        userId: String(score.userId),
        username: user?.username || null,
        uid: user?.uid ?? null,
        songName: score.songName,
        achievement: score.achievement,
        dxScore: score.dxScore
      };
    })
  };

  if (apply && invalidScores.length > 0) {
    const scoreIds = invalidScores.map(score => score._id);
    const result = await Tournament.updateOne(
      { _id: tournament._id },
      { $pull: { qualifierScores: { _id: { $in: scoreIds } } } }
    );
    const updated = await Tournament.findById(tournament._id)
      .select('qualifierScores')
      .lean();
    summary.modifiedCount = result.modifiedCount;
    summary.qualifierScoresAfter = updated?.qualifierScores?.length ?? null;
  }

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
