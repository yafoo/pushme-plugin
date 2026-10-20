# 插件商店：仓库侧规范

App 的「插件商店」只认仓库根目录的一份 `index.json`，插件源码本身仍是普通的 `.js` 文件。

## 1. 仓库结构

```
pushme-plugin/
├── index.json                  ← 由 gen-index.js 生成，勿手改
├── plugins/                    ← 所有插件放这里
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
 * @description 在 Toast 里显示整条插件链的耗时
 * @author      yafoo
 * @version     1.0.0
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
| `@dependencies` | 按需 | 用到的内置方法，`PMF.toast、PMF.aes` 或逗号分隔。**安装前会展示给用户**，缺的会提示开启 |
| `@env` | 按需 | 需要用户填的环境变量 key，安装弹窗里会列出来 |

### ⚠️ 三个硬性约束

1. **必须是裸函数表达式**，不能是 `module.exports = function...`，也不能在末尾加分号。
   App 侧是 `plugins.push(<你的源码>)` 的字符串拼接，多一个 `;` 就是语法错误，
   而且会导致**所有插件一起失效**。
   > 安装器会自动去掉末尾多余分号，但请别依赖它。
2. **不能出现 `require(` / `module.exports`**，安装器会直接拒绝。
3. **别把密钥写进代码**。插件能读 `ENV`，密钥应该让用户自己填在环境变量里；
   写进插件源码等于公开。

> 文件头那一段 JSDoc 是**可以带**的：App 在校验「是不是函数表达式」之前会先剥掉开头的注释。
> 但别在函数体后面再追加注释块，拼接时容易踩到分号问题。

## 3. 索引字段

| 字段 | 说明 |
|---|---|
| `schema` | 格式版本，目前固定 `1`。App 遇到更高版本会拒绝解析而不是乱猜 |
| `updatedAt` | 生成时间（ISO 8601），仅展示。内容没变时脚本会沿用旧值，避免无意义提交 |
| `plugins[].key` | 稳定标识，`pushme.xxx`。**App 判断「装没装过 / 能不能更新」全靠它** |
| `version` | 可读版本号 |
| `versionCode` | `major*10000 + minor*100 + patch`，**App 用整数比较**，别用字符串比 `1.10.0` 和 `1.9.0` |
| `minAppVersion` | 最低 App 版本（versionName 形式），留空表示不限 |
| `dependencies` | 同 `@dependencies` |
| `env` | 同 `@env` |
| `file` | 相对仓库根的路径。**不要写绝对 URL**，否则换源就废了 |
| `sha256` | 源码的 sha256，App 安装时校验。**算的是「归一化后」的内容**（统一行尾为 LF、去 BOM、trim、去末尾分号），必须和 App 端 `PluginInstaller.normalize()` 一致，否则每次安装都会报校验失败 |
| `size` | 字节数，仅展示 |

## 4. README 插件列表

README 里两个标记之间的表格由脚本自动生成：

```md
<!-- plugins:start -->
| 插件 | 说明 | 版本 |
| --- | --- | --- |
| [插件运行时间](./plugins/plugin_time.js) | ... | `1.0.0` |
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
