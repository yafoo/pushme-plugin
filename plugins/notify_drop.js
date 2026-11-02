/**
 * @key pushme.notify_drop
 * @name 丢弃未处理通知
 * @description 放在插件列表最后。经过前面所有插件后仍是 notify 类型的消息（没有被通知转文本等插件接管），改成 task 让 App 丢弃，不在消息列表里留 JSON 垃圾
 * @author yafoo
 * @version 1.0.0
 * @tags 通知
 * @param {Object} msg - 消息对象
 * @param {Function} next - 下一个插件
 */
function(msg, next) {
    // 只处理通知监听转发进来、且经过前面所有插件后仍未被接管的 notify 消息。
    // 改成 task 后，App 在 processMessage 里找不到 type=task 的处理器会直接丢弃（return null），
    // 不会入库也不会弹通知——等于是把没用的通知静默扔掉。
    //
    // 必须排在插件列表最后：
    //   通知转文本 → 分组 → 通道 → … → 丢弃未处理通知
    // 排前面会把所有 notify 消息全杀了，后面的插件根本看不到。
    if (msg.type === 'notify') {
        msg.type = 'task'
    }
    next()
}
