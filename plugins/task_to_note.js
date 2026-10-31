/**
 * @key pushme.task_to_note
 * @name 定时任务转待办
 * @description 把定时任务触发的消息转成待办清单，每行一个可勾选的待办项
 * @author yafoo
 * @version 1.0.0
 * @tags 定时任务
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    // 只接管定时任务触发的消息（type = task）。
    // 注意：task 是中间类型，没有插件接管时 App 会**直接丢弃**这条消息。
    if (msg.type !== 'task') return next()

    const lines = String(msg.content || '').split(/\r?\n/).map(function(line) {
        return line.trim()
    }).filter(Boolean)

    // 每行一个待办项；已经写成 markdown 任务列表的行原样保留
    const items = lines.map(function(line) {
        return /^[-*+]\s+\[[ xX]\]/.test(line) ? line : '- [ ] ' + line
    })

    msg.content = items.length > 0 ? items.join('\n') : '- [ ] ' + String(msg.title || '')

    // note 是 App 的待办类型：在消息详情里可以直接点勾选，勾选状态会写回消息
    msg.type = 'note'
    next()
}
