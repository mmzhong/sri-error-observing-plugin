(function(global, url) {
  global['SRI_ERROR_CALLBACK'] = function(event) {
    var target = event.target;
    var params = [
      'i=' + target.integrity,
      's=' + (target.href || target.src),
      't=' + Date.now()
    ];
    var img = new Image();
    img.src = url + '?' + params.join('&');
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
})(this, 'URL_REPLACER')