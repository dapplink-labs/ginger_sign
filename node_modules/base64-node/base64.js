function base64() {

    this.encode =  function (unencoded) {
        return new Buffer(unencoded).toString('base64');
    };

    this.decode = function (encoded) {
        return new Buffer(encoded, 'base64').toString('utf8');
    };

    return this;
}

module.exports = new base64();