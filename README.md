# pushme-plugin

关于 PushMe APP 及 PushMeClient 的一些示例插件，如果你有好的插件，欢迎提交！

### 项目目录

`/example` 为官方插件目录。

根目录的 `index.json` 是 **App 内置「插件商店」的索引**，由 `gen-index.mjs` 自动生成（push 后 GitHub Actions 会重建并提交），**不要手改**。

### Example

1. [插件运行时间](./example/plugin_time.js)
1. [智能主题](./example/auto_theme.js)
1. [智能设置通道](./example/set_channel_by_keys.js)
1. [智能设置分组](./example/set_group_by_keys.js)
1. [原chart转echarts](./example/old_chart_to_echarts.js)
1. [RSA加解密示例](./example/rsa_demo.js)
1. [AES加解密示例](./example/aes_demo.js)

### 在 App 里使用

打开 PushMe → 插件 → 右上角商店图标，即可浏览并一键安装上面的插件。

### 写一个能进商店的插件

文件头必须带 `@name` 和 `@version`，正文必须是**裸函数表达式**，然后跑一次 `node gen-index.mjs`。
完整规范（含 `@key` / `@dependencies` / `@env`、索引字段、发布流程、GitHub→Gitee 同步）见
[PLUGIN-SPEC.md](./PLUGIN-SPEC.md)。

```bash
node gen-index.mjs   # 重新生成 index.json，会校验版本号是否递增
```
