# PureBeat 现有架构简析

> 项目：MSC 2026 音游赛事社区平台  
> 根目录：`D:\MSC2026\Sign_up`  
> 编写日期：2026-04-30（第三次修订）  
> 编写者：清音（Kiyone）

---

## 一、项目概述

PureBeat 是一个面向 MSC 2026 音游赛事的一站式社区平台，提供赛事报名管理、多游戏成绩档案、曲目图鉴、社区维基、小游戏等功能的 Web 应用。

### 目标用户

- 音游玩家（主攻 Maimai、Chunithm、Arcaea、osu!）
- 赛事组织者与管理员
- 社区贡献者（维基编辑、谱面评价）

### 设计基调

根据 `specs/Global_Vibe.md`，项目设计追求 **Comfortable, Calm, Modern** 的体验，灵感来自 osu! 社区。视觉上使用深色主题 + 半透明毛玻璃效果，字体使用 Quicksand，不采用圆角卡片布局，强调简洁分离线分割功能区。

---

## 二、技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端框架** | React | 19.2 |
| **构建工具** | Vite | 7.3 |
| **路由** | React Router DOM | 7.13 |
| **样式** | Tailwind CSS | 3.4 |
| **动画** | Framer Motion | 12.34 |
| **图标** | Lucide React + React Icons | - |
| **虚拟列表** | React Virtuoso | 4.18 |
| **后端框架** | Express | 4.19 |
| **数据库** | MongoDB（Mongoose） | 8.3 |
| **认证** | JWT（jsonwebtoken） | 9.0 |
| **文件上传** | Multer + Cloudinary | - |
| **邮件服务** | Nodemailer | 8.0 |
| **部署** | Vercel（前端）+ Docker（后端） | - |

---

## 三、目录结构

```
D:\MSC2026\Sign_up/
├── client/                # React SPA 前端
│   ├── public/            # 静态素材（图片、字体）[可忽略]
│   ├── src/
│   │   ├── main.jsx       # 入口
│   │   ├── App.jsx        # 路由配置（~30 个路由）
│   │   ├── Home.jsx       # 首页
│   │   ├── index.css      # 全局样式（Tailwind 指令）
│   │   ├── context/       # React Context 层
│   │   ├── components/    # 通用组件
│   │   └── pages/         # 页面组件
│   ├── package.json
│   └── vite.config.js     # Vite 配置（含 API 代理）
├── server/                # Express + MongoDB 后端
│   ├── app.js             # 🆕 主入口（模块化，~70 行）
│   ├── server.js          # ⛔ 旧版单文件入口（~2800 行，仅作备份）
│   ├── routes/            # 🆕 按功能域拆分的路由模块（18 个）
│   ├── middleware/        # 🆕 认证、权限中间件
│   ├── services/          # 🆕 业务逻辑层
│   │   └── tournament/    # 🆕 赛事子系统（状态机/对阵表/排名/通知/SSE）
│   ├── tasks/             # 🆕 定时任务
│   ├── config/            # 🆕 Cloudinary, 邮件等外部服务配置
│   ├── models/            # Mongoose 数据模型
│   ├── utils/             # 工具函数
│   ├── .env               # 环境变量
│   └── Dockerfile         # Docker 部署配置
├── specs/                 # 项目规范文档
│   ├── func.md            # 功能实现清单
│   ├── Global_Vibe.md     # 设计规范
│   ├── Next_Update.md     # 下阶段更新计划
│   └── Songs_rule.md      # 曲目数据规则
└── docs/                  # 技术文档
    └── management/        # [NEW] 管理类文档
```

---

## 四、前端架构

### 4.1 入口与路由

`main.jsx` → `AuthProvider` → `App.jsx`（BrowserRouter + Routes）

`App.jsx` 定义约 **30 个路由**，全部嵌套在 `Layout` 组件下：

- **公共页面**：Home, Intro, Login, Register, Songs, Rules
- **用户档案**：Profile（自/他人）, MaimaiProfile, ChunithmProfile, OsuProfile, DecodeProfile
- **赛事系统**：Tournaments, TournamentDetail, TournamentManage, TournamentInfo, Qualifiers
- **社区功能**：WikiIndex, WikiArticle, Feedback, ComplaintForm
- **社交功能**：Friends, Inbox, Leaderboard
- **管理功能**：Admin, Settings
- **游戏相关**：LetterGame, DailyHistory
- **回调**：OsuCallback

