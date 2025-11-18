/**
 * @name AES加解密示例
 * @param {Object} msg - 消息对象
 * @param {String} msg.title - 标题
 * @param {String} msg.content - 内容
 * @param {String} msg.date - 时间
 * @param {String} msg.type - 类型
 * @param {Function} next - 下一个插件
 * @dependencies PMF.toast、PMF.aes
 */
function(msg, next) {
    const key = PMF.aes.getRandomKey()

    msg.title = PMF.aes.encrypt(msg.title, key)
    PMF.toast('加密：' + msg.title)

    msg.title = PMF.aes.decrypt(msg.title, key)
    PMF.toast('解密：' + msg.title)
    next();
}