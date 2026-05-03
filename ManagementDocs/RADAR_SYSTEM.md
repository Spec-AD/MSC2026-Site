# 🌟 五维雷达图系统实现文档

## 📋 系统概述

为 Maimai DX 谱面引入五维能力评价体系，包含：
- **耐力 (Stamina)**: 体力与连续输入考验
- **星星 (Star)**: DX 分数目标技巧难度
- **稳定 (Stable)**: 保持高准度输出的稳定性
- **准度 (Accuracy)**: 判定严格度与 Critical 窗口
- **潜力 (Potential)**: 能力提升潜力上限

---

## 🗂️ 文件结构

### 新增文件

#### `client/src/components/RadarChart.jsx`
通用五维雷达图 SVG 组件
- 支持多数据集叠加对比
- 自定义颜色、尺寸、网格
- 动画支持

#### `client/src/components/RadarEditor.jsx`
可视化雷达图编辑器
- 双轨对比（全站综合 vs 个人评价）
- 管理员模式：设置基础锚点
- 玩家模式：提交主观投票
- 实时预览 + 滑块调节

### 修改文件

#### `server/models/Song.js`
```javascript
// 新增字段
radarStats: {  // 管理员设置的基础锚点
  type: mongoose.Schema.Types.Mixed,
  default: {}
  // 格式: { "0": {stamina:5, star:5, ...}, "3": {...} }
}

radarVotes: {  // 玩家投票池
  type: mongoose.Schema.Types.Mixed,
  default: {}
  // 格式: { "3": [{userId, weight, values, createdAt}, ...] }
}
```

#### `server/server.js`
新增 4 个 API 端点：

1. **GET `/api/songs/:songId/radar`**
   - 获取贝叶斯融合后的全站雷达数据
   - 返回每个难度的最终展示值 + 投票数

2. **PUT `/api/songs/:songId/radar/base`** (需管理员权限)
   - 设置基础锚点值
   - Body: `{ diffIndex, values: {stamina, star, ...} }`

3. **POST `/api/songs/:songId/radar/vote`** (需登录 + 成绩验证)
   - 玩家提交主观投票
   - 权重 = 成绩质量系数 × 底力系数
   - Body: `{ diffIndex, values }`

4. **GET `/api/songs/:songId/radar/my-vote`** (需登录)
   - 获取当前玩家的历史投票
   - Query: `?diffIndex=3`

#### `client/src/components/SongDrawer.jsx`
完全重写，新增功能：
- **Tab 导航**: 谱面信息 / 五维评价 / 排行榜
- **Note 物量构成图**: SD(4类) / DX(5类) 自动识别
- **五维雷达图展示**: 集成 RadarChart + RadarEditor
- **动画优化**: Framer Motion 进场动画

#### `client/src/pages/MaimaiProfile.jsx`
新增玩家能力计算引擎：
- 取 Top 50 成绩
- 按 `0.95^idx` 衰减权重
- 每首歌的谱面雷达值 × 成绩质量系数
- 加权平均后归一化到 0~10

---

## 🧠 核心算法

### 1. 权重计算（防恶意篡改）

```javascript
// 成绩质量系数
let scoreMultiplier = 0.1;
if (ach >= 100.5) scoreMultiplier = 1.0;       // SSS+
else if (ach >= 100.0) scoreMultiplier = 0.85; // SSS
else if (ach >= 99.0) scoreMultiplier = 0.7;   // SS+
else if (ach >= 97.0) scoreMultiplier = 0.5;   // SS
else if (ach >= 94.0) scoreMultiplier = 0.35;  // S+
else if (ach >= 90.0) scoreMultiplier = 0.2;   // S

// 底力系数（Rating 越高权重越大）
const ratingMultiplier = Math.min(1.0, Math.max(0.1, rating / 16000));

// 最终权重
const weight = scoreMultiplier * (0.5 + 0.5 * ratingMultiplier);
```

### 2. 截尾平均（去除极端值）

```javascript
// 去掉最高 15% 和最低 15%
const trimRatio = 0.15;
const trimCount = Math.floor(allVals.length * trimRatio);
const trimmed = allVals.slice(trimCount, allVals.length - trimCount);
```

### 3. 贝叶斯平滑融合

```javascript
const BAYESIAN_C = 10; // 相当于 10 个高权重玩家的分量

// Base: 管理员锚点
// μ: 玩家投票加权平均
// ΣW: 玩家投票总权重
const final = (C × Base + ΣW × μ) / (C + ΣW);
```

**效果**：
- 投票数少时，主要依赖管理员锚点
- 投票数多时，逐渐向玩家共识收敛
- 防止单个恶意高权重玩家操纵数据

### 4. 玩家能力计算

```javascript
// Top 50 成绩，按 rating 排序
const top50 = allScores.sort((a,b) => b.rating - a.rating).slice(0, 50);

// 衰减权重：第 1 名权重 1.0，每增加一名乘以 0.95
const decayWeight = Math.pow(0.95, idx);

// 成绩质量系数
const achFactor = ach >= 100.5 ? 1.0 : ach >= 100.0 ? 0.85 : ...;

// 该维度贡献 = 谱面该维度难度 × 成绩质量 × 衰减权重
dimAccum[dim] += radarValue × achFactor × decayWeight;

// 最终能力值 = 加权平均
ability[dim] = dimAccum[dim] / dimWeight[dim];
```

---

## 🎨 UI/UX 特性

### SongDrawer Tab 导航
- **谱面信息**: 原有的难度列表、BPM、谱师等
- **五维评价**: Note 物量构成 + 雷达图 + 评价按钮
- **排行榜**: 全局/好友排行榜（仅 Maimai）

