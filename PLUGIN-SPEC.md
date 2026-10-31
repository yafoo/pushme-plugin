# 插件商店：仓库侧规范

App 的「插件商店」只认仓库根目录的一份 `index.json`，插件源码本身仍是普通的 `.js` 文件。

## 1. 仓库结构

```
pushme-plugin/
├── index.json                  ← 由 gen-index.js 生成，勿手改
├── plugins/                    ← 所有插件放这里
│   ├── _template.js            ← 模板，`_` 开头的文件不会被收录
│   ├── plugin_time.js
│   └── auto_theme.js
├── gen-index.js                ← 生成 index.json + 刷新 README 列表
├── PLUGIN-SPEC.md              ← 本文档
└── .github/workflows/index.yml ← push 后自动重建索引
```

`index.json` 里的 `file` 是**相对仓库根目录**的路径（如 `plugins/plugin_time.js`），App 端直接拼到源地址后面。

## 2. 插件文件规范

文件开头一段 JSDoc，后面是**裸函数表达式**：

```js
/**
 * @key         pushme.plugin_time
 * @name        插件运行时间
 * @description 把整条插件链的耗时附加到标题末尾
 * @author      yafoo
 * @version     1.0.1
 * @tags        调试
 * @dependencies PMF.toast
 * @env         API_TOKEN, GROUP_NAME
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    next()
}
```

| 标签 | 必填 | 说明 |
|---|---|---|
| `@name` | ✅ | 商店里显示的名字 |
| `@version` | ✅ | `x.y.z`，**改代码就必须升**，否则用户收不到更新 |
| `@key` | 建议 | 稳定标识，`pushme.xxx`。不写则默认取文件名（`pushme.` + 文件名）。**改文件名等于换插件**，想固定就写死它 |
| `@description` | 建议 | 一行说明，商店列表和 README 表格里展示 |
| `@author` | 建议 | 作者名 |
| `@tags` | 按需 | 分类，多个用逗号分隔。只用于 README 列表，App 暂未展示 |
| `@dependencies` | 按需 | 用到的内置方法，`PMF.toast、PMF.aes` 或逗号分隔。**安装前会展示给用户**，缺的会提示开启 |
| `@env` | 按需 | 需要用户填的环境变量 key，安装弹窗里会列出来 |
| `@minAppVersion` | 按需 | 要求的最低 App 版本（如 `5.1.0`），留空表示不限 |

### 2.1 四条硬性约束

1. **必须是裸函数表达式**，不能是 `module.exports = function...`，也不能在末尾加分号。
   App 侧是 `plugins.push(<你的源码>)` 的字符串拼接，多一个 `;` 就是语法错误，
   而且会导致**所有插件一起失效**。
   > 安装器会自动去掉末尾多余分号，但请别依赖它。
2. **不能出现 `require(` / `module.exports`**，安装器会直接拒绝。
3. **不要在函数外面声明变量或函数**。所有启用的插件会被拼进**同一个** JS 程序，
   两个插件各写一个 `const KEY = 'x'` 就是重复声明 → 整段程序语法错误 → **所有插件一起失效**。
   辅助函数写在 `function(msg, next) { ... }` 里面（用 `const fn = function() {}`）。
4. **别把密钥写进代码**。插件能读 `ENV`，密钥应该让用户自己填在环境变量里；
   写进插件源码等于公开。

> 文件头那一段 JSDoc 是**可以带**的：App 在校验「是不是函数表达式」之前会先剥掉开头的注释。
> 但别在函数体后面再追加注释块，拼接时容易踩到分号问题。

### 2.2 运行时心智模型（写插件前必须知道）

这四条决定了「能写什么、不能写什么」，比 API 本身更重要：

| 事实 | 后果 |
|---|---|
| **插件无状态**。每条消息都会新开一个 QuickJS 上下文，跑完即销毁 | `let count = 0` 这类计数、缓存、去重表全部无效，下次消息就归零 |
| **所有插件共享一个 JS 程序**，按列表顺序组成洋葱模型执行 | 函数外不能声明任何变量/函数（两个插件重名 = 整段语法错误 = 全部失效） |
| **不调 `next()` 就是截断**，后面的插件不再执行 | 想「什么都不做」时用 `return next()` 提前退出，而不是直接 return |
| **异步改不了消息**。`PMF.fetch.asyncPost()` 返回时消息已经入库、通知已经发出 | 异步只能做副作用（转发、上报）；要改 `msg` 必须用同步 `fetch`，而它会卡住整条链路 |

