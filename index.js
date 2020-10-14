const loaderUtils = require('loader-utils');
const path = require('path');
const regExp = /\/\*\* CHECK_CUSTOMER_START (\[.*?\]) \*\*\/((.|[\r\n])*?)\/\*\* CHECK_CUSTOMER_END \*\*\//g;
const patternStart = '/** CHECK_CUSTOMER_START ';
const patternEnd = '/** CHECK_CUSTOMER_END **/';

const getIndexiesStr = (str, customer, offset = 0) => {
    const index = str.indexOf(customer, offset);
    const startIndex = index - 1;
    const endIndex = customer.length + index;
    if (index > -1) {
        const startChar = str[startIndex];
        const endChar = str[endIndex];
        if (
          !(startChar === ',' || startChar === ' ' || startChar === '[' || startChar === '!') ||
          !(endChar === ',' || endChar === ' ' || endChar === ']')
        ) {
            return getIndexiesStr(str, customer, endIndex);
        }
    }
    return {
        index,
        startIndex,
    }
}

function replace(source, query, fileName) {
    const customerId = query.customer || 'default';
    const startChar = source.indexOf(patternStart);
    if (startChar < 0) {
        return source;
    }
    const endChar = source.lastIndexOf(patternEnd) + patternEnd.length;
    let localSource = source.substr(startChar, endChar - startChar);
    let logLevel = parseInt(query.logLevel, 10)
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
        const { index, startIndex } = getIndexiesStr(customerGroup, customerId);

        const startsWithNot = index > 0 && customerGroup[startIndex] === '!';
        const haveSomeNegativeCustomerCondition = customerGroup.indexOf('!') !== -1;

        const customerFound = index > -1;
        const customerConditionSuccess = (!customerFound && haveSomeNegativeCustomerCondition) ||
          (customerFound && !startsWithNot);

        if (!customerConditionSuccess) {
            if (logLevel >= 2) {
                console.log(`Code block ${customerGroup} with length of ${contentGroup.length} characters for ${customerId} excluded from ${fileName}`);
            }
            let res = '';
            for (let ri = 0; ri < str.length; ri++) {
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
        let customerStub = '';
        for (let ci = 0; ci < customerGroup.length; ci++) {
            customerStub += '*';
        }
        return'/**************************' + customerStub + '*/' + contentGroup + '/************************/';
    });
    return source.substr(0, startChar) + localSource + source.substr(endChar);
}

module.exports = function (source, map) {
    this.cacheable && this.cacheable();
    const query = loaderUtils.getOptions(this);
    const fileName = path.basename(this.resourcePath);
    source = replace(source, query, fileName);
    this.callback(null, source, map);
};
