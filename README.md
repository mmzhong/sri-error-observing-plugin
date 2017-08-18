# sri-error-observing-plugin

A webpack plugin that observes Subresource Integrity error.

**It should work with [html-webpack-plugin](https://github.com/jantimon/html-webpack-plugin) and [webpack-subresource-integrity](https://www.npmjs.com/package/webpack-subresource-integrity)**.

## Installation

```bash
npm install sri-error-observing-plugin --save-dev
```

## Usage

```javascript
const SriErrorObservingPlugin = require('sri-error-observing-plugin');
module.exports = {
  ...,
  plugins: [
    new SriErrorObservingPlugin({
      url: 'https://example.com/t.gif', // Required, the destination where to report
      injectScript: 'absolute/path/to/custom/inject/script.js', // Optional, custom error handler script
      onErrorFunctionName: 'onSriError' // Optional, global sri error handler function name, default to 'onSriError'
    })
  ]
}
```

Default inject script:

```javascript
(function(global) {
  global['SRI_ERROR_CALLBACK'] = function(event) {
    var target = event.target;
    var params = [
      'i=' + target.integrity,
      's=' + (target.href || target.src),
      't=' + Date.now()
    ];
    var img = new Image();
    img.src = 'URL_REPLACER' + '?' + params.join('&');
  };

  var styles = [].filter.call(document.getElementsByTagName('link'), function(link) {
    return link.rel && link.rel === 'stylesheet';
  });

  styles.forEach(function(t) {
    var _onerror = t.onerror;
    t.onerror = function(e) {
      global['SRI_ERROR_CALLBACK'](e);
      typeof _onerror === 'function' && _onerror(e);
    };
  });
})(this)
```

`URL_REPLACER`、`SRI_ERROR_CALLBACK` will be replaced by the real value.

When a SRI error occurs, it will send a request to `URL_REPLACER` with some data, e.g: 

```
https://example.com/t.gif?i=sha256-RBTPQdVhFxnRnWesy+54AiWVWFTk6ATVxB9ApvDmnJE=&s=https://example.com/css/main.fb85e453.css&t=1503024384007
```