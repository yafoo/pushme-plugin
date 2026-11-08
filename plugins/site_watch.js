/**
 * @key pushme.site_watch
 * @name 网站监控
 * @description 配合「定时任务」定时检测一批网址，只有出现非 200（或请求失败）时才发通知，全部正常就静默
 * @author yafoo
 * @version 1.0.0
 * @tags 定时任务
 * @dependencies PMF.fetch
 * @env WATCH_URLS, WATCH_TASK_KEYWORD, WATCH_TIMEOUT, WATCH_BODY_KEYWORD, WATCH_OK_MODE, WATCH_TITLE, WATCH_GROUP
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    // 只接管定时任务触发的消息。task 是中间类型：没有插件接管时 App 会**直接丢弃**这条消息。
    if (msg.type !== 'task') return next()

    // 只接管「任务名里带关键词」的定时任务，这样同一个 App 里还能有别的定时任务
    // （比如交给「定时任务转待办」处理），不会被这个插件抢走。
    const taskKeyword = String(ENV.WATCH_TASK_KEYWORD || '监控').trim()
    if (taskKeyword) {
        const title = String(msg.title || '')
        if (title.indexOf(taskKeyword) < 0 && String(msg.content || '').indexOf(taskKeyword) < 0) {
            return next()
        }
    }

    // 没开 PMF.fetch 就什么都做不了，安静放行（task 会被 App 丢弃，不会报错）
    if (!PMF.fetch || typeof PMF.fetch.get !== 'function') return next()

    // ============ 解析要监控的地址 ============
    // 换行、逗号、分号、空格都当分隔符，方便在环境变量里一行一个地写
    const urls = String(ENV.WATCH_URLS || '')
        .split(/[\s,;，；]+/)
        .map(function(item) { return item.trim() })
        .filter(function(item) { return /^https?:\/\//i.test(item) })

    // 一个地址都没配就放行，别发一条「监控异常：没配地址」的垃圾通知
    if (urls.length === 0) return next()

    let timeout = parseInt(ENV.WATCH_TIMEOUT, 10)
    if (isNaN(timeout) || timeout <= 0) timeout = 2000

    // 可选：返回内容里必须包含这个关键词才算正常。
    // 用来识别「HTTP 200 但其实是登录页 / 维护页」这种假正常。
    const bodyKeyword = String(ENV.WATCH_BODY_KEYWORD || '').trim()

    const headers = { 'User-Agent': 'PushMe-SiteWatch' }

    // ============ 逐个检测 ============
    // 必须用**同步 fetch**：只有拿到返回值才能把结果写进消息。
    // 代价是会卡住消息链路（这段时间消息不入库、不通知），耗时 ≈ 地址数 × 超时，
    // 所以默认超时压到 2 秒，地址也别配太多；站点响应慢就调大 WATCH_TIMEOUT。
    const results = []
    let failed = 0

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i]
        let response = ''
        try {
            response = PMF.fetch.get(url, JSON.stringify({
                headers: headers,
                timeout: timeout
            }))
        } catch (e) {
            response = ''
        }

        let result = null
        try {
            result = JSON.parse(String(response || ''))
        } catch (e) {
            result = null
        }

        // status = -1 是请求本身失败（DNS、超时、证书错误…），也当异常处理
        const status = result ? Number(result.status) : -1
        const body = result ? String(result.body || '') : ''
        let reason = ''

        if (status === -1) {
            reason = '请求失败' + (result && result.statusText ? '（' + result.statusText + '）' : '')
        } else if (status !== 200) {
            reason = 'HTTP ' + status + (result && result.statusText ? ' ' + result.statusText : '')
        } else if (bodyKeyword && body.indexOf(bodyKeyword) < 0) {
            reason = 'HTTP 200 但内容里没有「' + bodyKeyword + '」'
        }

        if (reason) {
            failed++
            results.push('- ' + url + ' — ' + reason)
        } else {
            results.push('- ' + url + ' — 正常')
        }
    }

    // ============ 全部正常：默认静默 ============
    if (failed === 0) {
        const mode = String(ENV.WATCH_OK_MODE || 'drop').trim().toLowerCase()

        // drop：保持 task 类型，App 直接丢弃这条消息（默认，不打扰）
        if (mode !== 'markdata' && mode !== 'text') return next()

        msg.content = '检查了 ' + urls.length + ' 个地址，全部正常\n\n' + results.join('\n')
        msg.type = mode
        msg.title = '网站正常（' + urls.length + ' 个）'
        return next()
    }

    // ============ 有异常：发通知 ============
    const lines = ['检查了 ' + urls.length + ' 个地址，' + failed + ' 个异常', '']
        .concat(results)

    msg.content = lines.join('\n')
    msg.type = 'markdown'

    // 标题重组：原样保留分组/通道标记，主题标记必须在最前面
    const oldTitle = String(msg.title || '')
    const marks = []
    const themeMatch = /^\s*\[([iswfISWF])\]/.exec(oldTitle)
    const markerPattern = /\[#[^\]]*\]|\[~[^\]]*\]/g
    let marker = markerPattern.exec(oldTitle)
    while (marker !== null) {
        marks.push(marker[0])
        marker = markerPattern.exec(oldTitle)
    }

    // WATCH_GROUP 可以把分组换掉（比如从「定时任务」换成「监控」），不配就保留原来的
    const group = String(ENV.WATCH_GROUP || '').trim()
    let finalMarks = marks
    if (group) {
        finalMarks = marks.filter(function(item) { return item.indexOf('[#') !== 0 })
        finalMarks.unshift('[#' + group + ']')
    }

    const baseTitle = String(ENV.WATCH_TITLE || '').trim() || '网站监控异常'
    const suffix = failed === urls.length ? '' : ' (' + failed + '/' + urls.length + ')'

    msg.title = (themeMatch ? '[' + themeMatch[1].toLowerCase() + ']' : '[f]') +
        finalMarks.join('') + baseTitle + suffix

    next()
}
