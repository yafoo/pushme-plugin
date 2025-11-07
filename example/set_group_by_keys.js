/**
* @name 消息分组
* @description 根据标题或内容中包含的关键词设置消息分组
* @param {Object} msg - 消息体
* @param {String} msg.title - 消息标题
* @param {String} msg.content - 消息内容
* @param {String} msg.date - 消息时间
* @param {String} msg.type - 消息类型
* @param {Function} next - 下一个插件
*/
function(msg, next) {
    if(!['', 'text', 'markdown', 'html'].includes(msg.type)) return next();
    if(/\[#.+\]/.test(msg.title)) return next();
    
    const group = Object.entries({
        '分组名字': ['关键词1', '关键词2', '关键词3'],
        '我的分组': ['关键词4', '关键词5', '关键词6']
    }).find(([_, words]) => words.some(word => msg.title.includes(word) || msg.content.includes(word)))?.[0];
    
    if(group) msg.title = `[#${group}]${msg.title}`;
    next();
}