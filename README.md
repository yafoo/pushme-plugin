# pushme-plugin

PushMe 官方插件仓库。App 内置的「插件商店」直接读这里的 [`index.json`](./index.json)，
在 App 里点一下就能装，不用手动复制代码。

- GitHub：<https://github.com/yafoo/pushme-plugin>
- Gitee 镜像：<https://gitee.com/yafu/pushme-plugin>

## 插件列表

> 下表由 `node gen-index.js` 自动生成，**请勿手改**。新增插件后跑一次脚本即可。

<!-- plugins:start -->
| 插件 | 说明 | 版本 |
| --- | --- | --- |
| [AES加解密示例](./plugins/aes_demo.js) | 用随机密钥对标题做一次 AES 加密再解密，演示 PMF.aes 用法 | `1.0.0` |
| [智能主题](./plugins/auto_theme.js) | 根据消息标题文字，自动设置主题 | `1.0.0` |
| [消息type转换](./plugins/old_chart_to_echarts.js) | PushMe3.0将原chart消息改为echarts，如果服务端不想改，可以借助此插件进行自动转换 | `1.0.0` |
| [插件运行时间](./plugins/plugin_time.js) | 在 Toast 里显示整条插件链的耗时 | `1.0.0` |
| [RSA加解密示例](./plugins/rsa_demo.js) | 用内置公钥对标题做一次 RSA 加密再解密，演示 PMF.rsa 用法 | `1.0.0` |
| [智能设置通道](./plugins/set_channel_by_keys.js) | 根据标题或内容中包含的关键词设置消息通道 | `1.0.0` |
| [智能设置分组](./plugins/set_group_by_keys.js) | 根据标题或内容中包含的关键词设置消息分组 | `1.0.0` |
<!-- plugins:end -->

## 在 App 里安装

PushMe → 插件 → 右上角商店图标 → 选插件 → 安装。

装完之后可以在插件列表里调整顺序、临时关掉，也可以点进去改代码（改过之后商店会标成「本地已修改」，
再更新时会提示覆盖）。

## 写一个插件

一个插件就是一个 `.js` 文件，放在 [`plugins/`](./plugins) 下。文件头写一段 JSDoc，正文是**裸函数表达式**：

```js
/**
 * @key         pushme.my_plugin
 * @name        我的插件
 * @description 一句话说明这个插件做什么
 * @author      你的名字
 * @version     1.0.0
 * @dependencies PMF.toast
 */
function(msg, next) {
    msg.title = '[#我的分组]' + msg.title
    next()
}
```

`msg` 可以改 `title` / `content` / `type`，`next()` 把消息交给下一个插件。

几条硬性要求，违反的话 App 会拒绝安装：

- **必须是裸函数表达式**，不能是 `module.exports = ...`，也**不要在末尾加分号**。
  App 是把所有插件的源码用 `plugins.push(...)` 拼成**一个** JS 程序跑的，多一个 `;` 就是语法错误，
  而且会让**所有插件一起失效**。
- **不能出现 `require(` / `module.exports`**。
- **改代码就要升 `@version`**，否则用户永远收不到更新（脚本会直接报错拦住你）。
- **别把密钥写进代码**。用 `@env` 声明需要的环境变量，让用户自己填。

`@key` 建议显式写死（`pushme.xxx`）：默认取文件名，**改了文件名就等于换了个插件**，
用户那边会变成装了个新的、旧的还留着。

完整规范（索引字段、`@dependencies` / `@env`、发布流程、GitHub→Gitee 同步）见
[PLUGIN-SPEC.md](./PLUGIN-SPEC.md)。

## 维护本仓库

```bash
node gen-index.js
```

会做三件事：扫描 `plugins/`、重建 `index.json`、刷新上面那张表。
push 之后 GitHub Actions 也会跑一遍并把结果提交回来，所以本地忘了跑也不影响。

脚本会拦住两种手滑：

- 内容改了但 `@version` 没升 → 失败
- `versionCode` 比上一版小 → 失败
