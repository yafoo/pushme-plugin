/**
 * @key pushme.md5_verify
 * @name 消息验签（md5）
 * @description type 里带 md5 时校验正文签名，通过则去掉签名行，失败给标题打上失败主题
 * @author yafoo
 * @version 1.0.0
 * @tags 安全
 * @dependencies PMF.md5
 * @env MD5_SECRET
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    // 失败标记必须写在标题最前面，否则 App 解析不到主题
    const failTitle = function(title) {
        const text = String(title || '')
        return /^\[[iswfISWF]\]/.test(text)
            ? text.replace(/^\[[iswfISWF]\]/, '[f]')
            : '[f]' + text
    }

    // type 约定：用 + 连接「修饰符 + 真实类型」，如 md5+text、base64+md5+markdown。
    // 不属于修饰符的那一段就是消息真正的类型，处理完要还原回去。
    const parts = String(msg.type || '').split('+').map(function(part) {
        return part.trim().toLowerCase()
    }).filter(Boolean)

    if (parts.indexOf('md5') < 0) return next()
    // 还带着 base64 就先放行：签名是对**解码后**的正文算的，等 base64 插件先处理
    if (parts.indexOf('base64') >= 0) return next()

    msg.type = parts.filter(function(part) {
        return part !== 'md5' && part !== 'base64'
    })[0] || ''

    // 没开启 PMF.md5 就原样放行：签名行留在正文里，至少不会被误判成「校验通过」
    if (typeof PMF.md5 !== 'function') return next()

    const content = String(msg.content || '')
    // 约定：正文 + 空行 + 单独一行 -- + 32 位十六进制签名
    // 签名值 = md5(正文 + MD5_SECRET)，没配 MD5_SECRET 时就是 md5(正文)
    const marker = content.lastIndexOf('\n--\n')
    if (marker < 0) {
        msg.content = '⚠️ 缺少签名，无法校验\n\n' + content
        msg.title = failTitle(msg.title)
        return next()
    }

    const body = content.slice(0, marker)
    const sign = content.slice(marker + 4).trim().toLowerCase()
    const expect = String(PMF.md5(body + String(ENV.MD5_SECRET || ''))).trim().toLowerCase()

    if (sign === expect) {
        msg.content = body
    } else {
        msg.content = '⚠️ 签名校验失败\n\n' + body
        msg.title = failTitle(msg.title)
    }
    next()
}