### 4.2 Context 层（状态管理）

| Context | 职责 | 关键状态 |
|---------|------|---------|
| **AuthContext** | 认证状态 | user, token, loading, login(), logout() |
| **ThemeContext** | 主题切换 | 深色/浅色模式 |
| **ToastContext** | 全局提示 | toast 消息队列 |

无 Redux / Zustand 等重型状态管理方案，全部依赖 React Context。

### 4.3 核心组件

| 组件 | 职责 | 备注 |
|------|------|------|
| Layout | 应用外壳 | 固定背景 + 遮罩 + Sidebar + Outlet |
| Sidebar | 导航侧边栏 | 响应式设计（移动端底部导航） |
| SongDrawer | 曲目详情抽屉 | 含 Tab：谱面信息 / 五维评价 / 排行榜 |
| RadarChart | SVG 五维雷达图 | 支持多数据集叠加 |
| RadarEditor | 可视化雷达编辑器 | 社区投票 + 管理员锚点 |
| SearchBar | 用户搜索 | - |
| FallingIcons | 装饰性动画 | - |

### 4.4 关键依赖

```
axios          → 全部 HTTP 请求
react-router   → SPA 路由（含 loader/action）
framer-motion  → 动画（页面过渡、抽屉弹窗）
bbcode-to-react→ 维基系统 BBCode 渲染
react-virtuoso → 排行榜虚拟滚动（性能优化）
```

### 4.5 Vite 代理配置

```
/api                    → localhost:5000（Express 后端）
/proxy/diving-fish      → diving-fish API（Maimai 数据源）
```

---

## 五、后端架构

### 5.1 整体结构

**2026-04-29 重构后**：由 `app.js` 引导的模块化架构，`server.js` 保留仅为备份，不再使用。

入口流程：`app.js` → 注册 18 个路由模块 + 2 个定时任务 → Express 启动

```
app.js
├── routes/auth.js            # 认证
├── routes/users.js           # 用户
├── routes/songs.js           # 曲目
├── routes/arcaea.js          # Arcaea 曲库
├── routes/letterGame.js      # 开字母游戏
├── routes/social.js          # 社交
├── routes/announcement.js    # 公告
├── routes/feedback.js        # 反馈
├── routes/maimai.js          # Maimai 数据
├── routes/wiki.js            # 维基
├── routes/leaderboard.js     # 排行榜
├── routes/osu.js             # osu! 数据
├── routes/radar.js           # 五维雷达
├── routes/scores.js          # 成绩
├── routes/scoreLeaderboard.js# 成绩排行榜
├── routes/chunithm.js        # CHUNITHM
├── routes/tournament.js      # 🆕 赛事全链路（~1300 行）
├── routes/admin.js           # 管理后台
├── tasks/syncAliases.js      # 曲目别名同步
└── tasks/tournamentTimeout.js# 🆕 赛事超时 & 阶段自动推进
```

**中间件链：**

1. CORS
2. JSON Parser
3. 认证中间件（`middleware/auth.js`：authMiddleware / optionalAuth）
4. 各路由处理器

### 5.2 数据模型（18 个 Model）

#### 用户与认证
| Model | 核心字段 | 说明 |
|-------|---------|------|
| User | username, password, email, uid, role, xp, level, avatarUrl, bio... | 最复杂的 Schema，含多游戏档案、好友系统、签到数据、LetterGame 统计 |
| Otp | email, otp, type, createdAt | 邮箱验证码（10 分钟过期） |

#### 音乐游戏数据
| Model | 说明 |
|-------|------|
| Song | Maimai 曲目（含定数、级别、charts 物量、radar 雷达数据） |
| ArcaeaSong | Arcaea 曲目（含语言别名、多难度定数） |
| ChunithmSong | CHUNITHM 曲目 |
| Score | Maimai 成绩（userId, songId, achievement, rating, pf 等） |
| ChunithmScore | CHUNITHM 成绩 |
| OsuScore | osu! 成绩（pp, mode, beatmapId 等） |
| QualifierScore | 预选赛成绩 |

