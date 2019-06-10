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
const csign = require('./sign/indexSign');
const en = require('./address/encrypt');
const decrypt = require('./sign/decrypt');
const coin = path.join(process.cwd(), './static', 'coin.db');
let db = new sqlite3.Database(coin);
let key = '1234567890123456';
const _passwd = /^[A-Za-z0-9]{16}$/;


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

// 生成助记词 --1
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

// 导出助记词 --2
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


// 单个私钥导出
app.post('/singleExport', (req, res) => {
    let {address} = req.body;
    let obj = {
        address:address
    };
    singleExportKey(obj).then((e) => {
        res.send(e)
    }).catch((e) => {
        res.send('')
    })
});

// 生成单个币地址 --4
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

// 生成本钱包支持的所有币种地址--5
app.post('/allAddress', (req, res) => {
    let {sequence, number, bipNumber, receiveOrChange, language, passwd} = req.body;
    let obj = {
        sequence:sequence,
        number:number,
        bipNumber:bipNumber,
        receiveOrChange:receiveOrChange,
        language:language,
        passwd:passwd,
    };
    generateAllAddr(obj).then((e) => {
        res.send(e)
    }).catch((e) => {
        res.send('')
    })
});

// 导入助记词生成单个地址--6
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
    };
    importMnemonic(obj).then((e) => {
        res.send(e)
    }).catch((e) => {
        res.send('')
    })
});

// 导入助记词生成该钱包支持的所有币种的地址--6
app.post('/importAll', (req, res) => {
    let {mnemonic, language, passwd, number, bipNumber, receiveOrChange} = req.body;
    let obj = {
        word:mnemonic,
        language:language,
        passwd:passwd,
        number:number,
        bipNumber:bipNumber,
        receiveOrChange:receiveOrChange,
    };
    importMnemonicAll(obj).then((e) => {
        res.send(e)
    }).catch((e) => {
        res.send('')
    })
});

// umi 专用接口
app.post('/create', (req, res) => {
    let { password } = req.body;
    let obj = {
        password:password,
    };
    createAddr(obj).then((e) => {
        res.send(e)
    }).catch((e) => {
        res.send('')
    })
});

// umi 专用接口
app.post('/sign', (req, res) => {
    let { signMark, privateKey, fromAddress, contractAddress, changeAddress, sendFee, addressAmount, utxo,
         gasPrice, gasLimit, nonce, decimal, password} = req.body;
    let obj = {
        signMark:signMark,
        privateKey:privateKey,
        fromAddress:fromAddress,
        contractAddress:contractAddress,
        changeAddress:changeAddress,
        sendFee:sendFee,
        addressAmount:addressAmount,
        utxo:utxo,
        gasPrice:gasPrice,
        gasLimit:gasLimit,
        nonce:nonce,
        decimal:decimal,
        password:password,
    };
    coinSign(obj).then((e) => {
        res.send(e)
    }).catch((e) => {
        res.send('')
    })
});

// generateAllAddr
const generateAllAddr = (data) => {
    let {sequence, number, bipNumber, receiveOrChange, language, passwd} = data;
    return new Promise((resolve, reject) => {
        sequence ? null : reject('请填写你的 sequence');
        number ? null : reject('请填写你的 number');
        bipNumber ? null : reject('请填写你的 bipNumber');
        receiveOrChange ? null : reject('请填写你的 receiveOrChange');
        language ? null : reject('请填写你的 language');
        passwd ? null : reject('请填写你的 passwd');

        getWords(sequence).then((mnemonicCode) => {
            let words = mnemonic.entropyToWords(mnemonicCode, language);
            let seed = mnemonic.mnemonicToSeed(words, passwd);
            let btcParmas = {
                "seed":seed,
                "coinType":"BTC",
                "number":number,
                "bipNumber":bipNumber,
                "receiveOrChange":receiveOrChange,
                "coinMark":"BTC"
            };

            let ethParmas = {
                "seed":seed,
                "coinType":"ETH",
                "number":number,
                "coinMark":"ETH"
            };
            let btcAddr = addr.blockchainAddress(btcParmas);
            let ethAddr = addr.blockchainAddress(ethParmas);
            if(ethAddr != null && btcAddr != null) {
                setAddressKey(UUID.v1(), en(key, iv, btcAddr.privateKey), btcAddr.address);
                setAddressKey(UUID.v1(), en(key, iv, ethAddr.privateKey), ethAddr.address);
                let btcData ={
                    address:btcAddr.address,
                    privateKey:btcAddr.privateKey
                };
                let ethData = {
                    address:ethAddr.address,
                    privateKey:ethAddr.privateKey
                };

                let result = {btc:btcData, eth:ethData};

                resolve({code:200, msg:"success", result:result});
            }
        }).catch((e) => {
            reject(e.message)
        })

    });
};

const singleExportKey = (data) => {
    let { address } = data;
    return new Promise((resolve, reject) => {
        address ? null : reject('请填写你的 address');
        getSecret(address).then((privateKey) => {
            let result = {privateKey:privateKey};
            resolve({code:200, msg:"success", result:result});
        });

    });
};

