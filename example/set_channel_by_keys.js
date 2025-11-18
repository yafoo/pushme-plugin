/**
* @name 智能设置通道
* @description 根据标题或内容中包含的关键词设置消息通道
* @param {Object} msg - 消息体
* @param {String} msg.title - 消息标题
* @param {String} msg.content - 消息内容
* @param {String} msg.date - 消息时间
* @param {String} msg.type - 消息类型
* @param {Function} next - 下一个插件
*/
function(msg, next) {
    if(!['', 'text', 'markdown', 'html'].includes(msg.type)) return next();
    if(/\[~.+\]/.test(msg.title)) return next();
    
    const channel = Object.entries({
        '特别消息': ['关键词1', '关键词2', '关键词3'],
        '重要消息': ['关键词4', '关键词5', '关键词6']
    }).find(([_, words]) => words.some(word => msg.title.includes(word) || msg.content.includes(word)))?.[0];
    
    if(channel) msg.title = `${msg.title}[~${channel}]`;
    next();
}