#### 赛事系统
| Model | 说明 |
|-------|------|
| Tournament | 赛事完整信息 |
| Announcement | 公告/新闻（含封面图、副标题） |
| Complaint | 投诉/申诉 |
| Feedback | 用户反馈 |

#### 社交系统
| Model | 说明 |
|-------|------|
| Message | 站内信 |
| MessageFolder | 站内信文件夹 |
| DailySong | 每日推荐曲目 |

#### 小游戏
| Model | 说明 |
|-------|------|
| LetterGame（GameRecord + ActiveSession） | 开字母游戏对局与战绩存档 |

#### 维基系统
| Model | 说明 |
|-------|------|
| WikiPage | 维基文章（含 BBCode 内容） |
| WikiCategory | 维基分类 |

### 5.3 核心 API 清单（按路由模块分组）

**认证相关** — `routes/auth.js`
- POST `/api/auth/register` — 注册
- POST `/api/auth/login` — 登录
- GET `/api/auth/me` — 获取当前用户
- POST `/api/auth/send-otp` — 发送邮箱验证码

**用户/在线** — `routes/users.js`
- GET `/api/users/:username` — 档案
- PUT `/api/users/profile` — 更新资料
- POST `/api/users/settings/bind-email` — 绑定邮箱
- POST `/api/users/settings/change-email` — 换绑邮箱
- GET `/api/users/search` — 搜索
- POST `/api/users/check-in` — 签到
- POST `/api/online/heartbeat|stats` — 在线统计

**好友/站内信** — `routes/social.js`
- GET `/api/users/:username/friends` — 好友列表
- POST `/api/users/:username/friend-request|accept|reject` — 好友请求
- GET/PUT/DELETE `/api/messages` — 站内信 CRUD
- GET/POST/DELETE `/api/messages/folders` — 文件夹

**赛事系统（~50 端点）** — `routes/tournament.js`
- 完整列表见 5.1 节入口流程图及 `PureBeat_API_文档.md`

**曲目/雷达** — `routes/songs.js`, `routes/arcaea.js`, `routes/chunithm.js`, `routes/radar.js`
- GET `/api/songs|arcaea-songs|chunithm-songs` — 曲库
- GET/PUT/POST `/api/songs/:songId/radar/*` — 雷达图
- POST `/api/admin/sync-songs|sync-arcaea` — [Admin] 同步

**成绩同步** — `routes/scores.js`, `routes/osu.js`, `routes/maimai.js`
- POST `/api/users/sync-maimai|sync-luoxue-oauth|sync-chunithm` — 导入
- POST `/api/osu/bind|/users/sync-osu` — osu! 绑定
- GET `/api/maimai/player-collections/:username` — 牌子

**排行榜** — `routes/leaderboard.js`, `routes/scoreLeaderboard.js`
- GET `/api/leaderboard/:type|decode|qualifiers` — 排行
- GET `/api/songs/:songId/leaderboard` — 单曲排行

**公告/维基/反馈/游戏** — 各独立路由模块
- GET/POST/PUT/DELETE `/api/announcements|wiki/*|feedback|complaints`
- POST `/api/letter-game/start|open|guess|abort` + GET records

**辅助**
- GET `/api/time` — 服务器时间
- POST `/api/upload` — 图片上传（Cloudinary）

### 5.4 定时任务

| 任务 | 间隔 | 位置 | 说明 |
|------|------|------|------|
| syncAliasesTask | 启动后 5 秒，其后每 12h | `tasks/syncAliases.js` | 从外部 API 同步曲目别名 |
| checkTimeoutMatches | 每 60s | `tasks/tournamentTimeout.js` | 🆕 检查超时未完成比赛 |
| checkStageAutoAdvance | 每 60s | `tasks/tournamentTimeout.js` | 🆕 检查阶段自动推进（REGISTRATION→QUALIFYING 等） |
| 在线用户清理 | 每 60s | `server.js`（旧） | 清除 3 分钟内无心跳的会话 |
| 在线快照 | 每 60min | `server.js`（旧） | 记录当前小时在线人数 |

> 注：在线相关任务仍在旧版 `server.js` 中，尚未迁移至模块化架构。

### 5.5 外部依赖

