# PureBeat API 文档

> 面向后端开发者（琉璃用）  
> 后端运行于 `http://localhost:5000`  
> 文档版本：v1.1 · 2026-04-30

---

## 目录

- [一、认证系统 API](#一认证系统-api)
- [二、用户系统 API](#二用户系统-api)
- [三、消息/站内信 API](#三消息站内信-api)
- [四、好友系统 API](#四好友系统-api)
- [五、曲目系统 API](#五曲目系统-api)
- [六、五维雷达图 API](#六五维雷达图-api)
- [七、成绩同步 API](#七成绩同步-api)
- [八、排行榜 API](#八排行榜-api)
- [九、赛事系统 API](#九赛事系统-api)
- [十、公告系统 API](#十公告系统-api)
- [十一、维基系统 API](#十一维基系统-api)
- [十二、反馈/投诉系统 API](#十二反馈投诉系统-api)
- [十三、Letter Decode 游戏 API](#十三letter-decode-游戏-api)
- [十四、每日推荐 API](#十四每日推荐-api)
- [十五、在线人数 API](#十五在线人数-api)
- [十六、管理后台 API](#十六管理后台-api)
- [十七、杂项 API](#十七杂项-api)
- [附录：数据模型概览](#附录数据模型概览)

---

## 一、认证系统 API

### `POST /api/auth/register`
注册新用户。

**Request Body:**
```json
{ "username": "player123", "password": "securepass" }
```

**Response:**
```json
{ "token": "jwt...", "user": { "id": "...", "username": "player123", "isRegistered": false } }
```

**说明：**
- 自动生成 5 位随机 UID
- 检查注销保护期（180 天）
- 密码经 bcrypt 哈希存储
- JWT Token 有效期 30 天

---

### `POST /api/auth/login`
用户登录。

**Request Body:**
```json
{ "username": "player123", "password": "securepass" }
```

**Response:**
```json
{ "token": "jwt...", "user": { "id": "...", "username": "player123", "isRegistered": false, ... } }
```

---

### `GET /api/auth/me`
获取当前登录用户信息（含好友、档案详情）。需要 JWT Token。

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** 完整 User 文档（不含 password 字段），包含 populated friends 列表。

**附加逻辑：**
- 每日首次调用自动发放 +10 XP 登录奖励

---

### `POST /api/auth/send-otp`
发送邮箱验证码。

**Request Body:**
```json
{ "email": "user@example.com", "type": "BIND" }
```

**type 可选值：** `BIND`（绑定）、`UNBIND`（解绑）

**Response:**
```json
{ "msg": "验证码已发送至您的邮箱" }
```

**说明：**
- 验证码 6 位数字，有效期 10 分钟
- 使用 Nodemailer 通过 SMTP 发送
- BIND 类型会检查邮箱是否已被占用

---

## 二、用户系统 API

### `GET /api/users/:username`
获取用户公开档案。

**Response:** 聚合数据，包含：
- 用户基本信息（不含密码/联系方式）
- `allScores`：全部 Maimai 成绩
- `topScores`：Top 50 成绩（按 rating 排序）
- `topPfScores`：Top 50（按 PF 排序）
- `pfRank`：PF 排名
- `chuniRank`：中二排名
- `qualifierScores`：预选赛成绩
- `osuScores`：osu! 成绩
- `friendsCount` / `friends`：好友数据

---

### `PUT /api/users/profile`
更新用户个人资料（头像/简介/水鱼/落雪用户名等）。需要 JWT。

**Request Body（部分字段可选）:**
```json
{
  "bio": "新的简介",
  "avatarUrl": "...",
  "bannerUrl": "...",
  "divingFishUsername": "...",
  "proberUsername": "...",
  "isB50Visible": true
}
```

---

### `GET /api/users/search?q=xxx`
搜索用户（按用户名或 UID 模糊匹配）。

**Response:** 最多 10 条结果。

---

### `GET /api/users/settings/me`
获取当前用户的隐私设置（location, occupation, website, twitter, birthday, isB50Visible, email 等）。

---

### `PUT /api/users/settings/profile`
更新当前用户的个人资料设置。

**Request Body:**
```json
{ "location": "...", "occupation": "...", "website": "...", "twitter": "...", "birthday": "..." }
```

---

### `POST /api/users/settings/bind-email`
绑定邮箱。需要 JWT。

**Request Body:**
```json
{ "email": "...", "otp": "123456" }
```

---

### `POST /api/users/settings/change-email`
换绑邮箱。需要 JWT。

**Request Body:**
```json
{ "newEmail": "...", "oldOtp": "...", "newOtp": "..." }
```

---

### `POST /api/users/check-in`
每日签到 +20 XP。需要 JWT。

**Response:**
```json
{ "msg": "签到成功！经验值 +20", "xp": 100, "level": 2 }
```

---

## 三、消息/站内信 API

### `GET /api/messages`
获取当前用户收到的消息列表。需要 JWT。

**Response:** 消息数组，populate sender 字段。

---

### `GET /api/messages/unread-count`
获取未读消息数量。

**Response:**
```json
{ "count": 5 }
```

---

### `PUT /api/messages/:id/read`
标记消息为已读。

---

### `PUT /api/messages/:id/star`
标记/取消星标。

**Request Body:**
```json
{ "isStarred": true }
```

---

### `PUT /api/messages/:id/move`
移动消息到分类夹。

**Request Body:**
```json
{ "folderId": "..." }
```

---

### `DELETE /api/messages/:id`
删除单条消息。

---

### `DELETE /api/messages/bulk-delete-read`
批量删除已读消息（星标消息保留）。

---

### `GET /api/messages/folders`
获取当前用户的自定义分类夹列表。

---

### `POST /api/messages/folders`
创建分类夹。

**Request Body:**
```json
{ "name": "比赛相关" }
```

**限制：** 最多 20 个分类夹。

---

### `DELETE /api/messages/folders/:id`
删除分类夹（关联消息自动移回收件箱）。

---

## 四、好友系统 API

### `GET /api/users/:username/friends`
获取用户的好友列表。

**Response:**
```json
{
  "friends": [...],
  "friendRequests": [...]  // 仅本人查看时返回
}
```

---

### `POST /api/users/:username/friend-request`
发送好友申请。需要 JWT。

**说明：**
- 自动检查双方好友数量上限（普通用户 50，T1 赞助 300，T2 赞助 5000）
- 自动在接收方站内信创建 FRIEND_REQUEST 类型消息

---

### `POST /api/users/friend-request/accept`
接受好友申请。

**Request Body:**
```json
{ "senderId": "...", "messageId": "..." }
```

---

### `POST /api/users/friend-request/reject`
拒绝好友申请。

**Request Body:**
```json
{ "senderId": "...", "messageId": "..." }
```

---

## 五、曲目系统 API

### `GET /api/songs`
获取全部 Maimai 曲目（含别名 aliases）。

---

### `GET /api/arcaea-songs`
获取本地 Arcaea 曲库。

---

### `GET /api/chunithm-songs`
获取 CHUNITHM 曲库。

---

### `POST /api/admin/sync-songs`
从水鱼 API 同步 Maimai 曲库。需要 ADM 权限。

---

### `POST /api/admin/sync-arcaea`
从本地 JSON 同步 Arcaea 曲库。需要 ADM 权限。

**说明：**
- 读取 `server/arcaea_song.json` + `server/ARC_CONSTANT.json`
- 应用内建曲包名美化字典

---

### `POST /api/chunithm-songs/sync`
从水鱼 API 同步 CHUNITHM 曲库（公开接口，无需权限）。

---

### `GET /api/songs/:songId/leaderboard?level=&scope=&game=`
获取单曲排行榜。

**参数：**
- `level`：难度索引（0=Basic, 1=Advanced, 2=Expert, 3=Master, 4=Re:Master）
- `scope=friends`：好友排行（需要赞助 Tier 1+）
- `game=chunithm`：切换到 CHUNITHM 排行

**说明：**
- Maimai 按 achievement + dxScore 排序
- CHUNITHM 按 score 排序

---

### `GET /api/users/:username/chunithm-scores`
获取指定用户的 CHUNITHM 成绩列表。

---

## 六、五维雷达图 API

### `GET /api/songs/:songId/radar`
获取单曲的全局雷达数据（贝叶斯融合结果）。

**Response:**
```json
{
  "songId": "12345",
  "radarStats": { "3": { "stamina": 8.5, "tech": 9.0, ... } },
  "finalRadar": {
    "3": { "stamina": 8.7, "tech": 8.8, "voteCount": 42 }
  }
}
```

**算法说明：**
- 5 维度：stamina（耐力）、tech（星星）、stable（稳定）、accuracy（准度）、burst（潜力）
- 使用截尾平均（去除 ±15% 极端值）+ 贝叶斯平滑（C=10）

---

### `PUT /api/songs/:songId/radar/base`
管理员设置雷达锚点值。需要 ADM 权限。

**Request Body:**
```json
{ "diffIndex": 3, "values": { "stamina": 8.5, "star": 9.0, "stable": 7.5, "accuracy": 8.0, "potential": 9.5 } }
```

---

### `POST /api/songs/:songId/radar/vote`
玩家提交主观投票。需要 JWT + 该难度有效成绩。

**Request Body:**
```json
{ "diffIndex": 3, "values": { "stamina": 9.0, "tech": 8.5, ... } }
```

**Response:**
```json
{ "msg": "投票已记录", "weight": 0.7854 }
```

**权重计算：**
```
weight = scoreMultiplier × (0.5 + 0.5 × ratingMultiplier)
scoreMultiplier: SSS+=1.0, SSS=0.85, SS+=0.7, SS=0.5, S+=0.35, S=0.2, 其他=0.1
ratingMultiplier: min(1.0, max(0.1, rating/16000))
```

---

### `GET /api/songs/:songId/radar/my-vote?diffIndex=`
获取当前玩家对某难度的历史投票。

---

## 七、成绩同步 API

### Maimai 导入

#### `POST /api/users/sync-maimai`
通过水鱼 Import-Token 导入 Maimai 成绩。需要 JWT。

**Request Body:**
```json
{ "importToken": "..." }
```

**内部流程：**
1. 请求水鱼 API 获取全部成绩
2. 绑定本地 Song 数据（物量、定数）
3. 计算每个成绩的 PF（用 pfCalculator 引擎）
4. 计算 Rating（旧曲 Top 35 + 新曲 Top 15）
5. 计算 Total PF（Top 50）
6. 更新 User 的 totalPf、rating、importToken

---

#### `POST /api/users/sync-luoxue-oauth`
通过落雪 OAuth 导入 Maimai 成绩。需要 JWT。

**Request Body:**
```json
{ "code": "...", "redirectUri": "..." }
```

**内部流程：**
1. 用 authorization_code 换取 access_token
2. 请求落雪 API 获取全部成绩
3. 绑定本地 Song 数据（SD/DX 类型匹配）
4. 同水鱼流程计算 Rating、PF

---

### CHUNITHM 导入

#### `POST /api/users/sync-chunithm`
通过水鱼 Developer-Token 导入 CHUNITHM 成绩。

**Request Body:**
```json
{ "importToken": "..." }
```

**内部流程：**
1. 拉取 best 和 r20 合并去重
2. 匹配本地 ChunithmSong（通过 cid 或 music_id）
3. 计算每曲 Rating（用 chuniRating 引擎）
4. 取 Top 30 旧曲 + Top 20 新曲计算平均 Rating

---

#### `POST /api/users/sync-chunithm-oauth`
通过落雪 OAuth 导入 CHUNITHM 成绩。

---

### osu! 导入

#### `POST /api/osu/bind`
绑定 osu! 账号（通过 osu! OAuth）。需要 JWT。

**Request Body:**
```json
{ "code": "osu_oauth_code" }
```

**说明：**
- 使用 Client Credentials 流程
- 绑定后 +50 XP

---

#### `POST /api/users/sync-osu`
同步 osu! 成绩。需要已绑定 osu! 账号 + JWT。

**Request Body:**
```json
{ "mode": "standard" }
```

**mode 可选值：** `standard`、`taiko`、`catch`、`mania`

**说明：**
- 通过 osu! API v2 获取 stats 和 BP100
- 四模式各自存储到 `osuDetails[mode]`
- 同步时覆盖旧数据

---

### `GET /api/maimai/player-collections/:username?collectionType=plate&collectionId=xxx`
获取落雪 OAuth 授权用户的特定收藏品进度。

---

### `GET /api/maimai/player-collections-owned/:username?collectionType=plate`
获取用户拥有的所有收藏品 ID 列表（用于前端高亮）。

---

## 八、排行榜 API

### `GET /api/leaderboard/:type?game=osu&mode=standard`
获取排行榜数据。

**type 可选值：**
| type | 排序依据 | 说明 |
|------|---------|------|
| `pf` | totalPf | Maimai 综合实力榜（默认） |
| `level` | xp | 登塔等级榜 |
| `wiki` | wikiApprovedCount | 维基贡献榜 |
| `feedback` | feedbackApprovedCount | 反馈采纳榜 |
| `checkin` | checkInCount | 签到天数榜 |
| `chunithm` | chuniRating | 中二 Rating 榜 |

**特殊：** `game=osu` 时按 osu! PP 排序，支持 `mode` 参数切换四模式。

---

### `GET /api/leaderboard/decode`
Letter Decode OV100 排行榜（按 totalOv 降序）。

---

### `GET /api/leaderboard/qualifiers`
预选赛总达成率排行榜。

---

## 九、赛事系统 API

### 权限模型

| 角色 | 权限 | 备注 |
|------|------|------|
| ADM | 完全控制 | 可结束赛事、审核时间 |
| CHM | 管理本人绑定的赛事 | 可创建、编辑、录分 |
| TO | 赛事运营 | 部分维基管理权限 |
| 普通用户 | 查看、报名 | - |

---

### `POST /api/tournaments/create`
创建赛事。需要 ADM 或 CHM 权限。

**Request Body:**
```json
{
  "title": "MSC 2026",
  "subtitle": "舞萌分区",
  "description": "...",
  "coverUrl": "...",
  "rules": "...",
  "registrationStart": "2026-05-01T00:00:00Z",
  "registrationEnd": "2026-05-15T00:00:00Z",
  "startTime": "2026-06-01T00:00:00Z",
  "endTime": "2026-06-30T00:00:00Z",
  "advanceCount": 8
}
```

**说明：**
- ADM 创建的赛事 `timeApproved=true`（自动审核）
- CHM 创建的赛事需 ADM 审核时间后生效
- CHM 创建者自动绑定 `chmTournamentId`

---

### `GET /api/tournaments/list`
获取公开赛事列表。

---

### `GET /api/tournaments/detail/:id`
获取赛事详情（含报名信息、分组、对局等）。

---

### `PUT /api/tournaments/detail/:id`
更新赛事信息。需要 CHM/ADM 权限。

**Request Body（部分字段可选）:**
```json
{
  "title": "...", "subtitle": "...", "description": "...",
  "coverUrl": "...", "rules": "...", "status": "REGISTRATION",
  "registrationStart": "...", "registrationEnd": "...",
  "startTime": "...", "endTime": "...",
  "advanceCount": 8
}
```

**status 可选值（旧枚举，已废弃）：** `DRAFT`、`REGISTRATION`、`QUALIFIER`、`TOURNAMENT`、`FINISHED`

**新枚举（v2.0 赛事闭环）：** `DRAFT | REGISTRATION | QUALIFYING | ONGOING | FINISHED | ARCHIVED`

**注意：** status 变更建议使用 `POST /api/tournaments/:id/transition`（含自动校验），直接 PUT 变更仅 ADM 可操作。

---

### `PUT /api/tournaments/detail/:id/approve-time`
ADM 审核通过赛事时间。

---

### `PUT /api/tournaments/detail/:id/registration-form`
设计报名表。

**Request Body:**
```json
{ "fields": [ { "name": "qq", "label": "QQ号", "type": "text", "required": true } ] }
```

---

### `POST /api/tournaments/detail/:id/register`
选手报名。

**Request Body:**
```json
{ "formData": { "qq": "123456" } }
```

**说明：**
- 自动检查报名时间窗口
- 自动防重复报名
- 报名成功 +100 XP

---

### `GET /api/tournaments/detail/:id/registrations`
查看报名信息。需要 CHM/ADM 权限。

---

### `PUT /api/tournaments/detail/:id/qualifier-songs`
设置预选赛曲目。需要 CHM(本赛事)/ADM 权限。

**Request Body:**
```json
{
  "songs": [
    {
      "songName": "Test Song",
      "difficulty": "MASTER",
      "level": 3,
      "constant": 13.5,
      "artist": "作曲者名",
      "coverUrl": "https://...",
      "theoreticalDxScore": 3020,
      "note": "备注可选"
    }
  ]
}
```

---

### `POST /api/tournaments/detail/:id/qualifier-scores`
录入选手预选赛成绩。需要 CHM/ADM 权限。

**Request Body:**
```json
{ "targetUid": 10001, "songName": "Test Song", "achievement": 100.5, "dxScore": 5000 }
```

---

### `PUT /api/tournaments/detail/:id/groups`
指定选手分组。需要 CHM/ADM 权限。

**Request Body:**
```json
{ "groups": [ { "name": "A组", "players": ["userId1", "userId2"] } ] }
```

---

### `PUT /api/tournaments/detail/:id/matches`
创建/更新正赛对局。

**Request Body:**
```json
{ "matches": [ { "round": 1, "playerA": "userId1", "playerB": "userId2", "status": "PENDING" } ] }
```

---

### `PUT /api/tournaments/detail/:id/matches/:matchIndex/score`
记录单场比赛成绩。

**Request Body:**
```json
{ "scoreA": 3, "scoreB": 2, "status": "FINISHED", "winnerId": "userId1", "songs": [...] }
```

---

### `PUT /api/tournaments/detail/:id/results`
公布比赛结果。

**Request Body:**
```json
{ "results": [...], "resultAnnouncement": "..." }
```

---

### `PUT /api/tournaments/detail/:id/finish`
结束赛事并自动收回 CHM 权限。仅 ADM。

---

### `DELETE /api/tournaments/detail/:id/register`
选手自行取消报名。仅 REGISTRATION 阶段可操作。

---

### `DELETE /api/tournaments/detail/:id/registrations/:targetUserId`
管理员删除违规报名。需要 CHM(本赛事)/ADM 权限。

---

### `GET /api/tournaments/detail/:id/registrations/export`
导出报名表 CSV（BOM 前缀 + 自定义字段动态列）。

---

### 👇 赛事闭环新端点（v2.0）

> **注意：** 旧路线的 `status` 枚举已更新为：`DRAFT | REGISTRATION | QUALIFYING | ONGOING | FINISHED | ARCHIVED`

---

### `POST /api/tournaments/:id/transition`
推进赛事到下一状态（自动校验）。需要 CHM(本赛事)/ADM 权限。

**Request Body:**
```json
{ "targetStatus": "QUALIFYING" }
```

**校验规则：**
- DRAFT→REGISTRATION：需 timeApproved + 时间线设置
- REGISTRATION→QUALIFYING：需 ≥2 人报名 + 至少 1 首预选曲
- QUALIFYING→ONGOING：需预选成绩已录入
- 其他：遵守状态机白名单

**备注：** 成功后自动推 SSE `tournament:stateChange` + 站内信通知

---

### `POST /api/tournaments/:id/rollback`
撤回赛事状态（有限制）。仅 ADM。

| 回退路线 | 级联清空 |
|---------|---------|
| FINISHED→ONGOING | results, resultAnnouncement（matches 保留 score 重置 status） |
| ONGOING→QUALIFYING | matches, bracketGenerated |
| QUALIFYING→REGISTRATION | qualifierScores, qualifierSongs, groups |
| REGISTRATION→DRAFT | registrations |

---

### `POST /api/tournaments/:id/archive`
归档赛事（不可逆）。仅 ADM。

**效果：**
- 状态变为 ARCHIVED
- 收回该赛事所有 CHM 的权限
- 所有写端点返回 403

---

### `GET /api/tournaments/:id/qualifier/rankings`
获取预选赛排名。公开。

**Query:** `?cutoff=N`（标注前 N 名晋级线）

**Response:**
```json
{
  "rankings": [
    { "rank": 1, "userId": "...", "username": "Player1", "total": 102.3, "scoreCount": 3 }
  ],
  "cutoff": 8,
  "cutLineRank": 8,
  "advanceCount": 8
}
```

**算法：** 每曲独立定数权重 + N-1 首最佳成绩

---

### `POST /api/tournaments/:id/qualifier/scores`
批量录入预选赛成绩。需要 CHM(本赛事)/ADM/TO 权限。

**TO 限制：** 仅可录入新成绩，不可覆盖已有成绩。

**Request Body:**
```json
{
  "scores": [
    { "userId": "...", "songName": "曲目A", "achievement": 98.5, "dxScore": 0 }
  ]
}
```

**Response:**
```json
{ "msg": "预选赛成绩已录入", "data": { "updated": 5, "errors": [] } }
```

**校验：** 防未报名录入 + 已晋级选手成绩保护（ONGOING+ 状态拒绝）

---

### `POST /api/tournaments/:id/qualifier/advance`
确认晋级名单并推进到 ONGOING。需要 CHM(本赛事)/ADM。

**计算逻辑（隐式）：**
- 不传 `qualifiedUserIds` 时，调用 `calculateQualifierRankings` 自动排名，取前 N 名晋级
- N = `tournament.advanceCount || 8`
- 算法：按选手聚合预选曲目成绩 → 取最佳 N-1 首（1 首时全取）→ 定数加权总分 → 降序排名

**手动指定（显式）：**
- 传 `qualifiedUserIds` 数组时跳过计算，直接使用指定名单
- 可配合 `overrideCutoff: true` 覆盖 advanceCount

**Request Body:**
```json
// 隐式（自动计算排名）
{}

// 显式（手动指定晋级名单）
{ "qualifiedUserIds": ["userId1", "userId2", "userId3"], "overrideCutoff": true }
```

**Response:**
```json
{
  "msg": "已确认晋级名单，赛事进入正赛",
  "data": {
    "qualifiedUserIds": ["id1", "id2", ...],
    "tournament": { ... }
  }
}
```

**校验：**
- 晋级人数 < 2 返回 400
- 已晋级选手成绩保护（ONGOING+ 状态不可修改预选成绩）

**备注：** 自动发送晋级/淘汰站内信通知

---

### `GET /api/tournaments/:id/qualifier/export`
导出预选成绩 CSV（BOM + CJK 兼容）。需要 CHM/ADM。

---

### `POST /api/tournaments/:id/bracket/generate`
生成对阵表。需要 CHM(本赛事)/ADM/TO 权限。

**Request Body:**
```json
{ "seeding": "qualifier" }
```

**分组模式：** 若 tournament.groups 非空，每组独立 Snake Seed + 单败淘汰

**幂等保护：** bracketGenerated 已 true 时返回 409

---

### `POST /api/tournaments/:id/bracket/reset`
重置对阵表生成标志。仅 QUALIFYING 状态可用。

---

### `GET /api/tournaments/:id/bracket`
获取对阵表。公开。选手信息已 populate（含 `{ _id, username, uid, avatarUrl }`）。

**Response:**
```json
{
  "matches": [{ "roundName": "Round 1", "playerA": {...}, "playerB": {...}, ... }],
  "rounds": ["Round 1", "Semi-Final", "Final"],
  "byePositions": [3, 7]
}
```

---

### `PUT /api/tournaments/:id/matches/:matchId`
录入比赛成绩（触发自动推进和 SSE）。需要 CHM/ADM/TO 权限。

**平局规则配置（tournament.tieBreakRule）：**
- `score_only`：比分相等时 winner=null（需手动解决，默认）
- `forfeit_lower_seed`：低位种子自动判负
- `admin_decision`：需请求体传 `winnerId`

**Request Body:**
```json
{
  "scoreA": 4, "scoreB": 1,
  "songs": [{ "songName": "...", "scoreA": 98.5, "scoreB": 97.2 }],
  "status": "FINISHED"
}
```

**自动行为：** 判定 winner → 晋级推进 → 全部完成时自动 FINISHED → 推 SSE

---

### `GET /api/tournaments/:id/results`
获取最终排名。公开。

---

### `POST /api/tournaments/:id/results/generate`
从 bracket 反推最终排名。需要 CHM/ADM（仅 FINISHED 状态）。

**算法：** 决赛 winner=1 / loser=2 / 半决赛 loser=3~4 / 依次类推

---

### `POST /api/tournaments/:id/results/announce`
自动生成结果公告模板。需要 CHM/ADM（需先有 results）。

---

### `POST /api/tournaments/:id/rewards/distribute`
发放奖励。仅 ADM。

**Request Body:**
```json
{ "rewardTypes": ["xp"] }
```

**奖励：** 冠军 1000XP / 亚军 500XP / 季军 200XP / 参与 50XP

**备注：** 成功后自动推站内信通知全体选手

---

### `GET /api/tournaments/:id/events`
SSE 实时事件流（text/event-stream）。公开。

**事件类型：**
| 事件名 | 触发时机 |
|--------|---------|
| `tournament:stateChange` | 状态流转（包括自动推进） |
| `tournament:matchResult` | 比赛结束（包括超时弃权） |
| `tournament:qualifierUpdated` | 预选成绩更新 |
| `tournament:finished` | 赛事结束 |

**连接：** 30s 心跳 + 自动断线重连

---

### `GET /api/tournaments/songs/search?q=xxx`
三库合并搜索预选曲（maimai + Chunithm + Arcaea）。需要 ADM/CHM/TO。

**Response:**
```json
{
  "data": [
    {
      "game": "maimai",
      "title": "...",
      "artist": "...",
      "ds": [12.7, 13.5],
      "level": ["MASTER", "Re:MASTER"],
      "charts": [{ "notes": [200, 300, 400, 100] }],
      "coverUrl": "https://www.diving-fish.com/covers/01234.png",
      "theoreticalDxScore": 3012
    }
  ]
}
```

**说明：**
- `theoreticalDxScore` = Σ(charts.notes) × 3，用于 dxStar 星级计算
- `coverUrl` maimai 来源为 diving-fish covers 服务，其他来源为上游 API 直接提供

---

### `DELETE /api/tournaments/:id`
删除赛事。需要 CHM(本赛事)/ADM 权限。

**限制：** 仅 DRAFT 或 REGISTRATION 阶段可删除。已推进到 QUALIFYING 及之后的赛事只能归档。

**Response:**
```json
{ "msg": "赛事已删除" }
```

---

### `POST /api/tournaments/:id/register/user`
管理员手动录入报名。需要 CHM(本赛事)/ADM 权限。

**与普通报名的区别：**
- 通过 `userId` 参数指定用户，不限制报名者身份
- 跳过时间窗口校验（截止后也可录入）
- 跳过封禁校验
- 不发放 100XP 奖励

**Request Body:**
```json
{ "userId": "...", "formData": { "qq": "123456" } }
```

**Response:**
```json
{ "msg": "已为 PlayerName 完成报名" }
```

---

### 定时任务

| 任务 | 频率 | 说明 |
|------|:----:|------|
| `checkStageAutoAdvance` | 60s | REGISTRATION→QUALIFYING 自动推进（截止+≥2人） |
| `checkTimeoutMatches` | 60s | ONGOING 中超时 match 自动弃权处理 |

---

## 十、公告系统 API

### `GET /api/announcements`
获取全部公告（按时间倒序）。

---

### `GET /api/announcements/:id`
获取单条公告详情。

---

### `POST /api/announcements`
发布公告。需要 ADM 或 ANN 权限。

**Request Body:**
```json
{
  "title": "...",
  "subtitle": "...",
  "type": "NEWS",
  "content": "...",
  "coverUrl": "..."
}
```

---

### `PUT /api/announcements/:id`
编辑公告。需要 ADM 或 ANN 权限。

---

### `DELETE /api/announcements/:id`
删除公告。需要 ADM 或 ANN 权限。

---

## 十一、维基系统 API

### `GET /api/wiki/categories`
获取维基分类列表。

---

### `GET /api/wiki/list`
获取所有已审核通过的维基文章（仅含 title, slug, category, views, updatedAt）。

---

### `GET /api/wiki/page/:slug`
获取维基文章详情（自动 +1 浏览量）。

---

### `POST /api/wiki/submit`
提交/更新维基文章。需要 JWT。

**Request Body:**
```json
{
  "slug": "maimai-basic-guide",
  "title": "舞萌入门指南",
  "categoryId": "...",
  "content": "BBCode content..."
}
```

**说明：**
- ADM/TO 提交自动审核通过（APPROVED）
- 普通用户提交需审核（PENDING）
- 编辑时自动保存历史版本到 `history` 数组

---

### `POST /api/wiki/read-reward`
每日维基阅读奖励 +5 XP（每日限一次）。需要 JWT。

---

### `POST /api/admin/wiki/category`
创建维基分类。需要 ADM/TO 权限。

**Request Body:**
```json
{ "name": "...", "slug": "...", "description": "...", "parentId": "...", "icon": "FaFolder", "color": "text-cyan-400" }
```

---

### `GET /api/admin/wiki/pending`
获取待审核维基文章列表。需要 ADM/TO/MAT 权限。

---

### `PUT /api/admin/wiki/review/:id`
审核维基文章。需要 ADM/TO/MAT 权限。

**Request Body:**
```json
{ "action": "APPROVE" }
```

**action 可选值：** `APPROVE`、`REJECT`

---

## 十二、反馈/投诉系统 API

### 反馈（Feedback）

#### `GET /api/feedback`
获取反馈列表。

**说明：**
- 自动关闭超过 90 天未更新的反馈
- 按置顶 + 更新时间倒序

---

#### `POST /api/feedback`
发布反馈。需要 JWT。

**Request Body:**
```json
{ "title": "...", "content": "...", "type": "SUGGESTION" }
```

---

#### `PUT /api/feedback/:id`
编辑自己的反馈。

---

#### `DELETE /api/feedback/:id`
删除反馈（作者或 ADM）。

---

#### `PATCH /api/feedback/:id/status`
更新反馈状态。

**Request Body:**
```json
{ "action": "SOLVE" }
```

**action 可选值：** `SOLVE`（ADM 标记解决）、`REAPPEAL`（作者申诉重开）

---

#### `PATCH /api/feedback/:id/pin`
ADM 置顶/取消置顶反馈。

---

#### `POST /api/feedback/:id/reply`
回复反馈。需要 JWT。

**Request Body:**
```json
{ "content": "..." }
```

---

### 投诉（Complaint）

#### `POST /api/complaints`
提交投诉。需要 JWT。

**Request Body:**
```json
{
  "type": "HARASSMENT",
  "title": "投诉标题",
  "content": "...",
  "targetUserId": "...",
  "targetContentId": "...",
  "attachments": []
}
```

---

#### `GET /api/complaints?status=PENDING`
获取投诉列表。需要 MAT/ADM 权限。

---

#### `GET /api/complaints/mine`
获取当前用户的投诉记录。

---

#### `PUT /api/complaints/:id`
处理投诉。需要 MAT/ADM 权限。

**Request Body:**
```json
{ "status": "RESOLVED", "handlerNote": "已处理" }
```

**status 可选值：** `PENDING`、`INVESTIGATING`、`RESOLVED`、`DISMISSED`

**说明：** 处理完成后自动发送站内信通知投诉人。

---

## 十三、Letter Decode 游戏 API

### 核心概念
- **OV（Overvalue）**：基于多语种熵值的算力单位
- **Mod**：每局可选多功能修正
- **星级**：5 首歌的基础 OV 总和 / 60
- **OV100**：取 Top 100 局 OV 按 0.95 衰减加权

### Mod 列表

| Mod | 效果 |
|-----|------|
| Tenacity | 时限减半(30s)，得分 x1.15 |
| Fear | 猜错罚 30s，得分 x1.15 |
| Prudence | 猜错即死，得分 x1.55 |
| Reflection | 得分 x1.30 |
| Perceiver | 空格也加密，得分 x1.30 |
| Puzzle | 用 `[长度]` 替代掩码，得分 x1.70 |
| Easy | 时限翻倍(120s)、预设元音，得分 x0.45 |
| Brave | 猜错只罚 5s，得分 x0.50 |
| Lucky | 初始随机揭 30% 字符，得分 x0.20 |
| Strength | 超时不死，得分 x0.10 |

---

### `POST /api/letter-game/start`
开始新对局。需要 JWT。

**Request Body:**
```json
{
  "mods": ["Fear", "Perceiver"],
  "gameTypes": ["arcaea", "maimai"],
  "targetStar": 5.0
}
```

**gameTypes 可选值：** `maimai`、`chunithm`、`arcaea`（可多选）

**Response:**
```json
{
  "sessionId": "...",
  "expireAt": "...",
  "starRating": 5.2,
  "openedChars": [],
  "songs": [
    { "index": 0, "maskedTitle": "**** *****", "status": "PLAYING", "hasKana": false, "hasKanji": false, "hasSym": false }
  ]
}
```

**内部流程：**
1. 从选中曲库各抽 50 首歌合并为池
2. 贪心算法选出最接近 targetStar 的 5 首歌
3. 计算非线性 OV 收益分配
4. 应用 Mod 确定初始状态

---

### `POST /api/letter-game/open`
开字母操作。需要 JWT。

**Request Body:**
```json
{ "sessionId": "...", "char": "a" }
```

**说明：**
- 字符全部转小写存储
- 自动检测全开触发 DEAD 状态
- 操作后刷新过期时间

---

### `POST /api/letter-game/guess`
猜歌名。需要 JWT。

**Request Body:**
```json
{ "sessionId": "...", "songIndex": 0, "guess": "Test Song" }
```

**判定逻辑：**
- 使用 gameEngine.normalizeTitle 标准化后匹配
- 支持别名模糊匹配
- 支持希腊/俄语字母转写

**失败惩罚：**
- 默认减 15s 剩余时间
- Prudence Mod 猜错即死
- Brave Mod 只减 5s

---

### `POST /api/letter-game/abort`
放弃对局（无损，不记录战绩）。需要 JWT。

**说明：**
- 暴露所有曲目标题
- 彻底销毁对局（从 ActiveSession 删除）
- 不产生任何成绩记录

---

### `GET /api/letter-game/records/:username`
获取玩家 Letter Decode 档案。

**Response:**
```json
{
  "user": { "...letterGameStats": {} },
  "stats": { "totalOv": 500, "totalPlays": 10, ... },
  "records": [...]
}
```

---

## 十四、每日推荐 API

### `GET /api/daily-song`
获取今日推荐曲目。

**说明：**
- 以凌晨 4 点为日期分界
- 无录入时返回占位信息

---

### `GET /api/daily-song/history`
获取历史推荐列表（最近 50 条，不含今天之后的）。

---

## 十五、在线人数 API

### `POST /api/online/heartbeat`
客户端发送在线心跳。需要 sessionId。

**Request Body:**
```json
{ "sessionId": "...unique_client_id..." }
```

**Response:**
```json
{ "onlineCount": 42 }
```

---

### `GET /api/online/stats`
获取在线统计。

**Response:**
```json
{
  "serverTime": "2026-04-29T...",
  "currentHour": 10,
  "currentMinute": 30,
  "currentCount": 42,
  "hourlyData": [null, null, ..., 35, 42],
  "timezone": "Asia/Shanghai"
}
```

---

## 十六、管理后台 API

### `POST /api/admin/send-message`
ADM 向指定 UID 用户发送私信。

**Request Body:**
```json
{ "targetUid": 10001, "title": "...", "content": "..." }
```

---

### `POST /api/admin/broadcast-message`
ADM 向全站用户广播站内信。

---

### `POST /api/admin/qualifier-score`
ADM/TO 录入预选赛成绩（与赛事绑定的独立接口）。

---

### `PUT /api/admin/set-role`
ADM 分配角色。

**Request Body:**
```json
{ "targetUid": 10001, "newRole": "ANN", "tournamentId": "..." }
```

**角色列表：**
| 角色 | 名称 | 说明 |
|------|------|------|
| user | 普通用户 | 默认 |
| ADM | 管理员 | 全部权限 |
| ANN | 公告管理员 | 公告管理 |
| CHM | 比赛管理员 | 绑定赛事的管理 |
| MAT | 维护管理员 | 投诉/审核等 |
| TO | 赛事运营 | 维基管理 |
| DS | 设计师 | 预留 |

---

### `GET /api/admin/staff`
获取全部管理员列表。仅 ADM。

---

## 十七、杂项 API

### `GET /api/time`
获取服务器时间。

**Response:**
```json
{ "serverTime": "2026-04-29T...", "timestamp": 174..." }
```

---

### `POST /api/upload`
上传图片到 Cloudinary。需要 JWT。

**格式：** `multipart/form-data`，字段名 `image`

**Response:**
```json
{ "url": "https://res.cloudinary.com/..." }
```

---

### `POST /api/match/register`
赛事报名快捷 API（旧版，推荐使用 tournament 系列 API）。

---

## 附录：数据模型概览

### server/models/ — 18 个 Model

| Model | 文件 | 主要用途 |
|-------|------|---------|
| User | `User.js` | 用户账户（含多游戏档案、好友、角色、签到、LetterGame 统计） |
| Song | `Song.js` | Maimai 曲目（含物量、雷达数据） |
| Score | `Score.js` | Maimai 成绩记录 |
| ArcaeaSong | `ArcaeaSong.js` | Arcaea 曲库（含多语言别名、精确难度定数） |
| ChunithmSong | `ChunithmSong.js` | CHUNITHM 曲库 |
| ChunithmScore | `ChunithmScore.js` | CHUNITHM 成绩 |
| OsuScore | `OsuScore.js` | osu! 成绩/BP |
| Tournament | `Tournament.js` | 赛事完整数据（报名、分组、对局、结果） |
| QualifierScore | `QualifierScore.js` | 预选赛成绩 |
| Announcement | `Announcement.js` | 公告/新闻 |
| Feedback | `Feedback.js` | 用户反馈（含回复链） |
| Complaint | `Complaint.js` | 用户投诉 |
| Message | `Message.js` | 站内信 |
| MessageFolder | `MessageFolder.js` | 站内信文件夹 |
| DailySong | `DailySong.js` | 每日推荐曲目 |
| LetterGame | `LetterGame.js` | 开字母游戏（GameRecord + ActiveSession） |
| Otp | `Otp.js` | 邮箱验证码 |
| WikiPage | `WikiPage.js` | 维基文章（含历史版本） |
| WikiCategory | `WikiCategory.js` | 维基分类 |

### server/utils/ — 2 个工具模块

| 文件 | 用途 |
|------|------|
| `pfCalculator.js` | PureBeat PF 公式引擎（基于定数、达成率、DX 分） |
| `gameEngine.js` | Letter Decode 核心引擎（熵值计算、掩码生成、OV 公式） |

---

*本文档由架构分析自动生成，如有遗漏或变更请及时更新。*
