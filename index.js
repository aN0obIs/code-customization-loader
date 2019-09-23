var loaderUtils = require('loader-utils');
var path = require('path');
var regExp = /\/\*\* CHECK_CUSTOMER_START (\[.*?\]) \*\*\/((.|[\r\n])*?)\/\*\* CHECK_CUSTOMER_END \*\*\//g;
var patternStart = '/** CHECK_CUSTOMER_START ';
var patternEnd = '/** CHECK_CUSTOMER_END **/';

/**
 *
 * @param {String} customerGroup - "[customerOne, customerTwo, customerThree]"
 * @param {String} customerId - "customerTwo", for example
 * @param {Number} index - index of first customerId symbol
 * @returns {Boolean}
 */
function isCustomerIdStartedProperly(customerGroup, customerId, index) {
    return customerGroup[index - 1] === ',' ||
      customerGroup[index - 1] === ' ' ||
      customerGroup[index - 1] === '[';
}

/**
 *
 * @param {String} customerGroup - "[customerOne, customerTwo, customerThree]"
 * @param {String} customerId - "customerTwo", for example
 * @param {Number} index - index of first customerId symbol
 * @returns {Boolean}
 */
function isCustomerIdEndedProperly(customerGroup, customerId, index) {
    return customerGroup[customerId.length + index] === ',' ||
      customerGroup[customerId.length + index] === ' ' ||
      customerGroup[customerId.length + index] === ']';
}

function replace(source, query, fileName) {
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
    if (logLevel >= 3) {
        console.log('__________START_________');
        console.log(localSource);
        console.log('___________END__________');
    }
    localSource = localSource.replace(regExp, function (str, customerGroup, contentGroup, __, offset) {
        if (logLevel >= 3) {
            console.log('__________FRAG_START_________');
            console.log(contentGroup);
            console.log('___________FRAG_END_________');
        }
        var index = customerGroup.indexOf(customerId);
        // replace code block with **** by condition
        if (
          // there is no customerId AND no negative conditions within customers group
          (index === -1 && customerGroup.indexOf('!') === -1) ||
          // customerId found in group
          (index > -1 &&
            (index > 0 && customerGroup[index - 1] === '!' &&
              isCustomerIdEndedProperly(customerGroup, customerId, index) ||
              ((index > 0 &&
                !isCustomerIdStartedProperly(customerGroup, customerId, index)) ||
                (customerGroup.length > customerId.length + index &&
                  !isCustomerIdEndedProperly(customerGroup, customerId, index))))
        )) {
            if (logLevel >= 2) {
                console.log(`Code block ${customerGroup} with length of ${contentGroup.length} characters for ${customerId} excluded from ${fileName}`);
            }
            var res = '';
            for (var ri = 0; ri < str.length; ri++) {
                if (ri > 2 && ri < (str.length - 3) && str[ri] !== '\n' && str[ri] !== '\r' && str[ri] !== '\t') {
                    res += '*';
                } else {
                    res += str[ri];
                }
            }
            return res;
        }
        if (logLevel >= 1) {
            console.log(`Code block ${customerGroup} with length of ${contentGroup.length} characters for ${customerId} included in ${fileName}`);
        }
        var custStub = '';
        for (var ci = 0; ci < customerGroup.length; ci++) {
            custStub += '*';
        }
        return'/**************************' + custStub + '*/' + contentGroup + '/************************/';
    });
    var result = source.substr(0, startChar) + localSource + source.substr(endChar);
    return result;
}

module.exports = function (source, map) {
    this.cacheable && this.cacheable();
    var query = loaderUtils.getOptions(this);
    var fileName = path.basename(this.resourcePath);
    source = replace(source, query, fileName);
    this.callback(null, source, map);
};
