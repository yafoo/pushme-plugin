/**
 * @key pushme.parking_ticket_alert
 * @name 交警贴条提醒
 * @description 短信里出现车牌号或「交警」就切到指定通道，并把车牌所在的那句话提取成标题
 * @author yafoo
 * @version 1.1.0
 * @tags 通知
 * @env ALERT_CHANNEL, PLATE_EXTRA, TITLE_MAX
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

    // 命中的车牌：优先用正文里匹配到的那个，其次用环境变量里配的
    let plate = ''
    const plateMatch = PLATE.exec(text)
    if (plateMatch) plate = plateMatch[0]
    if (!plate) {
        for (let i = 0; i < extra.length; i++) {
            if (text.indexOf(extra[i]) >= 0) {
                plate = extra[i]
                break
            }
        }
    }
    const hitPolice = text.indexOf('交警') >= 0

    // 两个条件都没命中就交给下一个插件
    if (!plate && !hitPolice) return next()

    // 通道名要和 App 里配好的通道一致：语音播报、重复通知都是按通道名存的设置
    const channel = String(ENV.ALERT_CHANNEL || '交警').trim() || '交警'

    // ---- 把正文按句末标点切成句子 ----
    // 辅助函数必须写在 function 内部：所有插件共用一个 JS 程序，
    // 在函数外声明 const/function 会和别的插件撞名，整段代码直接语法错误。
    const splitSentence = function(str) {
        return String(str || '')
            .replace(/([。！？!?；;\n])/g, '$1\u0001')
            .split('\u0001')
            .map(function(part) {
                return part.trim()
            })
            .filter(Boolean)
    }

    // 洗掉短信里那些没用的前缀：[2条]、【河南省交警】、[中国移动]……
    const cleanSentence = function(str) {
        let out = String(str || '')
        let prev = ''
        while (out !== prev) {
            prev = out
            out = out.replace(/^(\[[^\]\n]{0,20}\]|【[^】\n]{0,20}】)[\s\u3000]*/, '')
        }
        return out
            .replace(/^[，,、:：;；。\s]+/, '')
            .replace(/[，,、\s]+$/, '')
            .replace(/[。！？!?；;]$/, '')
            .replace(/\s+/g, ' ')
            .trim()
    }

    // 先找含车牌的那句，没有就退到含「交警」的那句
    const pickSentence = function(str, key) {
        const list = splitSentence(str)
        const keys = [key, '交警'].filter(Boolean)
        for (let k = 0; k < keys.length; k++) {
            for (let i = 0; i < list.length; i++) {
                if (list[i].indexOf(keys[k]) >= 0) return cleanSentence(list[i])
            }
        }
        return ''
    }

    const sentence = pickSentence(text, plate)

    // 原标题里的标记要留着：主题、分组、通道。
    // 原标题正文（短信里就是发送号码）直接丢掉，换成上面提取出来的那句话。
    const oldTitle = String(msg.title || '')
    const prefix = []
    const themeMatch = /^\s*\[([iswfISWF])\]/.exec(oldTitle)
    if (themeMatch) prefix.push('[' + themeMatch[1].toLowerCase() + ']')

    const markerPattern = /\[#[^\]]*\]|\[~[^\]]*\]/g
    let marker = markerPattern.exec(oldTitle)
    while (marker !== null) {
        prefix.push(marker[0])
        marker = markerPattern.exec(oldTitle)
    }
    // 主题必须在标题最前面，没有就补一个告警色
    if (!themeMatch) prefix.unshift('[w]')

    if (sentence) {
        // 标题太长在通知栏里也显示不全，超了就截断（TITLE_MAX=0 表示不截断）
        let title = sentence
        let max = parseInt(ENV.TITLE_MAX, 10)
        if (isNaN(max)) max = 60
        if (max > 0 && title.length > max) {
            title = title.slice(0, max).replace(/[，,、\s]+$/, '') + '…'
        }

        // 通道标记放句子后面读起来更顺；已经指定过通道就不重复加
        const suffix = /\[~[^\]]+\]/.test(oldTitle) ? '' : '[~' + channel + ']'
        msg.title = prefix.join('') + title + suffix
    } else {
        // 正文是一整段没有标点的文字、提不出句子时，退回原来的行为
        if (!/\[~[^\]]+\]/.test(oldTitle)) msg.title = oldTitle + '[~' + channel + ']'
        if (!/^\[[iswfISWF]\]/.test(String(msg.title || ''))) msg.title = '[w]' + msg.title
    }

    // 还没被转成文本的，顺手转掉，否则消息详情里看到的还是一坨 JSON
    if (fromNotify) {
        msg.content = text
        msg.type = 'text'
    }

    next()
}