**洋葱模型**：列表第 1 个在最外层。`next()` 之前的代码按列表顺序执行，`next()` 之后的代码按**倒序**执行。

```
插件1 前 → 插件2 前 → 插件3 前 →（末尾）→ 插件3 后 → 插件2 后 → 插件1 后
```

所以「排在前面」不等于「最后生效」：

- 想让某条规则**优先命中**（先到先得），把它排前面，代码写在 `next()` 之前；
- 想**最后统一处理**（量耗时、追加后缀、转发最终形态），要么排最前把逻辑写在 `next()` 之后，
  要么排最后把逻辑写在 `next()` 之前 —— 效果等价，但前者能顺便拿到整条链的耗时。

同步 `PMF.fetch.get/post` 的超时默认 30 秒，这期间**消息不入库、不弹通知**。
除非真的需要拿返回值改消息，否则一律用 `async` 版本。

### 2.3 能改什么

`msg` 只有四个字段：`title` / `content` / `date` / `type`。

**标题里能塞三种标记**（App 靠解析标题来决定分组、通道、主题）：

| 标记 | 位置要求 | 作用 |
|---|---|---|
| `[i]` `[s]` `[w]` `[f]` | **必须在最前面** | 主题色：信息 / 成功 / 告警 / 失败 |
| `[~通道名]` | 任意位置 | 投到指定通知通道（影响静音、播报、重复提醒） |
| `[#分组名]` | 任意位置 | 消息按分组归类 |
| `[#分组名!头像URL]` | 任意位置 | 同上，并给分组挂头像（App 会下载缓存） |

顺序很重要：先加 `[#分组]` 再加 `[w]` 的话主题会解析不到，因为 `[w]` 不在标题最前面。

**`type` 的取值**：

| 类型 | 是否弹通知 | 说明 |
|---|---|---|
| `text` / `markdown` / `html` / `url` | 会 | `url` 的正文是链接，点通知直接开浏览器 |
| `data` / `markdata` / `chart` / `echarts` / `svg` / `note` | **不会** | 只进 App（消息列表、小屏、悬浮窗）。`chart` 的正文见下方说明，`note` 是可勾选的待办 |
| `notify` | 中间类型 | 通知监听转发进来的消息，**必须由插件改成正常类型**，否则退化成一段 JSON 代码块 |
| `task` | 中间类型 | 定时任务触发，**没有插件接管时 App 直接丢弃这条消息** |

想「不弹通知但保留消息」，把 `type` 改成 `markdata` 就行（正文按 markdown 渲染）。

⚠️ **`chart` 的正文是纯文本，不是 JSON**：`类型|尺寸::数值|标签,数值|标签`，例如
`bar|10::30|CPU,60|内存`。JSON 是**入库时** App 自己用 `parseChartData` 解析出来再存的
（`AppDao.addMessage`），插件里塞 `JSON.stringify(...)` 会被当成一个数据点，整张图变成 0。

### 2.4 `type` 的修饰符写法

`type` 可以用 `+` 连接修饰符，插件处理完把真实类型还原回去：

| 写法 | 含义 |
|---|---|
| `base64+text` | 正文是 base64，解码后按 text 显示 |
| `md5+markdown` | 正文带 md5 签名，校验后按 markdown 显示 |
| `base64+md5+text` | 先解码、再验签 |

- 修饰符目前只有 `base64`（`base64_decode.js`）和 `md5`（`md5_verify.js`），
  不属于修饰符的那一段就是真实类型，没写就按 `text`。
- **顺序是固定的**：签名算的是**解码后**的正文，所以 `base64` 必须排在 `md5` 前面。
  `md5_verify.js` 里有一句「还带着 base64 就先放行」的守卫，插件顺序反了也不会误判。
- 签名格式：正文 + 空行 + 单独一行 `--` + 32 位十六进制 md5，
  值 = `md5(正文 + MD5_SECRET)`。
