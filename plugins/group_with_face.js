/**
 * @key pushme.group_with_face
 * @name 分组头像
 * @description 按分组名给消息挂上头像，用 [#分组!头像URL] 语法，头像会被下载缓存
 * @author yafoo
 * @version 1.0.0
 * @tags 分组
 * @env FACE_RULES
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    const rules = String(ENV.FACE_RULES || '').trim()
    if (!rules) return next()

    const title = String(msg.title || '')
    // 只处理「已经有分组、但还没头像」的标题；已经带 !头像 的跳过
    const matched = /\[#([^!\]]+)\]/.exec(title)
    if (!matched) return next()

    const group = matched[1].trim()

    // FACE_RULES 格式：分组A=https://a.png;分组B=https://b.png
    const hit = rules.split(/[;；\n]+/).map(function(rule) {
        const index = rule.indexOf('=')
        if (index < 0) return null
        return {
            group: rule.slice(0, index).trim(),
            face: rule.slice(index + 1).trim()
        }
    }).filter(function(rule) {
        return rule && rule.group === group && rule.face
    })[0]

    if (!hit) return next()

    // [#分组!头像地址]，! 后面是头像 URL，App 会下载并缓存到本地
    msg.title = title.replace(matched[0], '[#' + group + '!' + hit.face + ']')
    next()
}
