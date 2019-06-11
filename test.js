const hdkey = require('ethereumjs-wallet/hdkey');
const utils = require('ethereumjs-util');
const mnemonics = require('./mnemonic/word');
const bip32  = require( 'bip32');
const bip39 = require('bip39')



let w = "say buyer suspect palace west morning horror monkey survey ice another powder";

let seed = bip39.mnemonicToSeed(w)
var rootMasterKey = hdkey.fromMasterSeed(seed);
var childKey = rootMasterKey.derivePath("m/44'/60'/0'/0/0");
var address = utils.pubToAddress(childKey._hdkey._publicKey, true).toString('hex');
var privateKey = childKey._hdkey._privateKey.toString('hex');

console.log("address = ", address)
console.log("privateKey = ", privateKey)