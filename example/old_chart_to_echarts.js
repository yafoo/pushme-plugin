/**
* @name 消息type转换
* @description PushMe3.0将原chart消息改为echarts，如果服务端不想改，可以借助此插件进行自动转换
* @param {Object} msg - 消息体
* @param {String} msg.title - 消息标题
* @param {String} msg.content - 消息内容
* @param {String} msg.date - 消息时间
* @param {String} msg.type - 消息类型
* @param {Function} next - 下一个插件
*/
function(msg, next) {
    if(msg.type == 'chart' && msg.content.slice(0, 1) == '{') {
        msg.type = 'echarts';
    }
    next();
}