### Note 物量构成图
- 自动识别 SD(4类) / DX(5类)
- 顶部分段进度条
- 竖向迷你柱状图 + 百分比
- 谱师信息展示

### 雷达图编辑器
- 双轨对比：全站综合（实线）vs 我的评价（虚线）
- 五个滑块：实时调节 0.0 ~ 10.0
- 管理员模式：金色主题 + 锚点标识
- 玩家模式：蓝色主题 + 权重提示

### 玩家能力雷达图
- Profile 页面 3-4 区块
- 基于 Top 50 成绩实时计算
- 五个维度数值卡片
- 说明文字：算法透明化

---

## 🔐 权限控制

| 操作 | 权限要求 | 说明 |
|------|----------|------|
| 查看雷达图 | 无 | 所有人可见全站综合数据 |
| 提交投票 | 登录 + 有成绩 | 必须先打过该难度 |
| 设置锚点 | 管理员 (ADM) | 仅管理员可设置基础值 |
| 查看个人投票 | 登录 | 仅能查看自己的历史投票 |

---

## 📊 数据流

```
┌─────────────┐
│ 管理员设置  │ ──┐
│ 基础锚点    │   │
└─────────────┘   │
                  ▼
┌─────────────┐  ┌──────────────┐  ┌─────────────┐
│ 玩家 A 投票 │─▶│ 贝叶斯平滑   │─▶│ 全站综合值  │
│ (权重 0.8)  │  │ 截尾平均     │  │ (展示给所有 │
└─────────────┘  │ 加权聚合     │  │  用户)      │
┌─────────────┐  └──────────────┘  └─────────────┘
│ 玩家 B 投票 │─▶                         │
│ (权重 0.5)  │                           │
└─────────────┘                           ▼
       ...                      ┌─────────────────┐
                                 │ 玩家能力计算    │
                                 │ (Top50 加权)    │
                                 └─────────────────┘
```

---

## 🚀 使用示例

### 管理员设置锚点

```javascript
// PUT /api/songs/12345/radar/base
{
  "diffIndex": 3,  // MASTER
  "values": {
    "stamina": 8.5,
    "star": 9.0,
    "stable": 7.5,
    "accuracy": 8.0,
    "potential": 9.5
  }
}
```

### 玩家提交投票

```javascript
// POST /api/songs/12345/radar/vote
{
  "diffIndex": 3,
  "values": {
    "stamina": 9.0,
    "star": 8.5,
    "stable": 8.0,
    "accuracy": 8.5,
    "potential": 9.0
  }
}

// 响应
{
  "msg": "投票已记录",
  "weight": 0.7854  // 根据成绩和 Rating 计算
}
```

### 获取雷达数据

```javascript
// GET /api/songs/12345/radar
{
  "songId": "12345",
  "radarStats": {  // 管理员锚点
    "3": { stamina: 8.5, star: 9.0, ... }
  },
  "finalRadar": {  // 融合后的最终值
    "3": {
      stamina: 8.7,
      star: 8.8,
      stable: 7.9,
      accuracy: 8.2,
      potential: 9.3,
      voteCount: 42  // 投票人数
    }
  }
}
```

---

## 🎯 设计理念

### 1. 数据民主化
- 管理员提供初始锚点（专业视角）
- 玩家投票逐步修正（群体智慧）
- 贝叶斯平滑保证数据稳定性

### 2. 防作弊机制
- 权重与成绩质量挂钩
- 截尾平均去除极端值
- 必须有成绩才能投票

### 3. 透明化
- 显示投票人数
- 说明算法原理
- 玩家可查看自己的历史投票

### 4. 可扩展性
- 维度定义在前端配置
- 后端使用 Mixed 类型存储
- 易于添加新维度或调整算法

---

## 🔧 维护指南

### 调整贝叶斯系数

在 `server/server.js` 中修改：

```javascript
const BAYESIAN_C = 10;  // 增大 → 更依赖管理员锚点
                        // 减小 → 更依赖玩家投票
```

### 调整截尾比例

```javascript
const trimRatio = 0.15;  // 增大 → 去除更多极端值
                         // 减小 → 保留更多原始数据
```

### 调整权重公式

修改成绩质量系数阈值：

```javascript
if (ach >= 100.5) scoreMultiplier = 1.0;
else if (ach >= 100.0) scoreMultiplier = 0.85;
// ... 根据游戏难度调整
```

---

## ✅ 测试清单

- [ ] 管理员可设置锚点
- [ ] 玩家可提交投票（需成绩验证）
- [ ] 无成绩玩家提交投票被拒绝
- [ ] 雷达图正确显示融合数据
- [ ] 投票数为 0 时显示锚点值
- [ ] 玩家能力雷达图正确计算
- [ ] Note 物量构成图正确识别 SD/DX
- [ ] Tab 切换流畅无卡顿
- [ ] 编辑器双轨对比正确显示
- [ ] 权重计算符合预期

---

## 📝 后续优化方向

1. **历史趋势图**: 显示雷达数据随时间的变化
2. **维度相关性分析**: 分析五个维度之间的关联
3. **推荐系统**: 根据玩家能力推荐适合的谱面
4. **批量导入**: 管理员批量设置多首歌的锚点
5. **投票理由**: 允许玩家附加文字说明
6. **争议标记**: 标记投票分歧较大的谱面

---

**实现完成时间**: 2026-04-04
**文档版本**: v1.0  
**维护者**: Development Team
