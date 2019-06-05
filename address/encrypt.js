/**
 * http://www.01happy.com/nodejs-aes-128-cbc/
 * 加密方法
 * @param key      加密key // 16位
 * @param iv       向量
 * @param data     需要加密的数据
 * @returns tring
 */
const crypto = require('crypto');
module.exports = (key, iv, data) => {
    let cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    let crypted = cipher.update(data, 'utf8', 'binary');
    crypted += cipher.final('binary');
    crypted = new Buffer(crypted, 'binary').toString('base64');
    return crypted;
};


