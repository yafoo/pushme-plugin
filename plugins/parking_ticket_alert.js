/**
 * @key pushme.parking_ticket_alert
 * @name 交警贴条提醒
 * @description 短信里出现车牌号或「交警」就切到指定通道，配合该通道的语音播报 + 重复通知做到循环提醒
 * @author yafoo
 * @version 1.0.0
 * @tags 通知
 * @env ALERT_CHANNEL, PLATE_EXTRA
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    // 取出可读正文。
    // 「通知监听」转发进来的消息（短信 App 的通知也走这条链路）正文是一坨事件 JSON，
    // 已经装过「通知转文本」的则已经是普通文本 —— 两种都要能处理，不然插件顺序一换就失效。
    let text = String(msg.content || '')
    let fromNotify = msg.type === 'notify'

    if (fromNotify) {
        try {
            const event = JSON.parse(text)
            text = [event.title, event.content, event.subText].filter(Boolean).join('\n')
        } catch (e) {
            // 不是 JSON 就当普通文本继续判断
            fromNotify = false
        }
    }
    if (!text) return next()

    // 车牌：省份简称 + 字母 + 5~6 位，末尾允许 挂/学/警/港/澳（新能源 8 位也在这个范围内）
    const PLATE = /[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]/

    const extra = String(ENV.PLATE_EXTRA || '').split(/[,，\s]+/).filter(Boolean)
    const hitPlate = PLATE.test(text) || extra.some(function(plate) {
        return text.indexOf(plate) >= 0
    })
    const hitPolice = text.indexOf('交警') >= 0

    // 两个条件都没命中就交给下一个插件
    if (!hitPlate && !hitPolice) return next()

    // 通道名要和 App 里配好的通道一致：语音播报、重复通知都是按通道名存的设置
    const channel = String(ENV.ALERT_CHANNEL || '交警').trim() || '交警'

    // 通道标记可以放在标题任意位置，已经指定过通道就不覆盖
    const title = String(msg.title || '')
    if (!/\[~[^\]]+\]/.test(title)) msg.title = title + '[~' + channel + ']'

    // 没主题时补一个告警色，通知列表里更容易看见
    if (!/^\[[iswfISWF]\]/.test(String(msg.title || ''))) msg.title = '[w]' + msg.title

    // 还没被转成文本的，顺手转掉，否则消息详情里看到的还是一坨 JSON
    if (fromNotify) {
        msg.content = text
        msg.type = 'text'
    }

    next()
}
