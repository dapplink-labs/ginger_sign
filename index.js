const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');
const query = require('querystring');
let iv = '2624750004598718';
const readline = require('readline');
const mnemonic = require('./mnemonic/word');
const UUID = require('uuid');
const addr = require('./address/generateAddress');
const en = require('./address/encrypt');
const coin = path.join(process.cwd(), './static', 'coin.db');
let db = new sqlite3.Database(coin);
let key = '1234567890123456';


db.serialize(() => {
    if (!fs.existsSync(coin)) {
        db.run("CREATE TABLE word(word_id varchar(128), mnemonic_code varchar(256));");
        db.run("CREATE TABLE account(address_id varchar(128), secret varchar(256), address varchar(80));");
    }
});

function readSyncByRl(tips) {
    tips = tips || '> ';
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            //output: process.stdout
        });
        rl.question(tips, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

readSyncByRl('请输入密码').then((res) => {
    key = res
});

let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

// 接口请求
app.post('/mnemonic', (req, res) => {
    let { number, language,  passwd } = req.body;
    let obj = {
        number:number,
        language:language,
        passwd:passwd
    };
    words(obj).then((e) => {
        res.send(e)
    }).catch((e) => {
        res.send('')
    })
});

app.post('/export', (req, res) => {
    let {sequence, language} = req.body;
    let obj = {
        sequence:sequence,
        language:language
    };
    exportWord(obj).then((e) => {
        res.send(e)
    }).catch((e) => {
        res.send('')
    })
});

app.post('/address', (req, res) => {
    let {sequence, coinType, number, bipNumber, receiveOrChange, coinMark, language, passwd} = req.body;
    let obj = {
        sequence:sequence,
        coinType:coinType,
        number:number,
        bipNumber:bipNumber,
        receiveOrChange:receiveOrChange,
        coinMark:coinMark,
        language:language,
        passwd:passwd,
    };
    generateAddr(obj).then((e) => {
        res.send(e)
    }).catch((e) => {
        res.send('')
    })
});

app.post('/import', (req, res) => {
    let {mnemonic, language, passwd, coinType, number, bipNumber, receiveOrChange, coinMark} = req.body;
    let obj = {
        word:mnemonic,
        language:language,
        passwd:passwd,
        coinType:coinType,
        number:number,
        bipNumber:bipNumber,
        receiveOrChange:receiveOrChange,
        coinMark:coinMark
    }
    importMnemonic(obj).then((e) => {
        res.send(e)
    }).catch((e) => {
        res.send('')
    })
});

// 签名函数
app.post('/sign', (req, res) => {

});

// 具体函数实现
const words = (data) => {
    let { number, language, passwd } = data;
    return new Promise((resolve, reject) => {
        number ? null : reject('请填写你的 number');
        language ? null : reject('请填写你的 number');
        passwd ? null : reject('请填写你的 number');
        let uid = UUID.v1();
        let words = mnemonic.createHelpWord(number, language);
        let encrptWord = mnemonic.wordsToEntropy(words, language);
        setMnemonicCode(uid, encrptWord);
        resolve({sequence:uid, mnemonic:words});
    });
};

const exportWord = (data) => {
    let { sequence, language } = data;
    return new Promise((resolve, reject) => {
        sequence ? null : reject('请填写你的 sequence');
        language ? null : reject('请填写你的 language');
        getWords(sequence).then((mnemonicCode) => {
            let words = mnemonic.entropyToWords(mnemonicCode, language);
            mnemonicCode = null;
            resolve({uuid:sequence, word:words});
        }).catch((e) => {
            reject(e.message)
        })

    })
};

const generateAddr = (data) => {
    let {sequence, coinType, number, bipNumber, receiveOrChange, coinMark, language, passwd} =data;
    return new Promise((resolve, reject) => {
        console.log("data = ", data)
        sequence ? null : reject('请填写你的 sequence');
        coinType ? null : reject('请填写你的 coinType');
        number ? null : reject('请填写你的 number');
        bipNumber ? null : reject('请填写你的 bipNumber');
        receiveOrChange ? null : reject('请填写你的 receiveOrChange');
        coinMark ? null : reject('请填写你的 coinMark');
        language ? null : reject('请填写你的 language');
        passwd ? null : reject('请填写你的 passwd');
        getWords(sequence).then((mnemonicCode) => {
            let words = mnemonic.entropyToWords(mnemonicCode, language);
            let seed = mnemonic.mnemonicToSeed(words, passwd);
            console.log("seed = ", seed);
            let addressParmas = {
                "seed":seed,
                "coinType":coinType,
                "number":number,
                "bipNumber":bipNumber,
                "receiveOrChange":receiveOrChange,
                "coinMark":coinMark
            };
            let addrs = addr.blockchainAddress(addressParmas);
            console.log("addr = ", addrs.address);
            setAddressKey(UUID.v1(), en(key, iv, addrs.privateKey), addrs.address);
            mnemonicCode = null;
            words = null;
            seed = null
            resolve({address:addrs.address});
        }).catch((e) => {
            reject(e.message)
        })
    });
};

const importMnemonic = (data) => {
    let {word, language, passwd, coinType, number, bipNumber, receiveOrChange, coinMark} =data;
    return new Promise((resolve, reject) => {
        word ? null : reject('请填写你的 mnemonic');
        language ? null : reject('请填写你的 language');
        passwd ? null : reject('请填写你的 passwd');
        coinType ? null : reject('请填写你的 coinType');
        number ? null : reject('请填写你的 number');
        bipNumber ? null : reject('请填写你的 bipNumber');
        receiveOrChange ? null : reject('请填写你的 receiveOrChange');
        coinMark ? null : reject('请填写你的 coinMark');
        language ? null : reject('请填写你的 language');
        let uuid = UUID.v1();
        console.log("uuid =", uuid)
        let encrptWord = mnemonic.wordsToEntropy(word, language);
        setMnemonicCode(uuid, encrptWord);
        let seed = mnemonic.mnemonicToSeed(word, passwd);
        console.log("seed = ", seed);
        let addressParmas = {
            "seed":seed,
            "coinType":coinType,
            "number":number,
            "bipNumber":bipNumber,
            "receiveOrChange":receiveOrChange,
            "coinMark":coinMark
        };
        console.log("addressParmas = ", addressParmas);
        let addrs = addr.blockchainAddress(addressParmas);
        setAddressKey(uuid, en(key, iv, addrs.privateKey), addrs.address);
        uuid = null;
        encrptWord = null;
        seed = null
        resolve({address:addrs.address});

    });
};

const setMnemonicCode = (uuid, seedCode) => {
    return new Promise((resolve, reject) => {
        console.log(uuid, seedCode);
        try {
             db.run(`INSERT INTO word VALUES('${uuid}', '${seedCode}');`);
        } catch (e) {
            reject(e.message);
        }
    });
};

const setAddressKey = (uuid, secret, address) => {
    return new Promise((resolve, reject) => {
        console.log(uuid, secret, address);
        try {
            db.run(`INSERT INTO account VALUES('${uuid}', '${secret}', '${address}');`);
        } catch (e) {
            reject(e.message);
        }
    });
}

const getWords = (sequence) => {
    return new Promise((resolve, reject) => {
        try {
            let db = new sqlite3.Database(path.join(process.cwd(), './static', 'coin.db'), () => {
                sql = "SELECT mnemonic_code FROM word WHERE word_id = '" + sequence + "' LIMIT 1;";
                db.all(sql, (err, res) => {
                    if (!err && res.length == 1){
                        let code = res[0].mnemonic_code;
                        resolve(code);
                        code = null;
                        db = null
                    }else{
                        reject('错误：数据库没有查找到支付地址');
                        db = null
                    }
                })
            })
        } catch (e) {
            reject(e.message);
        }
    });
};

app.listen(9090);
