/**
 * @key pushme.base64_decode
 * @name 内容解码（base64）
 * @description type 里带 base64 时把正文当 base64 解码，并把真实类型还原回去
 * @author yafoo
 * @version 1.0.0
 * @tags 安全
 * @dependencies PMF.base64
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    // type 约定：用 + 连接「修饰符 + 真实类型」，如 base64+text、base64+md5+markdown
    const parts = String(msg.type || '').split('+').map(function(part) {
        return part.trim().toLowerCase()
    }).filter(Boolean)

    if (parts.indexOf('base64') < 0) return next()

    // 只摘掉 base64 这一节，剩下的原样交给后面的插件（比如 md5 还要接着验签）
    msg.type = parts.filter(function(part) {
        return part !== 'base64'
    }).join('+')

    if (!PMF.base64 || typeof PMF.base64.decode !== 'function') return next()

    const content = String(msg.content || '')
    let decoded = ''
    try {
        // 第二个参数是 Android Base64 的 flags，0 = DEFAULT（会忽略换行和空格）
        decoded = PMF.base64.decode(content, 0)
    } catch (e) {
        decoded = ''
    }

    // 解不出来就保持原样：内容可能只是碰巧长得像 base64
    if (decoded) msg.content = decoded
    next()
}
