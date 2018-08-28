'use strict';

module.exports = function(Host) {
    Host.validatesUniquenessOf('email');
};
