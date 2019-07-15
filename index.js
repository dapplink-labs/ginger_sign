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
const encrypts = require('./address/encrypt');
const util = require('ethereumjs-util');
const hdkey = require('ethereumjs-wallet/hdkey');
const wallets = require('ethereumjs-wallet');
const decrypts = require('./sign/decrypt');
const md5 =require("md5");
const crypto=require('crypto');
const coin = path.join(process.cwd(), './static', 'coin.db');
let db = new sqlite3.Database(coin);
let key = '1234567890123456';
const _passwd = /^[A-Za-z0-9]{16}$/;

db.serialize(() => {
    if (!fs.existsSync(coin)) {
        db.run("CREATE TABLE word(word_id varchar(128), mnemonic_code varchar(256), password varchar(128), del varchar(1));");
        db.run("CREATE TABLE account(address_id varchar(128), word_id varchar(128), secret varchar(256), address varchar(80), password varchar(128), del varchar(1));");
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
app.use(bodyParser.urlencoded({ extended: true }));

app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', '*');
    res.header('Content-Type', 'application/json;charset=utf-8');
    next();
});

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

// 生成单个币地址(此接口不用)
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

// 导入助记词生成单个地址--6(此接口不用)
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
    let { rootkey, language, passwd, bipNumber, number, receiveOrChange} = req.body;
    let obj = {
        rootkey:rootkey,
        language:language,
        passwd:passwd,
        bipNumber:bipNumber,
        number:number,
        receiveOrChange:receiveOrChange
    };
    importRootKey(obj).then((e) => {
        res.send(e)
    }).catch((e) => {
        res.send('')
    })
});