- 没装对应插件时，这种 `type` 会被 App 当成未知类型退化成 `text` —— 所以是「装了才生效，不装也不会坏」。

## 3. 索引字段

| 字段 | 说明 |
|---|---|
| `schema` | 格式版本，目前固定 `1`。App 遇到更高版本会拒绝解析而不是乱猜 |
| `updatedAt` | 生成时间（ISO 8601），仅展示。内容没变时脚本会沿用旧值，避免无意义提交 |
| `plugins[].key` | 稳定标识，`pushme.xxx`。**App 判断「装没装过 / 能不能更新」全靠它** |
| `version` | 可读版本号 |
| `versionCode` | `major*10000 + minor*100 + patch`，**App 用整数比较**，别用字符串比 `1.10.0` 和 `1.9.0` |
| `minAppVersion` | 最低 App 版本（versionName 形式），留空表示不限 |
| `tags` | 分类，来自 `@tags`。App 端已解析，暂未展示 |
| `dependencies` | 同 `@dependencies` |
| `env` | 同 `@env` |
| `file` | 相对仓库根的路径。**不要写绝对 URL**，否则换源就废了 |
| `sha256` | 源码的 sha256，App 安装时校验。**算的是「归一化后」的内容**（统一行尾为 LF、去 BOM、trim、去末尾分号），必须和 App 端 `PluginInstaller.normalize()` 一致，否则每次安装都会报校验失败 |
| `size` | **原始文件**字节数，仅展示。和 `sha256` 的口径不同（hash 算的是归一化内容），别拿它反推 |

## 4. README 插件列表

README 里两个标记之间的表格由脚本自动生成（含分类、依赖两列）：

```md
<!-- plugins:start -->
| 插件 | 说明 | 分类 | 依赖 | 版本 |
| --- | --- | --- | --- | --- |
| [插件运行时间](./plugins/plugin_time.js) | ... | 调试 | PMF.toast | `1.0.1` |
<!-- plugins:end -->
```

**别删这两个标记**，删了脚本就只更新 `index.json`、不再更新列表（会在终端提示一句，不算失败）。

## 5. 发布流程

```bash
# 1. 改插件，同时升 @version
vim plugins/plugin_time.js

# 2. 本地生成索引（会校验版本是否递增）
node gen-index.js

# 3. 提交，CI 会再跑一遍并提交 index.json / README.md
git add plugins/ index.json README.md
git commit -m "feat: 插件运行时间 1.0.1"
git push
```

`gen-index.js` 有两条会**直接让 CI 失败**的校验，都是为了保护更新机制：

- 文件内容变了、`@version` 没变 → 失败。否则 App 端 `versionCode` 不变，永远不提示更新。
- `versionCode` 比上一版小 → 失败。版本号只能往前。

## 6. GitHub → Gitee 同步

在 Gitee 仓库的「管理 → 仓库镜像管理」里绑定 GitHub 仓库，开启自动拉取。

⚠️ **顺序很重要**：GitHub 收到 push → CI 生成并提交 `index.json` → Gitee 定时拉取。
所以 Gitee 上的索引天然会**慢一个同步周期**。这没问题：App 端两个源各自独立回退，
拿到旧索引只是少几个新插件，`sha256` 仍然对得上，不会装坏。

## 7. App 侧行为（供排查问题参考）

- 主源 `raw.githubusercontent.com/yafoo/pushme-plugin/master/`，
  备源 `gitee.com/yafu/pushme-plugin/raw/master/`，**各自独立回退**。
- 索引会缓存到本地，断网时商店页仍能列出插件，但装不了。
- 安装流程：下载 → 归一化 → 校验 sha256 → 校验函数形式 → 写库 → 广播 `refresh_plugins`。
- 更新**保留**插件在列表里的排序和启停状态，不会重置。
- 如果用户手动改过商店插件的内容，更新弹窗会提示「会覆盖你的改动」。
- `@dependencies` 只是**提示**，不会自动帮用户打开对应的内置方法；
  所以插件里调用前应该判断存在性，例如 `if (typeof PMF.toast !== 'function') return next()`。
