/**
 * @key pushme.daily_checkin
 * @name 每日签到
 * @description 配合「定时任务」每天固定时间触发：自动请求签到接口；没配接口就退化成一条可点开的签到提醒
 * @author yafoo
 * @version 1.0.0
 * @tags 定时任务
 * @dependencies PMF.fetch
 * @env CHECKIN_API, CHECKIN_METHOD, CHECKIN_BODY, CHECKIN_HEADERS, CHECKIN_KEYWORD, CHECKIN_LINK, CHECKIN_TIP, CHECKIN_TASK_KEYWORD
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    // 只接管定时任务触发的消息。task 是中间类型，没有插件接管时 App 会**直接丢弃**这条消息。
    if (msg.type !== 'task') return next()

    // 只接管「任务名里带关键词」的定时任务，这样同一个 App 里还能有别的定时任务
    // （比如交给「定时任务转待办」处理），不会被这个插件抢走。
    const taskKeyword = String(ENV.CHECKIN_TASK_KEYWORD || '签到').trim()
    if (taskKeyword) {
        const title = String(msg.title || '')
        if (title.indexOf(taskKeyword) < 0 && String(msg.content || '').indexOf(taskKeyword) < 0) {
            return next()
        }
    }

    // 主题标记必须在标题最前面，已经有主题就不覆盖
    const withTheme = function(title, theme) {
        const text = String(title || '')
        return /^\[[iswfISWF]\]/.test(text) ? text : '[' + theme + ']' + text
    }

    const api = String(ENV.CHECKIN_API || '').trim()
    const link = String(ENV.CHECKIN_LINK || '').trim()
    const tip = String(ENV.CHECKIN_TIP || '').trim() || '该签到了'

    // ============ 用法一：没配接口（或没开 PMF.fetch）时，只当提醒 ============
    // 适合需要验证码、扫码签到的站点：把签到页地址填进 CHECKIN_LINK，通知点一下就能跳过去。
    const canFetch = PMF.fetch && typeof PMF.fetch.post === 'function'
    if (!api || !canFetch) {
        msg.content = tip
        if (link) msg.content += '\n\n[去签到](' + link + ')'
        msg.type = 'markdown'
        msg.title = withTheme(msg.title, 'i')
        return next()
    }

    // ============ 用法二：配了接口就真的去签 ============
    // 这里**必须用同步 fetch**：只有拿到返回值才能把结果写进消息。
    // 代价是会卡住消息链路（这段时间消息不入库、不通知），所以超时给短一点，
    // 签到失败也不是什么大事，下一个插件照常执行。
    const method = String(ENV.CHECKIN_METHOD || 'POST').trim().toUpperCase()

    const headers = { 'User-Agent': 'PushMe' }
    try {
        // CHECKIN_HEADERS 是 JSON，通常用来带 Cookie / Authorization
        const custom = JSON.parse(String(ENV.CHECKIN_HEADERS || '{}'))
        Object.keys(custom).forEach(function(key) {
            headers[key] = custom[key]
        })
    } catch (e) {
        // 头配置写错了就用默认的，别因为配置错误让整条链报错
    }

    const options = JSON.stringify({
        headers: headers,
        body: String(ENV.CHECKIN_BODY || ''),
        timeout: 15000
    })

    let response = ''
    try {
        response = method === 'GET' ? PMF.fetch.get(api, options) : PMF.fetch.post(api, options)
    } catch (e) {
        response = ''
    }

    let result = null
    try {
        result = JSON.parse(String(response || ''))
    } catch (e) {
        result = null
    }

    const status = result ? Number(result.status) : -1
    const raw = result ? String(result.body || '') : ''
    const keyword = String(ENV.CHECKIN_KEYWORD || '').trim()

    // 判定成功：配了关键词就看返回里有没有它（很多站点用 200 表示「已经签过了」），
    // 没配就看 HTTP 状态码。
    const ok = keyword ? raw.indexOf(keyword) >= 0 : (status >= 200 && status < 300)

    const lines = [ok ? '签到成功（HTTP ' + status + '）' : '签到失败（HTTP ' + status + '）']
    if (raw) {
        // 返回的可能是整页 HTML，截断，别把消息撑爆
        lines.push(raw.trim().slice(0, 300))
    }
    if (link) lines.push('[去签到](' + link + ')')

    msg.content = lines.join('\n\n')
    msg.type = 'markdown'
    msg.title = withTheme(msg.title, ok ? 's' : 'f')
    next()
}
