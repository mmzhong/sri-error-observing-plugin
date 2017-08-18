const fs = require('fs');
const path = require('path');
const UglifyJS = require('uglify-js');

const defaultOptions = {
  injectScript: fs.readFileSync(path.join(__dirname, './inject-script.js'), 'utf-8'),
  onErrorFunctionName: 'onSriError'
}

const defaultTemplateVariables = {
  script: 'sriInjectScript',
  error: 'sriOnError'
};

const parseOptions = {
  parse: {},
  compress: false,
  mangle: false,
  output: {
    ast: true,
    code: false,
    comments: true
  }
};

const codeOptions = {
  compress: false,
  mangle: false,
  output: {
    ast: false,
    code: true,
    comments: true,
    beautify: true
  }
};

class SriErrorObservingPlugin {
  constructor(options) {
    options = options || {};
    if (!options.url) {
      throw new Error(`sri-error-observing-plugin: url is required`);
    }
    this.reportUrl = options.url;
    this.onErrorFunctionName = options.onErrorFunctionName || defaultOptions.onErrorFunctionName;

    const replacers = [{ 
      reg: /SRI_ERROR_CALLBACK/g,
      value: this.onErrorFunctionName
    }, {
      reg: /URL_REPLACER/g,
      value: this.reportUrl
    }];
    let injectScript = options.injectScript || defaultOptions.injectScript;

    replacers.forEach(function(r) {
      injectScript = injectScript.replace(r.reg, r.value);
    });

    this.injectScript = injectScript;
  }
  apply(compiler) {
    const injectScript = this.injectScript;
    const onErrorFunctionName = this.onErrorFunctionName;

    compiler.plugin('after-plugins', function(compiler) {
      
      compiler.plugin('this-compilation', function(compilation) {

        // Inject custom function call
        compilation.mainTemplate.plugin('jsonp-script', function(source) {

          // Parse 
          const jsonpScriptAst = UglifyJS.minify(source, parseOptions).ast;

          const walker = new UglifyJS.TreeWalker(function(node) {
            if (node instanceof UglifyJS.AST_Defun && node.name.name === 'onScriptComplete') {
              const injectScriptCallStatement = `arguments[0].type === "error" && window['${onErrorFunctionName}'].apply(this, arguments);`;
              const funCallNode = new UglifyJS.minify(
                injectScriptCallStatement,
                parseOptions
              ).ast;

              // Append
              node.body.push(funCallNode);
            }
          });

          jsonpScriptAst.walk(walker);
          const changedResult = UglifyJS.minify(jsonpScriptAst, codeOptions);
          return this.asString([
            changedResult.code
          ]);
        });
      });
    });

    function addOnErrorAttribute(elements) {
      elements.forEach(function(el) {
        if (el.tagName === 'script' && el.attributes && el.attributes.integrity) {
          el.attributes.onerror = `${onErrorFunctionName}(event)`;
        }
      });
    }

    compiler.plugin('compilation', function(compilation) {
      // Auto inject
      compilation.plugin('html-webpack-plugin-alter-asset-tags', function(htmlPlugin, callback) {

        // Add onerror attribute
        addOnErrorAttribute(htmlPlugin.head);
        addOnErrorAttribute(htmlPlugin.body);
        
        // Add inline script
        const scriptTag = {
          tagName: 'script',
          closeTag: true,
          innerHTML: `\n${injectScript}\n`
        };
        htmlPlugin.body.unshift(scriptTag);
        callback(null, htmlPlugin);
      });

      // Explicit inject
      compilation.plugin('html-webpack-plugin-before-html-generation', function(htmlPlugin, callback) {
        htmlPlugin.assets[defaultTemplateVariables.script] = `\n<script>\n${injectScript}\n</script>\n`;
        htmlPlugin.assets[defaultTemplateVariables.error] = `${onErrorFunctionName}(event)`;
        callback(null, htmlPlugin);
      });
    });
  }
}

module.exports = SriErrorObservingPlugin;