'use strict';
const app = require('../../server/server')
module.exports = function (Lending) {
    Lending.sendEmail = (receiver , html , mailType) =>
        new Promise((resolve, reject) => {
            Lending.app.models.Email.send({
                to: receiver,
                from: "asio.lending@gmail.com",
                subject: mailType,
                text: 'my text',
                html: html
            },function (err, mail) {
                if (err) {
                  console.log('mail not send : ' + err);
                }
                if (mail) {
                  console.log('email sent!');
                }
            })
        })
};
