/**
 * @key pushme.chart_from_text
 * @name 文本转图表
 * @description 把「标签 数值」的多行文本转成柱状/饼图，服务端不用改推送格式
 * @author yafoo
 * @version 1.1.0
 * @tags 类型转换
 * @env CHART_TYPE, CHART_SIZE
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    // 只处理纯文本消息
    if (msg.type !== '' && msg.type !== 'text') return next()

    const lines = String(msg.content || '').split(/\r?\n/).map(function(line) {
        return line.trim()
    }).filter(Boolean)

    // 至少两行才像数据，单行文本更可能是普通消息
    if (lines.length < 2) return next()

    const label = []
    const list = []

    for (let i = 0; i < lines.length; i++) {
        // 支持「CPU 30」「内存,60」「磁盘：75」这几种写法
        const matched = /^(.+?)\s*[,:：\t ]\s*(-?\d+(?:\.\d+)?)$/.exec(lines[i])
        // 有一行不是「标签 + 数值」就整体放弃，避免把普通文本硬画成图
        if (!matched) return next()
        // 标签里不能出现 , | 和 ::，它们都是 chart 正文的分隔符
        label.push(matched[1].trim().replace(/[,|]+/g, ' ').replace(/\s+/g, ' '))
        list.push(parseFloat(matched[2]))
    }

    // ⚠️ chart 的正文必须是「纯文本」，不是 JSON。
    // 入库时 App 才用 parseChartData 把它解析成 ChartData、再存成 JSON
    // （见 AppDao.addMessage → MessageChart.parseChartData）。
    // 在插件里塞 JSON 字符串的话，解析器会把整段 JSON 当成一个数据点，图直接变成 0。
    // 文本格式：类型|尺寸::数值|标签,数值|标签
    const type = String(ENV.CHART_TYPE || 'bar').trim()
    const size = parseInt(ENV.CHART_SIZE, 10)

    const points = []
    for (let i = 0; i < list.length; i++) {
        points.push(String(list[i]) + '|' + label[i])
    }

    msg.content = type + (size > 0 ? '|' + size : '') + '::' + points.join(',')
    msg.type = 'chart'
    next()
}
