1\[已实现].在用户的 Maimai Profile 页面新建一个前端入口，跳转到关于用户收藏品的统计信息新页面（maimai\_collections.jsx）
下面是关于收藏品的介绍：

在统计用户的收藏品之前，你理应先获取该游戏的所有收藏品信息并展示。

统计应当延续Maimai Profile的风格，即进度条，颜色分层，不紧凑，性能优化。

游戏资源【注意：游戏资源的访问频率有限制，请勿频繁请求。】不要每进入一次页面就请求一次，而是直接一次即可；再请求视为对游戏版本的更新补充。

基础 URL：https://assets2.lxns.net/maimai

路径：



头像：/icon/{icon\_id}.png

姓名框：/plate/{plate\_id}.png

背景：/frame/{frame\_id}.png

称号没有图片，只有稀有度（颜色区分），在下文中的TrophyColor响应体中定义。



GET /api/v0/maimai/{collection\_type}/list

获取收藏品列表。



查询参数

参数名	类型	说明

version	int	值可空，游戏版本，默认值为 25000

required	bool	值可空，是否包含曲目需求，默认值为 false

URL 参数

参数名	类型	说明

collection\_type	string	收藏品类型，值为 trophy、icon、plate 或 frame

响应体：

字段名	类型	说明

trophies	Collection\[]	仅收藏品类型为 trophy，称号列表

icons	Collection\[]	仅收藏品类型为 icon，头像列表

plates	Collection\[]	仅收藏品类型为 plate，姓名框列表

frames	Collection\[]	仅收藏品类型为 frame，背景列表

GET /api/v0/maimai/{collection\_type}/{collection\_id}

获取收藏品信息。



查询参数

参数名	类型	说明

version	int	值可空，游戏版本，默认值为 25000

URL 参数

参数名	类型	说明

collection\_type	string	收藏品类型，值为 trophy、icon、plate 或 frame

collection\_id	int	收藏品 ID

响应体：

Collection



Collection响应体具体如下：

收藏品



字段名	类型	说明

id	int	收藏品 ID

name	string	收藏品名称

color	TrophyColor	值可空，仅玩家称号，称号颜色

description	string	值可空，收藏品说明

genre	string	值可空，除玩家称号，收藏品分类（日文）

required	CollectionRequired\[]	值可空，收藏品要求



CollectionRequired响应体具体如下

收藏品要求



字段名	类型	说明

difficulties	LevelIndex\[]	值可空，要求的谱面难度，长度为 0 时代表任意难度

rate	RateType	值可空，要求的评级类型

fc	FCType	值可空，要求的 FULL COMBO 类型

fs	FSType	值可空，要求的 FULL SYNC 类型

songs	CollectionRequiredSong\[]	值可空，要求的曲目列表

completed	bool	值可空，要求是否全部完成



CollectionRequiredSong响应体具体如下

收藏品要求曲目



字段名	类型	说明

id	int	曲目 ID

title	string	曲名

type	SongType	谱面类型

completed	bool	值可空，要求的曲目是否完成

completed\_difficulties	LevelIndex\[]	值可空，已完成的难度

CollectionGenre响应体具体如下

收藏品分类



字段名	类型	说明

id	int	收藏品分类 ID

title	string	分类标题

genre	string	分类标题（日文）

枚举类型

LevelIndex响应体具体如下

难度



值	类型	说明

0	int	BASIC

1	int	ADVANCED

2	int	EXPERT

3	int	MASTER

4	int	Re:MASTER

提示

当曲目为宴会场曲目时，该字段默认为 0。



FCType响应体具体如下

FULL COMBO 类型



值	类型	说明

app	string	AP+

ap	string	AP

fcp	string	FC+

fc	string	FC

FSType响应体具体如下

FULL SYNC 类型



值	类型	说明

fsdp	string	FDX+

fsd	string	FDX

fsp	string	FS+

fs	string	FS

sync	string	SYNC PLAY

RateType响应体具体如下

评级类型



值	类型	说明

sssp	string	SSS+

