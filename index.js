const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bitcoin  = require('bitcoinjs-lib');
const NETWORKS = require('bitcoinjs-lib/src/networks');
const chalk = require('chalk');
const fs = require('fs');
const bip32  = require( 'bip32');
const query = require('querystring');
let iv = '2624750004598718';
const readline = require('readline');
const mnemonic = require('./mnemonic/word');
const UUID = require('uuid');
const baddress = require('bitcoinjs-lib/src/address');
const addr = require('./address/generateAddress');
const csign = require('./sign/indexSign');
const en = require('./address/encrypt');
const util = require('ethereumjs-util');
const hdkey = require('ethereumjs-wallet/hdkey');
const wallets = require('ethereumjs-wallet');
const decrypt = require('./sign/decrypt');
const md5 =require("md5");
const crypto=require('crypto');
const coin = path.join(process.cwd(), './static', 'coin.db');
let db = new sqlite3.Database(coin);
let key = '1234567890123456';
const _passwd = /^[A-Za-z0-9]{16}$/;

db.serialize(() => {
    if (!fs.existsSync(coin)) {
        db.run("CREATE TABLE word(word_id varchar(128), mnemonic_code varchar(256), password varchar(128));");
        db.run("CREATE TABLE account(address_id varchar(128), secret varchar(256), address varchar(80), password varchar(128));");
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
    let {sequence, language, passwd} = req.body;
    let obj = {
        sequence:sequence,
        language:language,
        passwd:passwd
    };
    exportWord(obj).then((e) => {
        res.send(e)
    }).catch((e) => {
        res.send('')
    })
});


// 单个私钥导出
app.post('/singleExport', (req, res) => {
    let {address, passwd} = req.body;
    let obj = {
        address:address,
        passwd:passwd
    };
    singleExportKey(obj).then((e) => {
        res.send(e)
    }).catch((e) => {
        res.send('')
    })
});

// 钱包整体私钥导出
app.post('/walletExport', (req, res) => {
    let {sequence, passwd, language} = req.body;
    let obj = {
        sequence:sequence,
        language:language,
        passwd:passwd
    };
    walletExport(obj).then((e) => {
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
    let {mnemonic, language, coinType, number, bipNumber, receiveOrChange, coinMark, passwd} = req.body;
    let obj = {
        word:mnemonic,
        language:language,
        coinType:coinType,
        number:number,
        bipNumber:bipNumber,
        receiveOrChange:receiveOrChange,
        coinMark:coinMark,
        passwd:passwd,

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

app.post('/importPrivateKey',(req, res) => {
    let { privateKey, passwd, coinType} = req.body;
    let obj = {
        childKey:privateKey,
        passwd:passwd,
        coinType:coinType
    };
    importPrivateKey(obj).then((e) => {
        res.send(e)
    }).catch((e) => {
        res.send('')
    })
});

app.post('/importRoot', (req, res) => {
    let { rootkey, passwd, number, receiveOrChange} = req.body;
    let obj = {
        rootkey:rootkey,
        passwd:passwd,
        number:number,
        receiveOrChange:receiveOrChange
    };
    importRootKey(obj).then((e) => {
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
        if(sequence == "" || language == "" || passwd == "" || number == ""){
            resolve({code: 400, msg: "params is null", result: null});

        }
        getPwdWord(sequence).then((pwd) => {
            let md5 = crypto.createHash("md5");
            md5.update(passwd);
            let passwdStr = md5.digest('hex');
            let lpwd = passwdStr.toUpperCase();
            if (pwd == 100) {
                resolve({code: 300, msg: "no such type mnemonic", result: null});
            }
            if (pwd != lpwd) {
                resolve({code: 600, msg: "password is wrong", result: null});
            }
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
                    addrHave(ethAddr.address).then((addresss) => {
                        if(addresss == "100") {
                            setAddressKey(UUID.v1(), en(key, iv, btcAddr.privateKey), btcAddr.address, lpwd);
                            setAddressKey(UUID.v1(), en(key, iv, ethAddr.privateKey), ethAddr.address, lpwd);
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
                        } else {
                            resolve({code:800, msg:"this address alread have", reslut:null});
                        }
                    });
                }
            }).catch((e) => {
                reject(e.message)
            })
        });
    });
};

const singleExportKey = (data) => {
    let { address, passwd } = data;
    return new Promise((resolve, reject) => {
        if (address == "" || passwd == ""){
            resolve({code:400, msg:"parameter is null", result:null});
        }
        getPwdAddr(address).then((pwd) => {
            let md5 = crypto.createHash("md5");
            md5.update(passwd);
            let passwdStr = md5.digest('hex');
            let lpwd = passwdStr.toUpperCase();
            if(pwd == "100") {
                resolve({code: 500, msg: "no this address", result: null});
            }
            if (pwd != lpwd) {
                resolve({code: 600, msg: "password is wrong", result: null});
            }
            getSecret(address).then((privateKey) => {
                let result = {privateKey:privateKey};
                resolve({code:200, msg:"success", result:result});
            });
        });
    });
};

const walletExport = (data) => {
    let {sequence, passwd, language} = data;
    return new Promise((resolve, reject) => {
        if (sequence == "" || language == "" || passwd == ""){
            resolve({code:400, msg:"parameter is null", result:null});
        }
        getPwdWord(sequence).then((pwd) => {
            let md5 = crypto.createHash("md5");
            md5.update(passwd);
            let passwdStr = md5.digest('hex');
            let lpwd = passwdStr.toUpperCase();
            if(pwd == "100") {
                resolve({code: 700, msg: "no this wallet", result: null});
            }
            if (pwd != lpwd) {
                resolve({code: 600, msg: "password is wrong", result: null});
            }
            getWords(sequence).then((mnemonicCode) => {
                let words = mnemonic.entropyToWords(mnemonicCode, language);
                let seed = mnemonic.mnemonicToSeed(words, passwd);
                let result = {walletprv:seed.toString('base64')}
                mnemonicCode = null;
                resolve({code:200, msg:"success", result:result});
            }).catch((e) => {
                reject(e.message)
            })
        });
    });
};

const importPrivateKey = (data) => {
    let { childKey, passwd, coinType } = data;
    return new Promise((resolve, reject) => {
        if(childKey == "" || passwd == "" || coinType == "") {
            resolve({code:400, msg:"parameter is null", result:null});
        }
        let md5 = crypto.createHash("md5");
        md5.update(passwd);
        let passwdStr = md5.digest('hex');
        let lpwd = passwdStr.toUpperCase();
        if(coinType == "BTC") {
            let keyPair = bitcoin.ECPair.fromWIF(childKey);
            let btcAddr = bitcoin.payments.p2pkh({pubkey:keyPair.publicKey});
            addrHave(btcAddr.address).then((addresss) => {
                if(addresss == "100") {
                    setAddressKey(UUID.v1(), en(key, iv, childKey), btcAddr.address, lpwd);
                    let resutl = {address: btcAddr.address}
                    resolve({code: 200, msg: "success", resutl:resutl});
                } else {
                    resolve({code:800, msg:"this address alread have", reslut:null});
                }
            });
        } else if(coinType == "ETH") {
            setAddressKey(UUID.v1(), en(key, iv, childKey), "0x4abee2be00dfca74860067e2fa3616ecd33418b7", lpwd);
            let resutl = {address:"0x4abee2be00dfca74860067e2fa3616ecd33418b7"}
            resolve({code: 200, msg: "success", result:resutl});
        } else {
            resolve({code: 900, msg: "no support cointype"})
        }
    });
};

const importRootKey = (data) => {
    let { rootkey, passwd, number, receiveOrChange } = data;
    return new Promise((resolve, reject) => {
        if(rootkey == "" || passwd == "" || number == "" || receiveOrChange == "") {
            resolve({code:400, msg:"parameter is null", result:null});
        }

        let md5 = crypto.createHash("md5");
        md5.update(passwd);
        let passwdStr = md5.digest('hex');
        let lpwd = passwdStr.toUpperCase();

        let retBuffer = Buffer.from(rootkey, 'base64')
        let btcParmas = {
            "seed":retBuffer,
            "coinType":"BTC",
            "number":12,
            "bipNumber":0,
            "receiveOrChange":"1",
            "coinMark":"BTC"
        };
        let ethParmas = {
            "seed":retBuffer,
            "coinType":"ETH",
            "number":60,
            "bipNumber":0,
            "receiveOrChange":"1",
            "coinMark":"ETH"
        };
        let btcAddr = addr.blockchainAddress(btcParmas);
        let ethAddr = addr.blockchainAddress(ethParmas);
        if(ethAddr != null && btcAddr != null) {
            addrHave(btcAddr.address).then((addresss) => {
                if(addresss == "100") {
                    setAddressKey(UUID.v1(), en(key, iv, btcAddr.privateKey), btcAddr.address, lpwd);
                    setAddressKey(UUID.v1(), en(key, iv, ethAddr.privateKey), ethAddr.address, lpwd);
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
                } else {
                    resolve({code:800, msg:"this address alread have", reslut:null});
                }
            });
        }
    });
};

// 此接口专供 umi 使用
const createAddr = (data) => {
    let { password } = data;
    return new Promise((resolve, reject) => {
        if(password == "") {
            resolve({code:400, msg:"parameter is null", result:null});
        }
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

// 此接口专供 umi 使用
const coinSign = (data) => {
    let { signMark, fromAddress, contractAddress, changeAddress, sendFee, addressAmount, utxo,
        gasPrice, gasLimit, nonce, decimal, password} = data;
    return new Promise((resolve, reject) => {
        if(signMark == "" || fromAddress == "" || password == "") {
            resolve({code:400, msg:"parameter is null", result:null});
        }
        getSecret(fromAddress).then((privateKey) => {
            if(privateKey == "100") {
                resolve({code:1000, msg:"no this private key", result:null});
            }
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
            let signRet = csign.blockchainWalletSign(signParams);
            if(signRet != "") {
                resolve({code:200, msg:"success", result:signRet});
            } else {
                resolve({code:1001, msg:"sign fail", result:null});
            }
        });
    });
};

// 具体函数实现
const words = (data) => {
    let { number, language, passwd } = data;
    return new Promise((resolve, reject) => {
        if (number == 0 || language == "" || passwd == "") {
            resolve({code:400, msg:"parameter is null", result:null});
        }
        if(number == 12 || number == 15 || number == 18 || number == 21 || number == 24)
        {
            let uid = UUID.v1();
            let words = mnemonic.createHelpWord(number, language);
            let encrptWord = mnemonic.wordsToEntropy(words, language);
            let md5 = crypto.createHash("md5");
            md5.update(passwd);
            let passwdStr = md5.digest('hex');
            var lpwd =passwdStr.toUpperCase();
            setMnemonicCode(uid, encrptWord, lpwd);
            let result = {sequence:uid, mnemonic:words};
            resolve({code:200, msg:"success", result:result});
        } else {
            resolve({code:300, msg:"no such type mnemonic", result:null});
        }

    });
};

const exportWord = (data) => {
    let { sequence, language, passwd } = data;
    return new Promise((resolve, reject) => {
        if(sequence == "" || language == "" || passwd =="" ) {
            resolve({code:400, msg:"parameter is null", result:null});
        }
        getPwdWord(sequence).then((pwd) => {
            if(pwd == "100") {
                resolve({code:300, msg:"no such type mnemonic", result:null});
            }
            let md5 = crypto.createHash("md5");
            md5.update(passwd);
            let passwdStr = md5.digest('hex');
            var lpwd =passwdStr.toUpperCase();
            if(lpwd == pwd) {
                getWords(sequence).then((mnemonicCode) => {
                    let words = mnemonic.entropyToWords(mnemonicCode, language);
                    mnemonicCode = null;
                    let result = {sequence:sequence, mnemonic:words}
                    resolve({code:200, msg:"success", result:result});
                }).catch((e) => {
                    reject(e.message)
                })
            } else {
                resolve({code:600, msg:"password is wrong", result:null});
            }
        });
    })
};

const generateAddr = (data) => {
    let {sequence, coinType, number, bipNumber, receiveOrChange, coinMark, language, passwd} =data;
    return new Promise((resolve, reject) => {
        if(sequence == "" || coinType == "" || coinMark == "" || language == "" || passwd == "") {
            resolve({code:400, msg:"parameter is null", result:null});
        }
        getPwdWord(sequence).then((pwd) => {
            let md5 = crypto.createHash("md5");
            md5.update(passwd);
            let passwdStr = md5.digest('hex');
            let lpwd =passwdStr.toUpperCase();
            if(pwd == 100) {
                resolve({code:300, msg:"no such type mnemonic", result:null});
            }
            if(pwd != lpwd) {
                resolve({code:600, msg:"password is wrong", result:null});
            }
            getWords(sequence).then((mnemonicCode) => {
                let words = mnemonic.entropyToWords(mnemonicCode, language);
                let seed = mnemonic.mnemonicToSeed(words);
                let addressParmas = {
                    "seed":seed,
                    "coinType":coinType,
                    "number":number,
                    "bipNumber":bipNumber,
                    "receiveOrChange":receiveOrChange,
                    "coinMark":coinMark
                };
                let addrs = addr.blockchainAddress(addressParmas);
                if(addrs.address != "") {
                    addrHave(addrs.address).then((addresss) => {
                        if(addresss == "100") {
                            setAddressKey(UUID.v1(), en(key, iv, addrs.privateKey), addrs.address, lpwd);
                            mnemonicCode = null;
                            words = null;
                            seed = null;
                            let result = { address:addrs.address, privateKey:addrs.privateKey };
                            resolve({code:200, msg:"success", reslut:result});
                        } else {
                            resolve({code:800, msg:"this address alread have", reslut:null});
                        }
                    })
                }


            }).catch((e) => {
                reject(e.message)
            })
        }).catch((e) => {
            reject(e.message)
        });
    });
};

const importMnemonicAll = (data) => {
    let {word, language, passwd, number, bipNumber, receiveOrChange} =data;
    return new Promise((resolve, reject) => {
        if(word == "" || language == "" || passwd == "") {
            resolve({code:400, msg:"parameter is null", result:null});
        }
        let uuid = UUID.v1();
        let encrptWord = mnemonic.wordsToEntropy(word, language);
        let md5 = crypto.createHash("md5");
        md5.update(passwd);
        let passwdStr = md5.digest('hex');
        var lpwd =passwdStr.toUpperCase();
        let seed = mnemonic.mnemonicToSeed(word);
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
        addrHave(btcAddr.address).then((addresss) => {
            if(addresss == "100") {
                setAddressKey(UUID.v1(), en(key, iv, btcAddr.privateKey), btcAddr.address, lpwd);
                setAddressKey(UUID.v1(), en(key, iv, ethAddr.privateKey), ethAddr.address, lpwd);
                let btcAdd = {address:btcAddr.address, privateKey:btcAddr.privateKey}
                let ethAdd ={address:ethAddr.address, privateKey:ethAddr.privateKey};
                let result = {btc:btcAdd, eth:ethAdd};
                resolve({code:200, msg:"success", result:result});
            } else {
                resolve({code:800, msg:"this address alread have", reslut:null});
            }
        });
    });
};


const importMnemonic = (data) => {
    let {word, language, coinType, number, bipNumber, receiveOrChange, coinMark, passwd} =data;
    return new Promise((resolve, reject) => {
        if(word == "" || language == "" || passwd == "" || number == "" || coinType == "" || coinMark == "") {
            resolve({code:400, msg:"parameter is null", result:null});
        }
        let uuid = UUID.v1();

        let encrptWord = mnemonic.wordsToEntropy(word, language);



        let md5 = crypto.createHash("md5");
        md5.update(passwd);
        let passwdStr = md5.digest('hex');
        let lpwd =passwdStr.toUpperCase();
        setMnemonicCode(uuid, encrptWord, lpwd);
        let seed = mnemonic.mnemonicToSeed(word);
        let addressParmas = {
            "seed":seed,
            "coinType":coinType,
            "number":number,
            "bipNumber":bipNumber,
            "receiveOrChange":receiveOrChange,
            "coinMark":coinMark
        };
        let addrs = addr.blockchainAddress(addressParmas);
        if(addrs != "") {
            addrHave(addrs.address).then((addresss) => {
                if(addresss == "100") {
                    setAddressKey(uuid, en(key, iv, addrs.privateKey), addrs.address, lpwd);
                    uuid = null;
                    encrptWord = null;
                    seed = null;
                    let result = {address:addrs.address, privateKey:addrs.privateKey};
                    resolve({code:200, msg:"success", result:result});
                } else {
                    resolve({code:800, msg:"this address alread have", reslut:null});
                }
            })
        }
    });
};

const setMnemonicCode = (uuid, seedCode, lpwd) => {
    return new Promise((resolve, reject) => {
        try {
             db.run(`INSERT INTO word VALUES('${uuid}', '${seedCode}', '${lpwd}');`);
        } catch (e) {
            reject(e.message);
        }
    });
};

const setAddressKey = (uuid, secret, address, lpwd) => {
    return new Promise((resolve, reject) => {
        try {
            db.run(`INSERT INTO account VALUES('${uuid}', '${secret}', '${address}', '${lpwd}');`);
        } catch (e) {
            reject(e.message);
        }
    });
};

const getPwdWord = (sequence) => {
    return new Promise((resolve, reject) => {
        try {
            let db = new sqlite3.Database(path.join(process.cwd(), './static', 'coin.db'), () => {
                sql = "SELECT password FROM word WHERE word_id = '" + sequence + "' LIMIT 1;";
                db.all(sql, (err, res) => {
                    if (!err && res.length == 1){
                        let code = res[0].password;
                        resolve(code);
                        code = null;
                        db = null
                    }else{
                        resolve("100");
                        db = null
                    }
                })
            })
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
                        resolve('100');
                        db = null
                    }
                })
            })
        } catch (e) {
            reject(e.message);
        }
    });
};

const getPwdAddr = (fromAddr) => {
    return new Promise((resolve, reject) => {
        try {
            let db = new sqlite3.Database(path.join(process.cwd(), './static', 'coin.db'), () => {
                sql = "SELECT `password` FROM `account` WHERE `address` = '" + fromAddr + "' LIMIT 1;";
                db.all(sql, (err, res) => {
                    if (!err && res.length == 1){
                        let password = res[0].password;
                        resolve(password);
                        password = null;
                        db = null
                    }else{
                        resolve("100");
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

const addrHave = (fromAddr)=> {
    return new Promise((resolve, reject) => {
        try {
            let db = new sqlite3.Database(path.join(process.cwd(), './static', 'coin.db'), () => {
                sql = "SELECT `address` FROM `account` WHERE `address` = '" + fromAddr + "' LIMIT 1;";
                db.all(sql, (err, res) => {
                    if (!err && res.length == 1){
                        let addr = res.address;
                        resolve(addr);
                        addr = null;
                        db = null
                    }else{
                        resolve("100");
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
