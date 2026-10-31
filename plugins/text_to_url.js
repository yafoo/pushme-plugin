/**
 * @key pushme.text_to_url
 * @name 纯链接转 URL
 * @description 正文就是一个链接时改成 url 类型，点通知直接打开浏览器
 * @author yafoo
 * @version 1.0.0
 * @tags 类型转换
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    // 只处理纯文本消息，别去动 markdown / html 里夹着的链接
    if (msg.type !== '' && msg.type !== 'text') return next()

    const content = String(msg.content || '').trim()
    // 整条消息就是一个链接时才转（前后可以有空白）
    if (!/^https?:\/\/\S+$/i.test(content)) return next()

    msg.content = content
    msg.type = 'url'
    next()
}