| 服务 | 用途 | 环境变量 |
|------|------|---------|
| MongoDB（Atlas） | 主数据库 | MONGO_URI |
| Cloudinary | 图片托管 | CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET |
| SMTP | 邮件发送 | SMTP_HOST, PORT, USER, PASS |
| 别名 API | 曲目别名同步 | http://114.66.10.76:5000/GetAliasFile |

### 5.6 赛事子系统（`services/tournament/`）

2026-04-30 重构为独立模块：

| 文件 | 职责 |
|------|------|
| `index.js` | 统一导出入口 |
| `stateMachine.js` | 🆕 状态机（canTransition / validateTransition / getRollback） |
| `qualifier.js` | 🆕 预选排名算法 + 晋级名单筛选 |
| `bracket.js` | 🆕 单败淘汰对阵表生成 + 胜者推进 |
| `seeding.js` | 🆕 种子排序（预选排名/随机/手动） |
| `notify.js` | 🆕 站内信通知（晋级/淘汰/结果） |
| `rewards.js` | 🆕 XP 奖励分发 |
| `ssePool.js` | 🆕 SSE 事件池（连接管理 + 按赛事广播） |

##### 预选排名算法演进

| 版本 | 算法 | 说明 |
|------|------|------|
| 旧版（server.js） | 加权总分 | 排除最低分、定数归一化、带权重系数 |
| 新版（qualifier.js） | Σachievement 总达成率 | 三曲达成率相加，平局→dxScore 总分→entryTime |
| 单曲榜 | achievement→dxScore→entryTime | buildSongBreakdown() 分组排序，songBreakdown 透传 |
| DX★ | dxScore / theoreticalDxScore | calcDxStar() 比值映射 5 档：85%/90%/93%/95%/97% |

> 2026-04-30：完成 MSC 2026 遗留数据迁移（17 用户），新老算法兼容

`routes/tournament.js` 驱动全部 30 个赛事端点，涵盖：创建、状态流转、回退、报名、预选、对阵、正赛、分发奖励、SSE 推送。

---

## 六、功能模块分析

### 6.1 用户系统 ✅ 较完善

- 注册/登录（JWT, 30 天过期）
- 邮箱绑定（OTP 验证）
- 等级系统（XP 每 300 升级）
- 每日签到（登录 + 10 XP，手动签到待实现）
- 角色体系（user / ADM / ANN / CHM / MAT / TO / DS）
- 账号注销（180 天保护期）

### 6.2 多游戏档案 ✅ 功能完整

- Maimai：通过水鱼/落雪 API 导入成绩，Rating + PF 计算，B50，牌子追踪
- CHUNITHM：Rating 引擎，B50
- Arcaea：本地曲库同步 + 定数导入
- osu!：OAuth 集成，四模式数据同步，BP100

### 6.3 五维雷达图系统 ✅ v1.0 已完成

- 5 维度（耐力/星星/稳定/准度/潜力）
- 贝叶斯平滑融合算法
- 管理员锚点 + 社区投票
- 防刷分机制（权重 = 成绩质量 × 底力系数）
- 截尾平均去除极端值

### 6.4 Letter Decode 游戏 ✅ 已完成

- 多曲库混合（Maimai/Chunithm/Arcaea）
- 熵值 OV 算分引擎
- 匹配 Mod 系统（Tenacity/Fear/Brave/Lucky 等 10 种）
- 非线性收益分布
- OV100 排行榜

### 6.5 赛事系统 ✅ 重构完成（2026-04-30）

**后端已实现全链路：**

