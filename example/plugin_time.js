/**
 * @name 插件运行时间
 * @param {Object} msg - 消息对象
 * @param {String} msg.title - 标题
 * @param {String} msg.content - 内容
 * @param {String} msg.date - 时间
 * @param {String} msg.type - 类型
 * @param {Function} next - 下一个插件
 * @dependencies PMF.toast
 */
function(msg, next) {
    // 开始时间
    const start = Date.now();
    
    // run next plugin
    next();
    
    // 耗时
    const time = Date.now() - start;
    
    // msg.content += "\n插件运行耗时：" + time + 'ms';
    PMF.toast('插件运行耗时：' + time + 'ms');
}