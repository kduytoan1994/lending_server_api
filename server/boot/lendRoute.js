'use strict'
module.exports = (app) => {
    const CommonResponse = require('../util/CommonResponse')
    const lend = app.models.lending;
    const loan = app.models.loan;
    const pack = app.models.pack;
    const interest = app.models.interest;
    const host = app.models.host;
    const Q = require('q');
    const util = require('../util/Utils')
    const constant = require('../constant')
    const investor = app.models.investor;
    const wallet = app.models.wallet;
    const AccessToken = app.models.AccessToken;
    const swig = require('swig');

    app.post('/api/lend/submitLend', (req, res) => {
        var idLoan;
        var listPackage = req.body.list_chosen_package;
        var promises = [];
        var total = 0;
        var access_token = req.body.token;
        var loanTemp, lendTemp, investorTemp;
        var isFull = false;
        console.log('fdafadfdfjur', req.body.token)
        AccessToken.findOne({ where: { id: access_token } }, (err, token) => {
            if (err || (token == null)) {
                var response = new CommonResponse("error", "", err)
                console.log("response", response)
                res.json(response)
            }
            else {
                console.log('listPackage[0]', listPackage)
                for (var i = 0; i < listPackage.length; i++) {
                    console.log(listPackage[i])
                    promises.push(pack.findById(listPackage[i])
                        .then(pack => {
                            total += pack.amount;
                            idLoan = pack.loanId
                            pack.status = 1;
                            pack.save(err => {
                                if (err) {
                                    var response = new CommonResponse("failed", "", err)
                                    console.log("response", response)
                                    res.json(response)
                                }
                            })
                        })
                        .catch(err => {
                            console.log(err)
                        })
                    )
                }
                Q.all(promises)
                    .then(() => {
                        console.log('totalf đafddfds', total)
                        return loan.findOne({ where: { id: idLoan } })
                    })
                    .then(loan => {
                        loan.called += total;
                        //gọi đủ vốn , chuyển loan status =1 
                        if (loan.called == loan.amount) {
                            isFull = true;
                            loan.status = 1;
                        }
                        return loan.save();
                    })
                    .then(loan => {
                        console.log("token.userId :", token)
                        loanTemp = loan;
                        var statusLend = 0;
                        if (loan.status == 1) {
                            statusLend = 1;
                        }
                        return lend.create({
                            investorId: token.userId,
                            amount: total,
                            start_time: loanTemp.start_time,
                            end_time: loanTemp.end_time,
                            loanId: idLoan,
                            status: statusLend
                        })
                    })
                    .then(lend => {
                        lendTemp = lend;
                        console.log("investor ID :", lend.investorId)
                        return investor.findById(lend.investorId);
                    })
                    .then(investor => {
                        console.log('investorID...', investor.id);
                        investorTemp = investor;
                        // console.log('investorID...',investor.id);
                        return util.chageMoney(investor.id, constant.ID_SYSTEM, total)
                    })
                    .then(result => {
                        if (result != 'success') {
                            var response = new CommonResponse("fail", "", "cannot exchange money")
                            console.log("response", response)
                            res.json(response)
                            return;
                        }
                        let rate;
                        var money = loanTemp.amount;
                        if (money < 30) {
                            rate = 2;
                        } else if (money < 80) {
                            rate = 5
                        } else {
                            rate = 15
                        }

                        let promisesInterest = [];
                        var range_time = loanTemp.range_time;
                        for (var j = 1; j <= range_time; j++) {
                            let day;
                            promisesInterest.push(
                                dayAfterSomeMonth(lendTemp.start_time, j)
                                    .then(result => {
                                        day = result.result;
                                        return interest.create({
                                            order: j,
                                            date: day,
                                            money: ((total * rate) / 100 + total / range_time).toFixed(2),
                                            rate: rate,
                                            loanId: loanTemp.id,
                                            lendingId: lendTemp.id,
                                            status: 0
                                        })
                                    })
                                    .catch(err => {
                                        var response = new CommonResponse("fail", "", err)
                                        console.log("response", response)
                                        res.json(response)
                                    })
                            )
                        }
                        return Q.all(promisesInterest);
                    })
                    .then(() => {
                        return host.findById(loanTemp.hostId);
                    })
                    .then(hostResult => {
                        var time = new Date().getDate() + '/' + new Date().getMonth() + '/' + new Date().getFullYear()
                        var callpercent = ((loanTemp.called/loanTemp.amount)*100).toFixed(2)
                        var payLoad = {
                            loan_range_time: loanTemp.range_time,
                            loan_name: loanTemp.name,
                            loan_host_name: hostResult.name,
                            loan_money: loanTemp.amount,
                            loan_due_date: loanTemp.start_time,
                            loan_called: callpercent,
                            investor_name: investorTemp.name,
                            investor_lend_money: lendTemp.amount,
                            investor_date_lend: time
                        }
                        console.log('payload ', payLoad)
                        var html = swig.renderFile('../lending_server_test_1-master/server/mailTemplate/register_lend_success.ejs', payLoad);
                        lend.sendEmail("toan.kd@samsung.com", html, "register lend success");
                        var data;
                        if (isFull == true) {
                            util.updateFullLoan(loanTemp.id)
                                .then(result => {
                                    console.log('123fdfds', lendTemp)
                                    data = lendTemp;
                                    var response = new CommonResponse("success", "", data)
                                    console.log("response", response)
                                    res.json(response)
                                })
                                .catch(err => {
                                    var response = new CommonResponse("fail", "", err)
                                    console.log("response", response)
                                    res.json(response)
                                })
                        } else {
                            data = lendTemp;
                            var response = new CommonResponse("success", "", data)
                            console.log("response", response)
                            res.json(response)
                        }
                    })
                    .catch(err => {
                        var response = new CommonResponse("fail", "", err)
                        console.log("response", response)
                        res.json(response)
                    })
            }
        })

    })
    app.get('/total', (req, res) => {
        var payload = {
            loan_range_time: 6,
            loan_name: 'loanTemp.name',
            loan_host_name: 'ostResult.nahme',
            loan_money: 123,
            loan_due_date: "2/3/4",
            loan_called: 5,
            investor_name: 'investorTemp.name',
            investor_lend_money: 19,
            investor_date_lend: 2
        }
        var html = swig.renderFile('../lending_server_test_1-master/server/mailTemplate/register_lend_success.ejs', payload);
        lend.sendEmail("toan.kd@samsung.com", html, "register lend success")
            .then(result => {
                res.json(result)
            })
            .catch(err => {
                res.json(err)
            })
    })

    var dayAfterSomeMonth = (day, range_time) =>
        new Promise((resolve, reject) => {
            var dayTemp = day.split('/');
            var year = parseInt(dayTemp[2]);
            var month = parseInt(dayTemp[1]);
            var date = parseInt(dayTemp[0]);
            var monthTemp = month + range_time;
            var monthResult, yearResult;
            if (monthTemp < 10) {
                monthResult = '0' + monthTemp
                yearResult = year + '';
            } else if (monthTemp <= 12) {
                monthResult = monthTemp + '';
                yearResult = year + '';
            } else if (monthTemp < 22) {
                monthResult = '0' + (monthTemp - 12).toString();
                yearResult = (year + 1).toString();
            } else {
                monthResult = monthTemp + '';
                yearResult = (year + 1) + ''
            }
            var result = date + '/' + monthResult + '/' + yearResult
            console.log('result', result)
            resolve({ result: result })
        })
    app.post('/sendmail', (req, res) => {
        wallet.findOne({ where: { ownerId: "5b83b03c2afef93a80d2f051" } })
            .then(wallet => {
                res.json(wallet)
            })
            .catch(err => {
                res.json(err)
            })
    })

    app.post('/lend/payInterest', (req, res) => {
        var token = req.body.token;
        var money = req.body.money;
        var interestId = req.body.interestId;
        var hostTemp, interestTemp;

        interest.findById(interestId)
            .then(interestResult => {
                interestResult.status = 1;
                return loan.findById(interest.loanId)
            })
            .then(loanResult => {
                loanTemp = loanResult;
                return host.findById(loanResult.hostId)
            })
            .then(hostResult => {
                hostTemp = hostResult;
                return lend.findById(interestTemp.lendId)
            })
            .then(lendResult => {
                return investor.findById(lendResult.investorId)
            })
            .then(investor => {
                return util.chageMoney(hostTemp.id, investor.id, money)
            })
            .then(result => {
                var response = new CommonResponse("success", "", result)
                console.log("response", response)
                res.json(response)
            })
            .catch(err => {
                var response = new CommonResponse("fail", "", err)
                console.log("response", response)
                res.json(response)
            })
    })
}