| 环节 | 状态 | 细节 |
|------|------|------|
| 赛事 CRUD | ✅ | 创建/编辑/删除，DRAFT 不可见 |
| 状态机 | ✅ | DRAFT→REG→QUALIFY→ONGOING→FINISHED→ARCHIVED，含回退 |
| 权限管理 | ✅ | ADM / CHM 角色隔离，operationLogs 审计 |
| 报名系统 | ✅ | 表单模板、重复拦截、自行取消、管理员移除
| 自动推进 | ✅ | 注册期→预选期自动检测，双 SSE 通知 |
| 预选赛曲目 | ✅ | 多曲目设置、定数配置 |
| 成绩录入 | ✅ | 单曲录入、覆盖更新、重复计分处理 |
| 预选排名 | ✅ | Σachievement 总达成率排序（平局→DX分→提交时间），含单曲 breakdown |
| 晋级确认 | ✅ | advance → ONGOING + 晋级人数检查 |
| 对阵表生成 | ✅ | 单败淘汰 + 4 种种子模式 |
| 正赛记分 | ✅ | 比分录入、胜者推进、比赛结束检测 |
| SSE 实时推送 | ✅ | 状态变更事件、连接池管理、注册/预选双推 |
| 站内信通知 | ✅ | 晋级/淘汰/最终结果 |
| XP 奖励 | ✅ | 完赛 XP 自动分发 |
| 选曲切曲 & 单曲排行 | ✅ | SongCardStage 3D 曲卡旋转交互 + per-song 排行榜视图 |
| DX★ 星级系统 | ✅ | dxScore/theoreticalDxScore 比值计算，1-5★，ESXi 风格图标

> 下一阶段（`specs/Next_Update.md`）将聚焦前端赛事管理页面补齐与多赛制支持。

### 6.6 维基系统 ⚠️ 基础实现

- 文章浏览与创建
- BBCode 支持
- 审核流程待完善

### 6.7 新闻/公告系统 ⚠️ 后端欠缺

- 前端页面已实现
- 后端公告发表接口已实现（需权限）
- 但批量管理和编辑功能欠缺

---

## 七、架构风险与关注点

### 7.1 ✅ 单文件后端重构完成

原 `server.js`（~2800 行）已于 **2026-04-29 至 2026-04-30 完成拆分**：

```
server/
├── app.js          # 引导入口（~70 行）
├── routes/         # 18 个路由模块 ✓
├── middleware/     # 认证中间件 ✓
├── services/       # 业务逻辑层 ✓
│   └── tournament/ # 赛事子系统（8 个文件）
├── tasks/          # 定时任务 ✓
├── models/         # 数据模型 ✓
├── utils/          # 工具函数 ✓
└── config/         # 外部服务配置 ✓
```

**`server.js` 保留仅为备份，不再使用。** 但仍有少量功能未迁移：在线心跳统计。2026-04-30 已确认 app.js 为唯一入口，server.js 不再维护。

### 7.2 缺少 TypeScript

前后端均为 JavaScript，重构后路由/服务模块增多，接口约定依赖文档而非类型系统。考虑逐步迁移至 TypeScript。

### 7.3 状态管理

当前依赖 React Context，页面增多后性能可能受影响（不必要的重渲染）。如 Team 页面、实时功能增多，可考虑引入 Zustand 或 Jotai。

### 7.4 文档覆盖

- ✅ 五维雷达图（`docs/RADAR_SYSTEM.md`）
- ✅ 功能清单（`specs/func.md`）
- ✅ 设计规范（`specs/Global_Vibe.md`）
- ✅ API 文档（`docs/management/PureBeat_API_文档.md` v1.1）
- ❌ 数据模型关系图缺失
- ❌ 部署/运维文档缺失

### 7.5 测试覆盖

目前项目中无测试文件（单元测试 / 集成测试），建议至少为核心引擎（pfCalculator, gameEngine）添加单元测试。

### 7.6 安全

- 密码使用 bcryptjs 哈希 ✅
- JWT Token 认证 ✅
- 角色权限控制 ✅
- 邮箱验证 ✅
- 图片上传通过 Cloudinary（非直接存储）✅
- 无 SQL 注入风险（MongoDB）✅

---

## 八、下次更新重点（根据 specs/Next_Update.md）

1. **身份认证体系完善**：增强 ADM / ANN / CHM / MAT 各角色权限的执行逻辑
2. **比赛管理流程**：完善从报名到分组到成绩录入的完整闭环
3. **锦标赛页面**：多种赛制支持（双败、瑞士轮等）
4. **维护工具**：维基审核、评论管理、投诉处理后台

---

## 九、文件与代码统计

| 维度 | 数量 |
|------|------|
| 页面组件 | 25+ |
| 通用组件 | 8 |
| Context 提供者 | 3 |
| 数据模型 | 18 |
| Utils 模块 | 2 |
| API 端点 | 80+（含赛事系统 ~50 个端点） |
| 配置文件 | 10+ |

---

*本文档将随项目演进持续更新。*
