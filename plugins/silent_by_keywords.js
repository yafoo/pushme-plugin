/**
 * @key pushme.silent_by_keywords
 * @name 关键词静默
 * @description 命中关键词（且在设定时段内）的消息不弹通知，只安静地进 App
 * @author yafoo
 * @version 1.0.0
 * @tags 免打扰
 * @env SILENT_KEYWORDS, SILENT_TIME
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    // 时段判断。用 msg.date（设备本地时间）而不是 new Date()：
    // QuickJS 里 Date 的时区不一定跟着系统走，可能拿到 UTC 的小时数。
    const inWindow = function(range, date) {
        if (!range) return true
        const m = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(range)
        if (!m) return true

        let cur
        const d = /(\d{1,2}):(\d{2})/.exec(String(date || ''))
        if (d) {
            cur = parseInt(d[1], 10) * 60 + parseInt(d[2], 10)
        } else {
            // 消息没带时间（服务端没传 date）时退回本机时间
            const now = new Date()
            cur = now.getHours() * 60 + now.getMinutes()
        }

        const start = parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
        const end = parseInt(m[3], 10) * 60 + parseInt(m[4], 10)
        // 支持跨零点，比如 23:00-07:00
        return start <= end ? (cur >= start && cur < end) : (cur >= start || cur < end)
    }

    const keywords = String(ENV.SILENT_KEYWORDS || '').trim()
    if (!keywords) return next()

    // 只处理本来会弹通知的消息；图表这类数据消息本来就不弹，不用管
    if (['', 'text', 'markdown', 'html', 'url', 'notify', 'task'].indexOf(msg.type) < 0) return next()

    const words = keywords.split(/[,，;；\s]+/).filter(Boolean)
    const text = String(msg.title || '') + '\n' + String(msg.content || '')
    const hit = words.some(function(word) {
        return text.indexOf(word) >= 0
    })
    if (!hit) return next()

    // 配了 SILENT_TIME 就只在时段内静默；没配则命中关键词就静默
    if (!inWindow(String(ENV.SILENT_TIME || '').trim(), msg.date)) return next()

    // markdata 不弹通知，但照常入库、进小屏和悬浮窗。
    // 注意：转发（RepostManager）会带着 markdata 这个类型一起发出去。
    msg.type = 'markdata'
    next()
}
