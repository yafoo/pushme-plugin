/**
 * @key pushme.webhook_forward
 * @name 转发到 Webhook
 * @description 把每条消息 POST 到钉钉/飞书/自建接口，异步发送，不拖慢消息链路
 * @author yafoo
 * @version 1.0.0
 * @tags 转发
 * @dependencies PMF.fetch
 * @env WEBHOOK_URL, WEBHOOK_FORMAT
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    const url = String(ENV.WEBHOOK_URL || '').trim()
    if (!url) return next()

    // 没开启 PMF.fetch 就跳过，别让整条插件链报错。
    // 注意 PMF.fetch 是个**对象**（typeof 是 object），不是函数，别写 typeof PMF.fetch === 'function'
    if (!PMF.fetch || typeof PMF.fetch.asyncPost !== 'function') return next()

    const text = String(msg.title || '') + '\n' + String(msg.content || '')
    const format = String(ENV.WEBHOOK_FORMAT || 'custom').trim().toLowerCase()

    let payload
    if (format === 'dingtalk') {
        // 钉钉群机器人
        payload = { msgtype: 'text', text: { content: text } }
    } else if (format === 'feishu') {
        // 飞书群机器人
        payload = { msg_type: 'text', content: { text: text } }
    } else {
        // 自建接口：原样把消息的四个字段发过去
        payload = { title: msg.title, content: msg.content, date: msg.date, type: msg.type }
    }

    // ⚠️ 必须用 async 版本：同步 fetch 会把消息链路卡住（默认超时 30 秒，
    // 这期间消息不入库、不通知），而转发结果本来就不需要回写 msg。
    // 第二个参数是 **JSON 字符串**，不是对象。
    PMF.fetch.asyncPost(url, JSON.stringify({
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout: 10000
    }))

    next()
}
