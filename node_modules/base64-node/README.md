#### Base64-Node
Base64 encoding/decoding in NodeJS

#### Usage

```js
var base64 = require("base64-node");

console.log(base64.encode("<p>Test</p>"));
//PHA+VGVzdDwvcD4=

console.log(base64.decode("PHA+VGVzdDwvcD4="));
//<p>Test</p>

```