// 一次行地址生成函数实现
const createAddr = (data) => {
    let { password } = data;
    return new Promise((resolve, reject) => {
        password ? null : reject('请填写你的 password');
        let words = mnemonic.createHelpWord(12, "english");
        if(words != null) {
            let seed = mnemonic.mnemonicToSeed(words, password);
            if(seed != null) {
                let btcParmas = {
                    "seed":seed,
                    "coinType":"BTC",
                    "number":12,
                    "bipNumber":0,
                    "receiveOrChange":"1",
                    "coinMark":"BTC"
                };
                let ethParmas = {
                    "seed":seed,
                    "coinType":"ETH",
                    "number":60,
                    "bipNumber":0,
                    "receiveOrChange":"1",
                    "coinMark":"ETH"
                };
                let btcAddr = addr.blockchainAddress(btcParmas);
                let ethAddr = addr.blockchainAddress(ethParmas);
                if(ethAddr != null && ethAddr != null) {
                    setAddressKey(UUID.v1(), en(key, iv, btcAddr.privateKey), btcAddr.address);
                    setAddressKey(UUID.v1(), en(key, iv, ethAddr.privateKey), ethAddr.address);
                    let addrData ={
                        btcAddr:btcAddr.address,
                        ethAddr:ethAddr.address
                    };
                    resolve({code:200, msg:"success", result:addrData});
                }
            }
        }
    })
};

const coinSign = (data) => {
    let { signMark, fromAddress, contractAddress, changeAddress, sendFee, addressAmount, utxo,
        gasPrice, gasLimit, nonce, decimal, password} = data;
    return new Promise((resolve, reject) => {
        signMark ? null : reject('请填写你的 signMark');
        fromAddress ? null : reject('请填写你的 fromAddress');
        password ? null : reject('请填写你的 password');
        getSecret(fromAddress).then((privateKey) => {
            const signParams = {
                signMark:signMark,
                privateKey:privateKey,
                fromAddress:fromAddress,
                contractAddress:contractAddress,
                changeAddress:changeAddress,
                sendFee:sendFee,
                addressAmount:addressAmount,
                utxo:utxo,
                gasPrice:gasPrice,
                gasLimit:gasLimit,
                nonce:nonce,
                decimal:decimal,
            };
            console.log(signParams);
            let signRet = csign.blockchainWalletSign(signParams);
            resolve({code:200, msg:"success", result:signRet});
        });

    });
};

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
        let result = {sequence:uid, mnemonic:words};
        resolve({code:200, msg:"success", result:result});
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
            let result = {sequence:sequence, mnemonic:words}
            resolve({code:200, msg:"success", result:result});
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
            let result = { address:addrs.address, privateKey:addrs.privateKey };
            resolve({code:200, msg:"success", reslut:result});
        }).catch((e) => {
            reject(e.message)
        })
    });
};

//
const importMnemonicAll = (data) => {
    let {word, language, passwd, number, bipNumber, receiveOrChange} =data;
    return new Promise((resolve, reject) => {
        word ? null : reject('请填写你的 mnemonic');
        language ? null : reject('请填写你的 language');
        passwd ? null : reject('请填写你的 passwd');
        number ? null : reject('请填写你的 number');
        bipNumber ? null : reject('请填写你的 bipNumber');
        receiveOrChange ? null : reject('请填写你的 receiveOrChange');
        language ? null : reject('请填写你的 language');
        let uuid = UUID.v1();
        let encrptWord = mnemonic.wordsToEntropy(word, language);
        let seed = mnemonic.mnemonicToSeed(word, passwd);

        let btcParmas = {
            "seed":seed,
            "coinType":"BTC",
            "number":number,
            "bipNumber":bipNumber,
            "receiveOrChange":receiveOrChange,
            "coinMark":"BTC"
        };

        let ethParmas = {
            "seed":seed,
            "coinType":"ETH",
            "number":number,
            "coinMark":"ETH"
        };

        let btcAddr = addr.blockchainAddress(btcParmas);
        let ethAddr = addr.blockchainAddress(ethParmas);
        if(ethAddr != null && btcAddr != null) {
            setAddressKey(UUID.v1(), en(key, iv, btcAddr.privateKey), btcAddr.address);
            setAddressKey(UUID.v1(), en(key, iv, ethAddr.privateKey), ethAddr.address);
            let btcAddr = {address:btcAddr.address, privateKey:btcAddr.privateKey}
            let ethAdd ={address:ethAddr.address, privateKey:ethAddr.privateKey};
            let result = {btc:btcAddr, eth:ethAdd}
            resolve({code:200, msg:"success", result:result});
        }
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
        seed = null;
        let result = {address:addrs.address, privateKey:addrs.privateKey};
        resolve({code:200, msg:"success", result:result});

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
};

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

const getSecret = (fromAddr) => {
    return new Promise((resolve, reject) => {
        try {
            let db = new sqlite3.Database(path.join(process.cwd(), './static', 'coin.db'), () => {
                sql = "SELECT `secret` FROM `account` WHERE `address` = '" + fromAddr + "' LIMIT 1;";
                db.all(sql, (err, res) => {
                    if (!err && res.length == 1){
                        let privateKey = decrypt(key, iv, res[0].secret);
                        resolve(privateKey);
                        privateKey = null;
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
