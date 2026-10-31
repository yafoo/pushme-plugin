/**
 * @key pushme.notify_to_text
 * @name 通知转文本
 * @description 把「通知监听」转发进来的消息转成普通文本，不再在消息列表里显示一大段 JSON
 * @author yafoo
 * @version 1.0.0
 * @tags 通知
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    // 只接管「通知监听」转发进来的消息（type = notify），其它消息原样放行
    if (msg.type !== 'notify') return next()

    const raw = String(msg.content || '')
    let event
    try {
        event = JSON.parse(raw)
    } catch (e) {
        // 不是合法 JSON 就交给后面的插件（或让 App 自己退化成代码块）
        return next()
    }

    const lines = []
    const content = String(event.content || '').trim()
    const subText = String(event.subText || '').trim()
    const eventTitle = String(event.title || '').trim()

    if (content) lines.push(content)
    // subText 常常是「第 2 条未读」这类补充信息，正文里已经有了就不重复
    if (subText && content.indexOf(subText) < 0) lines.push(subText)
    // 通知本身没内容（只有标题的提醒）时退回标题，避免消息正文是空的
    if (lines.length === 0 && eventTitle) lines.push(eventTitle)

    msg.content = lines.join('\n')

    // 标题为空时用来源应用兜底，否则消息列表里会出现一条没有名字的记录
    if (!String(msg.title || '').trim() && event.appName) {
        msg.title = '[#' + event.appName + ']'
    }

    // 排查问题时可以把环境变量 NOTIFY_KEEP_JSON 设为 1，原始事件 JSON 会附在正文后面
    if (ENV.NOTIFY_KEEP_JSON === '1') msg.content += '\n\n' + raw

    msg.type = 'text'
    next()
}
