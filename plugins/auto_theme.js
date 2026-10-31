/**
 * @key pushme.auto_theme
 * @name 智能主题
 * @description 根据标题关键词自动打上 失败/告警/成功/信息 主题，关键词可用环境变量覆盖
 * @author yafoo
 * @version 1.1.0
 * @tags 主题
 * @env THEME_RULES
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    // 数据类消息不弹通知，打主题没有意义
    if (['data', 'markdata', 'chart', 'echarts', 'svg', 'note'].indexOf(msg.type) >= 0) return next()

    const title = String(msg.title || '')
    // 已经带主题标记就跳过（大小写都算，否则 [W] 会被再包一层 [w]）
    if (/^\[[iswfISWF]\]/.test(title)) return next()

    // 默认词表。故意不收「通知 / 提示 / 提醒」这类泛词，
    // 否则大部分消息都会被染成告警色，等于没分类。
    const rules = {
        f: ['失败', '错误', '异常', '失效', '过期', '不存在'],
        w: ['告警', '警告'],
        s: ['成功', '完成'],
        i: ['消息', '信息']
    }

    // THEME_RULES 格式：f=失败,出错;w=告警,注意 —— 覆盖默认词表里对应的那一类
    String(ENV.THEME_RULES || '').split(/[;；\n]+/).forEach(function(rule) {
        const index = rule.indexOf('=')
        if (index < 0) return
        const theme = rule.slice(0, index).trim().toLowerCase()
        const words = rule.slice(index + 1).split(/[,，\s]+/).filter(Boolean)
        if (rules[theme] && words.length > 0) rules[theme] = words
    })

    // 判定顺序就是优先级：先失败，再告警、成功、信息
    const themes = ['f', 'w', 's', 'i']
    for (let i = 0; i < themes.length; i++) {
        const hit = rules[themes[i]].some(function(word) {
            return title.indexOf(word) >= 0
        })
        if (hit) {
            // 主题标记必须在标题最前面
            msg.title = '[' + themes[i] + ']' + title
            break
        }
    }
    next()
}
