/**
* @name 智能主题
* @description 根据消息标题文字，自动设置主题
* @param {Object} msg - 消息体
* @param {String} msg.title - 消息标题
* @param {String} msg.content - 消息内容
* @param {String} msg.date - 消息时间
* @param {String} msg.type - 消息类型
* @param {Function} next - 下一个插件
*/
function(msg, next) {
    if(!['', 'text', 'markdown', 'html'].includes(msg.type)) return next();
    if(/^\[[iswf]\]/.test(msg.title)) return next();
    
    const theme = Object.entries({
        f: ['失败', '错误', '异常', '失效', '过期', '不存在'],
        w: ['告警', '警告', '通知', '提示', '提醒'],
        s: ['成功', '完成'],
        i: ['消息', '信息']
    }).find(([_, words]) => words.some(word => msg.title.includes(word)))?.[0];
    
    if(theme) msg.title = `[${theme}]${msg.title}`;
    next();
}