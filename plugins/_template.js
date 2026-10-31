/**
 * @key pushme.template
 * @name 模板（不会出现在商店里）
 * @description 复制这个文件改成 plugins/xxx.js 开始写，_ 开头的文件 gen-index.js 会跳过
 * @author yafoo
 * @version 0.0.0
 * @tags 模板
 * @dependencies PMF.toast
 * @env DEMO_KEY
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    // ============ 硬性约束（违反会导致所有插件一起失效） ============
    // 1. 整个文件是**一个裸函数表达式**，末尾不要加分号
    // 2. 不要在函数外面声明任何变量/函数：所有插件会被拼进同一个 JS 程序，
    //    重名的 const / let / function 会直接语法错误
    // 3. 不能用 require( / module.exports
    // 4. 改代码就要升 @version，否则用户永远收不到更新

    // ============ 只处理自己关心的消息 ============
    // 不调 next() 就等于截断，后面的插件都不会执行
    if (msg.type !== 'text') return next()

    // ============ 读环境变量 ============
    // 密钥之类的配置一律放环境变量，别写进代码（写进来等于公开）
    const keyword = String(ENV.DEMO_KEY || '').trim()
    if (!keyword) return next()

    // ============ 改标题 ============
    // 主题 [i]/[s]/[w]/[f] 必须在标题最前面；分组 [#分组] 和通道 [~通道] 可以放任意位置；
    // 分组带头像写成 [#分组!头像URL]
    if (String(msg.title || '').indexOf(keyword) >= 0) {
        msg.title = '[w]' + msg.title
    }

    // ============ 改类型 ============
    // 可选值：text / markdown / html / url / data / markdata / chart / echarts / svg / note
    // 数据类（后六个）不弹通知，只进 App
    // msg.type = 'markdown'

    // ============ 内置方法（记得在文件头 @dependencies 里声明，并在 App 里开启） ============
    // PMF.md5(str)
    // PMF.base64.encode(str) / PMF.base64.decode(str, 0)
    // PMF.aes.encrypt(data, key) / PMF.aes.decrypt(data, key)
    // PMF.rsa.encrypt(data, publicKey) / PMF.rsa.decrypt(data, privateKey)
    // PMF.toast(text, 0)  0=短 1=长
    // PMF.fetch.get/post(url, JSON.stringify(options))  同步，会卡住消息链路
    // PMF.fetch.asyncPost(url, JSON.stringify(options)) 异步，改不了 msg
    // 用之前先判断存不存在：typeof PMF.toast === 'function'
    if (ENV.DEMO_TOAST === '1' && typeof PMF.toast === 'function') {
        PMF.toast(msg.title, 0)
    }

    // ============ 交给下一个插件 ============
    next()
}
