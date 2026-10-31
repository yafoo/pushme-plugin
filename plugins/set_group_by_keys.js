/**
 * @key pushme.set_group_by_keys
 * @name 智能设置分组
 * @description 按环境变量里配置的关键词给消息打上分组，不用改代码
 * @author yafoo
 * @version 1.1.0
 * @tags 分组
 * @env GROUP_RULES
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    // GROUP_RULES 格式：分组A=词1,词2;分组B=词3
    // 规则放在环境变量里而不是代码里：改代码会让商店把插件标成「本地已修改」，
    // 下次更新时用户的规则会被直接覆盖掉。
    const rules = String(ENV.GROUP_RULES || '').trim()
    if (!rules) return next()

    // 数据类消息不走通知，分组对它们没有意义
    if (['data', 'markdata', 'chart', 'echarts', 'svg', 'note'].indexOf(msg.type) >= 0) return next()

    const title = String(msg.title || '')
    // 已经有分组就不覆盖（通知监听转发进来的消息本来就有 [#应用名]）
    if (/\[#[^!\]]+\]/.test(title)) return next()

    const text = title + '\n' + String(msg.content || '')

    const hit = rules.split(/[;；\n]+/).map(function(rule) {
        const index = rule.indexOf('=')
        if (index < 0) return null
        return {
            name: rule.slice(0, index).trim(),
            words: rule.slice(index + 1).split(/[,，\s]+/).filter(Boolean)
        }
    }).filter(function(rule) {
        return rule && rule.name && rule.words.some(function(word) {
            return text.indexOf(word) >= 0
        })
    })[0]

    if (!hit) return next()

    msg.title = '[#' + hit.name + ']' + title
    next()
}