sss	string	SSS

ssp	string	SS+

ss	string	SS

sp	string	S+

s	string	S

aaa	string	AAA

aa	string	AA

a	string	A

bbb	string	BBB

bb	string	BB

b	string	B

c	string	C

d	string	D

SongType响应体具体如下：

谱面类型



值	类型	说明

standard	string	标准谱面

dx	string	DX 谱面

utage	string	宴会场谱面

提示

仅宴会场曲目（曲目 ID 大于 100000）为 utage 类型。



TrophyColor响应体具体如下

值	类型	说明

normal	string	普通

bronze	string	铜

silver	string	银

gold	string	金

rainbow	string	虹



2.【TODO】目前导入的所有称号（2700+）全部是普通称号，没有颜色区分，但是你似乎已经分好了称号（把数据分成了若干组），但每组标题都是普通称号。请检查 TrophyColor 的处理逻辑。如果是请求的数据本身就全返回普通，直接输出“2. Check Failed"



3.【TODO】实现用户获取收藏品数据的统计接口，具体获取接口（落雪）可请求：OAuth 认证。该认证已在 MaimaiProfile 前端实现。



需要在请求头加入 OAuth 生成的访问密钥。访问用户的收藏品进度接口：
GET /api/v0/maimai/player/{friend\_code}/{collection\_type}/{collection\_id}

获取玩家收藏品进度。



权限

allow\_third\_party\_fetch\_scores

URL 参数

参数名	类型	说明

friend\_code	int	好友码

collection\_type	string	收藏品类型，值为 trophy、icon、plate 或 frame

collection\_id	int	收藏品 ID

响应体

Collection（见1）



4.【TODO】针对用户收藏品的前端展示逻辑：需要有完整统计面板，已拥有高亮处理，进度。



5.【TODO】收藏品详情展示：请仔细阅读，下面这段实现较难。
Trophy 类收藏品的获取，部分是有条件的，其中一类条件就是在某首/某几首歌中特定难度达成特定条件。例如：

YURUSARENAI

（YURUSHITE\[でらっくす]/MASTER/1 MISS）

上面这个称号要求 YURUSHITE 这首歌的 MASTER 难度达成恰好 1 Miss 后可获得。又如：
敬愛。

アンクローズ・ヒューマン\[でらっくす]/プレイ

上面这个称号要求 アンクローズ・ヒューマン 这首歌的 任意难度 游玩后可获得。再如：
Nice boat.

もぺもぺ\[でらっくす]/True Love Song/一回のクレジットでプレイ

上面这个称号要求在 1 PC 内游玩 もぺもぺ 和 True Love Song。还如：
私が俗に言う天才です

うっせぇわ\[でらっくす]/ALL PERFECT
上面这个称号要求 うっせぇわ 达成 AP。



具体来说，这一类称号通常有以下几个字段：\[曲目]/（\[难度]）/\[条件]（可多个条件）

曲目的后面一般都带有\[でらっくす]，或者什么都不带。

当难度缺失时，说明任意难度均可达成。

难度有：BASIC, ADVANCED, EXPERT, MASTER, Re:MASTER, 全难易度。

条件可能是 （几回，例如30回）（几人，例如4人で）プレイ（Play）/FULL COMBO(+)/ALL PERFECT(+)/FULL SYNC(+)/FULL SYNC DX(+)/1 MISS/RANK S(S+,SS,SS+,SSS,SSS+)/Speed Sonic（1）（使用 Sonic 速/1速游玩）

注意：称号全部是用日文和英文写成的。

现在请你做称号详情页，对于这一类称号，需要关联到对应的曲目（信息），并给出用户当前的完成度和距离进度条。



6.【TODO】在收藏品页面右下角放置固定按钮，用户点击便可到达最顶端。这是由于鼠标滚轮滑动太慢了，且侧边侧拉条过窄。



7.【TODO】收藏品页面的背景分类：背景也是属于那种水平长大于竖直高的横条形状，请优化当前的竖条显示逻辑，使其变为横板展示。

