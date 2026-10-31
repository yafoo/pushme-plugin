/**
 * @key pushme.plugin_time
 * @name 插件运行时间
 * @description 把整条插件链的耗时附加到标题末尾，建议放在插件列表第一个
 * @author yafoo
 * @version 1.0.2
 * @tags 调试
 * @dependencies PMF.toast
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    // 开始时间
    const start = Date.now()

    // run next plugin
    next()

    // 耗时
    const time = Date.now() - start

    // 附加到标题而不是正文：正文可能是 markdown / html / JSON，
    // 随手改一下就会破坏格式。标题末尾加个后缀不影响分组、通道、主题的解析。
    //
    // 为什么必须放第一个：插件是洋葱模型（compose），列表里第 1 个在最外层 ——
    // next() 之前按列表顺序往里走，next() 之后按倒序往外返回。
    // 只有排第一个，这里量的才是整条链；排在最后的话 next() 后面已经没有插件了，永远是 0ms。
    // 同理，耗时是在所有插件都跑完之后才追加的，所以它看到的标题是最终标题。
    msg.title = String(msg.title || '') + ' (' + time + 'ms)'

    // 想同时弹一条 toast，就把环境变量 PLUGIN_TIME_TOAST 设为 1。
    // 这里必须判断 PMF.toast 是否存在 —— 没开这个内置方法时直接调用会抛错，
    // 整条插件链都会报「插件Error」。
    if (ENV.PLUGIN_TIME_TOAST === '1' && typeof PMF.toast === 'function') {
        PMF.toast('插件运行耗时：' + time + 'ms', 0)
    }
}
