1.修复 Songs 页面，舞萌DX 曲目获取不到封面的问题。

请使用落雪查分器的公共 API 接口查询，逻辑：

同一首曲目的标准、DX 谱面的曲目 ID 一致，不存在大于 10000 的曲目 ID（如有，请在请求前对 10000 取余处理）。宴会场曲目为例外，不分标准、DX 谱面，曲目 ID 大于 100000。
https://assets2.lxns.net/maimai/jacket/\[曲目ID].png，如果后端接口有这方面的冗余，清除。



2.美化 SongDrawer 中的排行榜。你理应给出榜上用户的头像，并按要求引用 DX 星标（./public/assets/\[数字]dxstar.png），并整体美化 SongDrawer。同时在曲目信息中，需显示曲目的别名。



3.点击逻辑：对于 SongDrawer 中的一些信息：歌曲曲名，歌曲别名。将它们变得可点击，点击效果是：曲名和别名会自动复制到剪切板。



4.在用户的 Maimai Profile 页面新建一个前端入口，跳转到关于用户收藏品的统计信息新页面（maimai\_collections.jsx）
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

