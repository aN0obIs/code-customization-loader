var loaderUtils = require('loader-utils');

var regExp = /\/\*\* CHECK_CUSTOMER_START (\[.*?\]) \*\*\/((.|[\r\n])*?)\/\*\* CHECK_CUSTOMER_END \*\*\//g;
var patternStart = '/** CHECK_CUSTOMER_START ';
var patternEnd = '/** CHECK_CUSTOMER_END **/';

function replace (source, query) {
    var customerId = query.customer || 'default';
    var startChar = source.indexOf(patternStart);
    if (startChar < 0) {
        return source;
    }
    var endChar = source.lastIndexOf(patternEnd) + patternEnd.length;
    var localSource = source.substr(startChar, endChar - startChar);
    var logLevel = parseInt(query.logLevel, 10)
    if (isNaN(logLevel)) {
        logLevel = 1;
    }
    if (logLevel >= 2) {
        console.log('__________START_________');
        console.log(localSource);
        console.log('___________END__________');
    }
    localSource = localSource.replace(regExp, function (str, customerGroup, contentGroup) {
        if (logLevel >= 2) {
            console.log('__________FRAG_START_________');
            console.log(contentGroup);
            console.log('___________FRAG_END_________');
        }
        if (customerGroup.indexOf(customerId) === -1) {
            if (logLevel >= 1) {
                console.log(`Code block ${customerGroup} with length of ${contentGroup.length} characters for ${customerId} excluded`);
            }
            return '';
        }
        if (logLevel >= 1) {
            console.log(`Code block ${customerGroup} with length of ${contentGroup.length} characters for ${customerId} included`);
        }
        return contentGroup;
    });
    source = source.substr(0, startChar) + localSource + source.substr(endChar);
    return source;
}

module.exports = function (source) {
    this.cacheable && this.cacheable();
    var query = loaderUtils.parseQuery(this.query);
    source = replace(source, query);
    return source;
};