// 删除钱包
app.post('/delete', (req, res)=> {
    let {wmark, sequence, passwd}  = req.body;
    let obj = {
        wmark:wmark,
        sequence:sequence,
        passwd:passwd,
    };
    deleteWallet(obj).then((e) => {
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


app.post('/updPwd', (req, res) => {
    let {sequence, passwd}  = req.body;
    let obj = {
        sequence:sequence,
        passwd:passwd,
    };
    updatePwd(obj).then((e) => {
        res.send(e)
    }).catch((e) => {
        res.send('')
    })
});

const updatePwd = (data) => {
    let {sequence, passwd}  = data;
    return new Promise((resolve, reject) => {
        if (sequence == "" || passwd == "") {
            resolve({code: 400, msg: "params is null", result: null});
            return ;
        }
        let md5 = crypto.createHash("md5");
        md5.update(passwd);
        let passwdStr = md5.digest('hex');
        let lpwd = passwdStr.toUpperCase();
        updPassword(lpwd, sequence)
        resolve({code:200, msg:"success", result:"update password success"});
    });

};

// generateAllAddr
const generateAllAddr = (data) => {
    let {sequence, number, bipNumber, receiveOrChange, language, passwd} = data;
    return new Promise((resolve, reject) => {
        if(sequence == "" || language == "" || passwd == "" || number == ""){
            resolve({code: 400, msg: "params is null", result: null});
            return ;
        }
        getPwdWord(sequence).then((pwd) => {
            let md5 = crypto.createHash("md5");
            md5.update(passwd);
            let passwdStr = md5.digest('hex');
            let lpwd = passwdStr.toUpperCase();
            if (pwd == 100) {
                resolve({code: 300, msg: "no such type mnemonic", result: null});
                return ;
            }
            if (pwd != lpwd) {
                resolve({code: 600, msg: "password is wrong", result: null});
                return ;
            }
            getWords(sequence).then((mnemonicCode) => {
                let words = mnemonic.entropyToWords(mnemonicCode, language);
                let seed = mnemonic.mnemonicToSeed(words);
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
                        let uiid = UUID.v1();
                        if(addresss == "100") {
                            setAddressKey(uiid, sequence, en(key, iv, btcAddr.privateKey), btcAddr.address, lpwd, "1");
                            setAddressKey(uiid, sequence, en(key, iv, ethAddr.privateKey), ethAddr.address, lpwd, "1");
                            let btcData ={
                                addrId:uiid,
                                chainName:"Bitcoin",
                                coinName:"BTC",
                                address:btcAddr.address,
                                changeAddr:btcAddr.address,
                                privateKey:encrypts(key, iv, btcAddr.privateKey)
                            };
                            let omniUsdtData = {
                                addrId:uiid,
                                chainName:"OMNI",
                                coinName:"USDT",
                                address:btcAddr.address,
                                privateKey:encrypts(key, iv, btcAddr.privateKey)
                            };
                            let ethData = {
                                addrId:uiid,
                                chainName:"Ethereum",
                                coinName:"ETH",
                                address:ethAddr.address,
                                privateKey:encrypts(key, iv, ethAddr.privateKey)
                            };
                            let tbsvData = {
                                addrId:uiid,
                                chainName:"Ethereum",
                                coinName:"TBSV",
                                contractName:"0x29566d87b94d5f76029288e4d0c7af0f9fda98b2",
                                address:ethAddr.address,
                                privateKey:encrypts(key, iv, ethAddr.privateKey)
                            };
                            let usdtData = {
                                addrId:uiid,
                                chainName:"Ethereum",
                                coinName:"USDT-ERC20",
                                contractName:"0xdac17f958d2ee523a2206206994597c13d831ec7",
                                address:ethAddr.address,
                                privateKey:encrypts(key, iv, ethAddr.privateKey)
                            };
                            let eosData = {
                                addrId:uiid,
                                chainName:"Eos",
                                coinName:"EOS",
                                address:"xqcceoswasaswsdssdsdssaqs",
                                tag:"5lea36"
                            };
                            let result = {btc:btcData, btcusdt:omniUsdtData, eth:ethData, tbsv:tbsvData, usdt:usdtData, eos:eosData};
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
            return ;
        }
        getPwdAddr(address).then((pwd) => {
            let md5 = crypto.createHash("md5");
            md5.update(passwd);
            let passwdStr = md5.digest('hex');
            let lpwd = passwdStr.toUpperCase();
            if(pwd == "100") {
                resolve({code: 500, msg: "no this address", result: null});
                return ;
            }
            if (pwd != lpwd) {
                resolve({code: 600, msg: "password is wrong", result: null});
                return ;
            }
            getSecret(address).then((privateKey) => {
                let enPrivateKey = encrypts(key, iv, privateKey);
                let result = {privateKey:enPrivateKey};
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
            return ;
        }
        getPwdWord(sequence).then((pwd) => {
            let md5 = crypto.createHash("md5");
            md5.update(passwd);
            let passwdStr = md5.digest('hex');
            let lpwd = passwdStr.toUpperCase();
            if(pwd == "100") {
                resolve({code: 700, msg: "no this wallet", result: null});
                return ;
            }
            if (pwd != lpwd) {
                resolve({code: 600, msg: "password is wrong", result: null});
                return ;
            }
            getWords(sequence).then((mnemonicCode) => {
                let enMnemonicCode = encrypts(key, iv, mnemonicCode);
                let result = {walletprv:enMnemonicCode};
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
            return ;
        }
        let md5 = crypto.createHash("md5");
        md5.update(passwd);
        let passwdStr = md5.digest('hex');
        let lpwd = passwdStr.toUpperCase();
        if(coinType == "BTC") {
            let deChildKey = decrypts(key, iv, childKey);
            let keyPair = bitcoin.ECPair.fromWIF(deChildKey);
            let btcAddr = bitcoin.payments.p2pkh({pubkey:keyPair.publicKey});
            addrHave(btcAddr.address).then((addresss) => {
                if(addresss == "100") {
                    let uid = UUID.v1();
                    setAddressKey(uid, uid, en(key, iv, deChildKey), btcAddr.address, lpwd, "1");
                    let btcData = {
                        addrId:uid,
                        chainName:"Bitcoin",
                        coinName:"BTC",
                        address:btcAddr.address,
                        privateKey:childKey
                    };

                    let usdtData = {
                        addrId:uid,
                        chainName:"OMNI",
                        coinName:"USDT",
                        address:btcAddr.address,
                        privateKey:childKey
                    };
                    let result = {sequence:seq, btc:btcData, busdt:usdtData}
                    resolve({code: 200, msg: "success", result:result});
                } else {
                    querySeqByAddr(btcAddr.address).then((seq) => {
                        updAccountStutas(seq);
                        updWordStutas(seq);
                        queryWallet(seq).then((res)=>{
                            let btcAdd = "";
                            let omniUsdtAdd = "";
                            for(let i = 0; i < res.length; i++) {
                                if(res[i].address === btcAddr.address) {
                                    btcAdd = {
                                        addrId:res[i].address_id,
                                        chainName:"Bitcoin",
                                        coinName:"BTC",
                                        address:res[i].address,
                                        changeAddr:res[i].address,
                                        privateKey:res[i].secret
                                    };

                                    omniUsdtAdd = {
                                        addrId:res[i].address_id,
                                        chainName:"OMNI",
                                        coinName:"USDT",
                                        address:res[i].address,
                                        privateKey:res[i].secret
                                    };
                                }
                            }
                            let result = {sequence:seq, btc:btcAdd, btcusdt:omniUsdtAdd};
                            resolve({code:200, msg:"success", result:result});
                        })
                    });
                    // resolve({code:800, msg:"this address alread have", reslut:null});
                }
            });
        } else if(coinType == "ETH") {
            let deChildKey = decrypts(key, iv, childKey);
            let addr = util.privateToAddress(Buffer.from(deChildKey, "hex")).toString('hex');
            let ethAddr = '0x' + addr;
            addrHave(ethAddr).then((addresss) => {
                if(addresss == "100") {
                    let uid = UUID.v1();
                    setAddressKey(uid, uid, en(key, iv, deChildKey), ethAddr, lpwd, "1");
                    let ethData = {
                        addrId:uid,
                        chainName:"Ethereum",
                        coinName:"ETH",
                        address:ethAddr,
                        privateKey:childKey
                    };

                    let eusdtData = {
                        addrId:uid,
                        chainName:"Ethereum",
                        coinName:"USDT-ERC20",
                        contractName:"0x29566d87b94d5f76029288e4d0c7af0f9fda98b2",
                        address:ethAddr,
                        privateKey:childKey
                    };

                    let tbsvData = {
                        addrId:uid,
                        chainName:"Ethereum",
                        coinName:"TBSV",
                        contractName:"0xdac17f958d2ee523a2206206994597c13d831ec7",
                        address:ethAddr,
                        privateKey:childKey
                    };
                    let result = {sequence:seq, eth:ethData, usdt:eusdtData, tbsv:tbsvData};
                    resolve({code: 200, msg: "success", result:result});
                } else {
                    querySeqByAddr(ethAddr).then((seq) => {
                        updAccountStutas(seq);
                        updWordStutas(seq);
                        queryWallet(seq).then((res)=>{
                            let ethAdd = "";
                            let tbsvData = "";
                            let usdtData = "";
                            for(let i = 0; i < res.length; i++) {
                                if(ethAddr === res[i].address){
                                    ethAdd ={
                                        sequence:res[i].address_id,
                                        chainName:"Ethereum",
                                        coinName:"ETH",
                                        address:res[i].address,
                                        privateKey:res[i].secret
                                    };

                                    tbsvData = {
                                        sequence:res[i].address_id,
                                        chainName:"Ethereum",
                                        coinName:"TBSV",
                                        contractName:"0x29566d87b94d5f76029288e4d0c7af0f9fda98b2",
                                        address:res[i].address,
                                        privateKey:res[i].secret
                                    };

                                    usdtData = {
                                        sequence:res[i].address_id,
                                        chainName:"Ethereum",
                                        coinName:"USDT-ERC20",
                                        contractName:"0xdac17f958d2ee523a2206206994597c13d831ec7",
                                        address:res[i].address,
                                        privateKey:res[i].secret
                                    };
                                }
                            }
                            let result = {sequence:seq, eth:ethAdd, tbsv:tbsvData, usdt:usdtData};
                            resolve({code:200, msg:"success", result:result});
                        })
                    });
                }
            });
        } else {
            resolve({code: 900, msg: "no support cointype"})
        }
    });
};

const importRootKey = (data) => {
    let { rootkey, language, passwd, bipNumber, number, receiveOrChange } = data;
    return new Promise((resolve, reject) => {
        if(rootkey == "" || passwd == "" || number == "" || receiveOrChange == "") {
            resolve({code:400, msg:"parameter is null", result:null});
        }
        let md5 = crypto.createHash("md5");
        md5.update(passwd);
        let passwdStr = md5.digest('hex');
        let lpwd = passwdStr.toUpperCase();
        let deRootkey = decrypts(key, iv, rootkey)
        let words = mnemonic.entropyToWords(deRootkey, language);
        let seed = mnemonic.mnemonicToSeed(words);
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
            "bipNumber":bipNumber,
            "coinMark":"ETH"
        };
        let uuid = UUID.v1();
        setMnemonicCode(uuid, deRootkey, lpwd, "1");
        let btcAddr = addr.blockchainAddress(btcParmas);
        let ethAddr = addr.blockchainAddress(ethParmas);
        if(ethAddr != null && btcAddr != null) {
            addrHave(btcAddr.address).then((addresss) => {
                if(addresss == "100") {
                    let uiid = UUID.v1();
                    setAddressKey(uiid, uuid, en(key, iv, btcAddr.privateKey), btcAddr.address, lpwd, "1");
                    setAddressKey(uiid, uuid, en(key, iv, ethAddr.privateKey), ethAddr.address, lpwd, "1");
                    let btcData ={
                        addrId:uiid,
                        chainName:"Bitcoin",
                        coinName:"BTC",
                        address:btcAddr.address,
                        changeAddr:btcAddr.address,
                        privateKey:encrypts(key, iv, btcAddr.privateKey)
                    };

                    let busdtData ={
                        addrId:uiid,
                        chainName:"OMNI",
                        coinName:"USDT",
                        address:btcAddr.address,
                        privateKey:encrypts(key, iv, btcAddr.privateKey)
                    };

                    let ethData = {
                        addrId:uiid,
                        chainName:"Ethereum",
                        coinName:"ETH",
                        address:ethAddr.address,
                        privateKey:encrypts(key, iv,ethAddr.privateKey)
                    };

                    let tbsvData = {
                        addrId:uiid,
                        chainName:"Ethereum",
                        coinName:"TBSV",
                        contractName:"0x29566d87b94d5f76029288e4d0c7af0f9fda98b2",
                        address:ethAddr.address,
                        privateKey:encrypts(key, iv,ethAddr.privateKey)
                    };

                    let usdtData = {
                        addrId:uiid,
                        chainName:"Ethereum",
                        coinName:"USDT-ERC20",
                        contractName:"0xdac17f958d2ee523a2206206994597c13d831ec7",
                        address:ethAddr.address,
                        privateKey:encrypts(key, iv,ethAddr.privateKey)
                    };

                    let eosData = {
                        addrId:uiid,
                        chainName:"Eos",
                        coinName:"EOS",
                        address:"xqcceoswasaswsdssdsdssaqs",
                        tag:"5lea36"
                    };
                    let result = {sequence:uuid, btc:btcData, btcusdt:busdtData, eth:ethData, tbsv:tbsvData, usdt:usdtData, eos:eosData};
                    resolve({code:200, msg:"success", result:result});
                } else {
                    querySeqByAddr(btcAddr.address).then((seq) => {
                        updAccountStutas(seq);
                        updWordStutas(seq);
                        queryWallet(seq).then((res)=>{
                            let btcAdd = "";
                            let omniUsdtAdd = "";
                            let ethAdd = "";
                            let tbsvData = "";
                            let usdtData = "";
                            let eosAdd = "";
                            for(let i = 0; i < res.length; i++) {
                                if(res[i].address === btcAddr.address) {
                                    btcAdd = {
                                        addrId:res[i].address_id,
                                        chainName:"Bitcoin",
                                        coinName:"BTC",
                                        address:res[i].address,
                                        changeAddr:res[i].address,
                                        privateKey:res[i].secret
                                    };

                                    omniUsdtAdd = {
                                        addrId:res[i].address_id,
                                        chainName:"OMNI",
                                        coinName:"USDT",
                                        address:res[i].address,
                                        privateKey:res[i].secret
                                    };
                                }

                                if(ethAddr.address === res[i].address){
                                    ethAdd ={
                                        addrId:res[i].address_id,
                                        chainName:"Ethereum",
                                        coinName:"ETH",
                                        address:res[i].address,
                                        privateKey:res[i].secret
                                    };

                                    tbsvData = {
                                        addrId:res[i].address_id,
                                        chainName:"Ethereum",
                                        coinName:"TBSV",
                                        contractName:"0x29566d87b94d5f76029288e4d0c7af0f9fda98b2",
                                        address:res[i].address,
                                        privateKey:res[i].secret
                                    };

                                    usdtData = {
                                        addrId:res[i].address_id,
                                        chainName:"Ethereum",
                                        coinName:"USDT-ERC20",
                                        contractName:"0xdac17f958d2ee523a2206206994597c13d831ec7",
                                        address:res[i].address,
                                        privateKey:res[i].secret
                                    };

                                    eosAdd = {
                                        addrId:res[i].address_id,
                                        chainName:"Eos",
                                        coinName:"EOS",
                                        address:"xqcceoswasaswsdssdsdssaqs",
                                        tag:"abdcd"
                                    };
                                }
                            }
                            let result = {sequence:seq, btc:btcAdd, btcusdt:omniUsdtAdd, eth:ethAdd, tbsv:tbsvData, usdt:usdtData, eos:eosAdd};
                            resolve({code:200, msg:"success", result:result});
                        })
                    });
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
                    setAddressKey(UUID.v1(), "", en(key, iv, btcAddr.privateKey), btcAddr.address);
                    setAddressKey(UUID.v1(), "", en(key, iv, ethAddr.privateKey), ethAddr.address);
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
            return ;
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
            setMnemonicCode(uid, encrptWord, lpwd, "1");
            let result = {sequence:uid, mnemonic:encrypts(key, iv, words)};
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
            return ;
        }
        getPwdWord(sequence).then((pwd) => {
            if(pwd == "100") {
                resolve({code:300, msg:"no such type mnemonic", result:null});
                return ;
            }
            let md5 = crypto.createHash("md5");
            md5.update(passwd);
            let passwdStr = md5.digest('hex');
            var lpwd =passwdStr.toUpperCase();
            if(lpwd == pwd) {
                getWords(sequence).then((mnemonicCode) => {
                    let words = mnemonic.entropyToWords(mnemonicCode, language);
                    let enwords = encrypts(key, iv, words);
                    mnemonicCode = null;
                    let result = {sequence:sequence, mnemonic:enwords}
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
                            setAddressKey(UUID.v1(), sequence, en(key, iv, addrs.privateKey), addrs.address, lpwd);
                            mnemonicCode = null;
                            words = null;
                            seed = null;
                            let result = { address:addrs.address, privateKey:encrypts(key, iv, addrs.privateKey)};
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
    let {word, language, passwd, number, bipNumber, receiveOrChange} = data;
    return new Promise((resolve, reject) => {
        if(word == "" || language == "" || passwd == "") {
            resolve({code:400, msg:"parameter is null", result:null});
        }
        let uuid = UUID.v1();
        let deWord = decrypts(key, iv, word);
        let encrptWord = mnemonic.wordsToEntropy(deWord, language);
        let md5 = crypto.createHash("md5");
        md5.update(passwd);
        let passwdStr = md5.digest('hex');
        let lpwd =passwdStr.toUpperCase();
        setMnemonicCode(uuid, encrptWord, lpwd, "1");
        let seed = mnemonic.mnemonicToSeed(deWord);
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

        let eosData = {
            ddress:"xqcceoswasaswsdssdsdssaqs",
            tag:"5lea36"
        };

        let btcAddr = addr.blockchainAddress(btcParmas);
        let ethAddr = addr.blockchainAddress(ethParmas);
        addrHave(btcAddr.address).then((addresss) => {
            if(addresss == "100") {
                let uuiid = UUID.v1();
                setAddressKey(uuiid, uuid, en(key, iv, btcAddr.privateKey), btcAddr.address, lpwd, "1");
                setAddressKey(uuiid, uuid, en(key, iv, ethAddr.privateKey), ethAddr.address, lpwd, "1");
                let btcAdd = {
                    addrId:uuiid,
                    chainName:"Bitcoin",
                    coinName:"BTC",
                    address:btcAddr.address,
                    changeAddr:btcAddr.address,
                    privateKey:encrypts(key, iv, btcAddr.privateKey)
                };

                let omniUsdtAdd = {
                    addrId:uuiid,
                    chainName:"OMNI",
                    coinName:"USDT",
                    address:btcAddr.address,
                    privateKey:encrypts(key, iv, btcAddr.privateKey)
                };

                let ethAdd ={
                    addrId:uuiid,
                    chainName:"Ethereum",
                    coinName:"ETH",
                    address:ethAddr.address,
                    privateKey:encrypts(key, iv, ethAddr.privateKey)
                };

                let tbsvData = {
                    addrId:uuiid,
                    chainName:"Ethereum",
                    coinName:"TBSV",
                    contractName:"0x29566d87b94d5f76029288e4d0c7af0f9fda98b2",
                    address:ethAddr.address,
                    privateKey:encrypts(key, iv, ethAddr.privateKey)
                };

                let usdtData = {
                    addrId:uuiid,
                    chainName:"Ethereum",
                    coinName:"USDT-ERC20",
                    contractName:"0xdac17f958d2ee523a2206206994597c13d831ec7",
                    address:ethAddr.address,
                    privateKey:encrypts(key, iv, ethAddr.privateKey)
                };

                let eosAdd = {
                    addrId:uuiid,
                    chainName:"Eos",
                    coinName:"EOS",
                    address:eosData.ddress,
                    tag:eosData.tag
                };
                let result = {uuid:uuid, btc:btcAdd, btcusdt:omniUsdtAdd, eth:ethAdd, tbsv:tbsvData, usdt:usdtData, eos:eosAdd};
                resolve({code:200, msg:"success", result:result});
            } else {
                querySeqByAddr(btcAddr.address).then((seq) => {
                    updAccountStutas(seq);
                    updWordStutas(seq);
                    queryWallet(seq).then((res)=>{
                        let btcAdd = "";
                        let omniUsdtAdd = "";
                        let ethAdd = "";
                        let tbsvData = "";
                        let usdtData = "";
                        let eosAdd = "";
                        for(let i = 0; i < res.length; i++) {
                           if(res[i].address === btcAddr.address) {
                               btcAdd = {
                                   addrId:res[i].address_id,
                                   chainName:"Bitcoin",
                                   coinName:"BTC",
                                   address:res[i].address,
                                   changeAddr:res[i].address,
                                   privateKey:res[i].secret
                               };

                               omniUsdtAdd = {
                                   addrId:res[i].address_id,
                                   chainName:"OMNI",
                                   coinName:"USDT",
                                   address:res[i].address,
                                   privateKey:res[i].secret
                               };
                           }

                           if(ethAddr.address === res[i].address){
                               ethAdd ={
                                   addrId:res[i].address_id,
                                   chainName:"Ethereum",
                                   coinName:"ETH",
                                   address:res[i].address,
                                   privateKey:res[i].secret
                               };

                               tbsvData = {
                                   addrId:res[i].address_id,
                                   chainName:"Ethereum",
                                   coinName:"TBSV",
                                   contractName:"0x29566d87b94d5f76029288e4d0c7af0f9fda98b2",
                                   address:res[i].address,
                                   privateKey:res[i].secret
                               };

                               usdtData = {
                                   addrId:res[i].address_id,
                                   chainName:"Ethereum",
                                   coinName:"USDT-ERC20",
                                   contractName:"0xdac17f958d2ee523a2206206994597c13d831ec7",
                                   address:res[i].address,
                                   privateKey:res[i].secret
                               };

                               eosAdd = {
                                   addrId:res[i].address_id,
                                   chainName:"Eos",
                                   coinName:"EOS",
                                   address:"xqcceoswasaswsdssdsdssaqs",
                                   tag:"abdcd"
                               };
                           }
                        }
                        let result = {uuid:seq, btc:btcAdd, btcusdt:omniUsdtAdd, eth:ethAdd, tbsv:tbsvData, usdt:usdtData, eos:eosAdd};
                        resolve({code:200, msg:"success", result:result});
                    })
                });
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
        let deWord = decrypts(key, iv, word);
        let encrptWord = mnemonic.wordsToEntropy(deWord, language);
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
                    setAddressKey(uuid, uuid, en(key, iv, addrs.privateKey), addrs.address, lpwd);
                    uuid = null;
                    encrptWord = null;
                    seed = null;
                    let result = {address:addrs.address, privateKey:encrypts(key, iv, addrs.privateKey)};
                    resolve({code:200, msg:"success", result:result});
                } else {
                    resolve({code:800, msg:"this address alread have", reslut:null});
                }
            })
        }
    });
};

const deleteWallet = (data) => {
    let {wmark, sequence, passwd} =data;
    return new Promise((resolve, reject) => {
        if(wmark == "" || sequence == "" || passwd == "") {
            resolve({code:400, msg:"parameter is null", result:null});
        }
        let md5 = crypto.createHash("md5");
        md5.update(passwd);
        let passwdStr = md5.digest('hex');
        let lpwd =passwdStr.toUpperCase();
        if (wmark == "ALL") {
            getPwdWord(sequence).then((pwd) => {
                if (pwd == 100) {
                    resolve({code: 300, msg: "no such type mnemonic", result: null});
                }
                if (pwd != lpwd) {
                    resolve({code: 600, msg: "password is wrong", result: null});
                }
                deletSeqWord(sequence);
                deleteSeqAccount(sequence);
                resolve({code: 200, msg: "delete wallet success"});
            })
        } else if (wmark == "BTC") {
            deletSeqWord(sequence);
            deleteSeqAccount(sequence);
            resolve({code: 200, msg: "delete wallet success"});
        } else if(wmark == "ETH") {
            deletSeqWord(sequence);
            deleteSeqAccount(sequence);
            resolve({code: 200, msg: "delete wallet success"});
        } else {
            resolve({code:300, msg:"no such wallet", result:null});
        }
    });
};

const setMnemonicCode = (uuid, seedCode, lpwd, del) => {
    return new Promise((resolve, reject) => {
        try {
             db.run(`INSERT INTO word VALUES('${uuid}', '${seedCode}', '${lpwd}', '${del}');`);
        } catch (e) {
            reject(e.message);
        }
    });
};

const setAddressKey = (uuid, wid, secret, address, lpwd, del) => {
    return new Promise((resolve, reject) => {
        try {
            db.run(`INSERT INTO account VALUES('${uuid}', '${wid}', '${secret}', '${address}', '${lpwd}', '${del}');`);
        } catch (e) {
            reject(e.message);
        }
    });
};

const updAccountStutas = (sequence) => {
    return new Promise((resolve, reject) => {
        try {
            db.run("update account set del = 1 WHERE word_id = '" + sequence + "';");
        } catch (e) {
            reject(e.message);
        }
    });
};

const updWordStutas = (sequence) => {
    return new Promise((resolve, reject) => {
        try {
            db.run("update word set del = 1 WHERE word_id = '" + sequence + "';");
        } catch (e) {
            reject(e.message);
        }
    });
};

const deleteSeqAccount = (sequence)=> {
    return new Promise((resolve, reject) => {
        try {
            db.run("update account set del = 0 WHERE word_id = '" + sequence + "';");
        } catch (e) {
            reject(e.message);
        }
    });
};

const deletSeqWord = (sequence)=> {
    return new Promise((resolve, reject) => {
        try {
            db.run("update word set del = 0 WHERE word_id = '" + sequence + "';");
        } catch (e) {
            reject(e.message);
        }
    });
};


const updPassword = (passwd, sequence)=> {
    return new Promise((resolve, reject) => {
        try {
            db.run("update word set password = '" + passwd +"'  WHERE word_id = '" + sequence + "';");
            db.run("update account set password = '" + passwd +"'  WHERE word_id = '" + sequence + "';");
        } catch (e) {
            reject(e.message);
        }
    });
};

const getPwdWord = (sequence) => {
    return new Promise((resolve, reject) => {
        try {
            let db = new sqlite3.Database(path.join(process.cwd(), './static', 'coin.db'), () => {
                sql = "SELECT password FROM word WHERE word_id = '" + sequence + "' AND del = 1 LIMIT 1;";
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
                sql = "SELECT mnemonic_code FROM word WHERE word_id = '" + sequence + "' AND del = 1 LIMIT 1;";
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
                        let privateKey = decrypts(key, iv, res[0].secret);
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

const querySeqByAddr = (address)=> {
    return new Promise((resolve, reject) => {
        try {
            let db = new sqlite3.Database(path.join(process.cwd(), './static', 'coin.db'), () => {
                sql = "SELECT `word_id` FROM `account` WHERE `address` = '" + address + "' LIMIT 1;";
                db.all(sql, (err, res) => {
                    if (!err && res.length == 1){
                        let wordId = res[0].word_id;
                        resolve(wordId);
                        wordId = null;
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

const queryWallet = (seq) => {
    return new Promise((resolve, reject) => {
        try {
            let db = new sqlite3.Database(path.join(process.cwd(), './static', 'coin.db'), () => {
                sql = "SELECT * FROM `account` WHERE `word_id` = '" + seq + "';";
                db.all(sql, (err, res) => {
                    if (!err){
                        let wordId = res;
                        resolve(wordId);
                        wordId = null;
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
