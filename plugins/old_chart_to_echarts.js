/**
 * @key pushme.old_chart_to_echarts
 * @name 消息type转换
 * @description 把 chart 类型改成 echarts（正文需已经是 ECharts option 的 JSON），服务端不用改推送格式
 * @author yafoo
 * @version 1.0.1
 * @tags 类型转换
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    if (msg.type !== 'chart') return next()

    // 先 trim：服务端拼出来的 JSON 前面经常带换行或空格
    const content = String(msg.content || '').trim()
    if (content.charAt(0) !== '{') return next()

    // 不是合法 JSON 就别乱改类型，否则 App 那边渲染出来是一片空白
    try {
        JSON.parse(content)
    } catch (e) {
        return next()
    }

    msg.content = content
    msg.type = 'echarts'
    next()
}
