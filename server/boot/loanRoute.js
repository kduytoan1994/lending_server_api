'use strict'
module.exports = (app) => {
    const CommonResponse = require('../util/CommonResponse')
    const util = require('../util/Utils')
    const Q = require('q')
    const loan = app.models.loan;
    const pack = app.models.pack;
    const host = app.models.host;
    const interest = app.models.interest;
    const agency = app.models.agency;
    const lend = app.models.lending;
    const interest_money = app.models.interest_money;
    app.post('/api/loan/addLoan', (req, res) => {
        var interest;
        var total = req.body.amount;
        if (total < 30) {
            interest = 2
        } else if (total < 100) {
            interest = 5
        } else {
            interest = 15
        }
        var payload = {
            hostId: req.body.hostId,
            name: req.body.name,
            amount: req.body.amount,
            called: 0,
            status: 0,
            typeHome: req.body.typeHome,
            address: req.body.address,
            descriptions: req.body.descriptions,
            start_time: req.body.dueDate,
            range_time: req.body.rangeTime,
            photos: req.body.list_photos,
            interest: interest,
            end_time: req.body.endDate
        }
        console.log('payload', payload)
        loan.create(payload, (err, loan) => {
            if (err) {
                console.log(err);
                return;
            }
            var amount1 = Math.floor(0.1 * loan.amount);
            var amount2 = Math.floor(0.3 * loan.amount);
            var ammout3 = loan.amount - amount2 - amount1;
            pack.create({
                loanId: loan.id,
                status: 0,
                amount: amount1
            }, (err, pack1) => {
                if (err)
                    console.log(err)
                else
                    console.log('pack1: ', pack1)
            })
            pack.create({
                loanId: loan.id,
                status: 0,
                amount: amount2
            }, (err, pack2) => {
                if (err)
                    console.log(err)
                else
                    console.log('pack2: ', pack2)
            })
            pack.create({
                loanId: loan.id,
                status: 0,
                amount: ammout3
            }, (err, pack3) => {
                if (err)
                    console.log(err)
                else
                    console.log('pack3: ', pack3)
            })
            var response = new CommonResponse("success", "create loan success", loan)
            console.log('response', response)
            res.json(response)
        })
    })
    app.post('/api/loan/listLoan', (req, res) => {
        var type = req.body.type;
        var page = req.body.page;
        var perPage = req.body.perPage;
        var listLoan = [];
        var leng = 0;
        console.log('req.body ', req.body)
        console.log('type ', type);
        if (type == 'All results') {
            var promises1 = [];
            loan.find({ where: { status: 0 } })
                .then(loans => {
                    leng = loans.length;
                    var loanPerpage = loans.slice((page - 1) * perPage, page * perPage);
                    console.log('loans', loans)
                    console.log('loanPerpage', loanPerpage)
                    for (var i = 0; i < loanPerpage.length; i++) {
                        promises1.push(util.convertLoan(loanPerpage[i].id)
                            .then(loanHost => {
                                listLoan.push(loanHost)
                            })
                            .catch(err => {
                                var response = new CommonResponse("error", "", err)
                                console.log("response", response)
                                res.json(response)
                            })
                        )
                    }
                    Q.all(promises1)
                        .then(() => {
                            var total_page
                            if (leng % perPage == 0) {
                                total_page = leng / perPage
                            } else {
                                total_page = Math.floor(leng / perPage) + 1
                            }
                            var data = {
                                list_loans: listLoan,
                                total_page: total_page
                            }
                            var response = new CommonResponse("success", "", data)
                            console.log("response", response)
                            res.json(response)
                        })
                })
                .catch(err => {
                    var response = new CommonResponse("error", "", err)
                    console.log("response", response)
                    res.json(response)
                })
        } else {
            var promises2 = [];
            loan.find({ 'where': { 'typeHome': type, 'status': 0 } })
                .then(loans => {
                    leng = loans.length;
                    var loanPerpage = loans.slice((page - 1) * perPage, page * perPage);
                    for (var i = 0; i < loanPerpage.length; i++) {
                        promises2.push(util.convertLoan(loanPerpage[i].id)
                            .then(loanHost => {
                                listLoan.push(loanHost)
                            })
                            .catch(err => {
                                var response = new CommonResponse("error", "", err)
                                console.log("response", response)
                                res.json(response)
                            })
                        )
                    }
                    Q.all(promises2)
                        .then(() => {
                            var total_page
                            if (leng % perPage == 0) {
                                total_page = leng / perPage
                            } else {
                                total_page = Math.floor(leng / perPage) + 1
                            }
                            var data = {
                                list_loans: listLoan,
                                total_page: total_page
                            }
                            var response = new CommonResponse("success", "", data)
                            console.log("response", response)
                            res.json(response)
                        })
                })
                .catch(err => {
                    var response = new CommonResponse("error", "", err)
                    console.log("response", response)
                    res.json(response)
                })
        }
    })
    app.post('/api/loan/loan_host', (req, res) => {
        var loanTemp;
        loan.findOne({ id: req.body.id })
            .then(loan => {
                loanTemp = loan;
                console.log(loan)
                console.log('hostId', loan.hostId)
                return host.findOne({ id: loan.hostId })
            })
            .then(host => {
                console.log("host", host);
                console.log("loan", loanTemp);
                var data = {
                    id: loanTemp.id,
                    name: loanTemp.name,
                    address: loanTemp.address,
                    type: loanTemp.typeHome,
                    list_photo: loanTemp.photos,
                    host_name: host.name,
                    host_address: host.address,
                    phone_number: host.phoneNumber
                }
                var response = new CommonResponse("success", "", data)
                console.log("response", response)
                res.json(response)
            })
            .catch(err => {
                var response = new CommonResponse("error", "", err)
                console.log("response", response)
                res.json(response)
            })
    })
    app.post('/api/loan/packages', (req, res) => {
        var packageTemp;
        var packResults = [];
        var loanId = req.body.id;
        pack.find({ where: { loanId: loanId } })
            .then(packages => {
                console.log('packages.length', packages.length)
                packages.forEach(packItem => {
                    console.log('adfdsfs', packItem)
                    let id = packItem.id;
                    let money = packItem.amount;
                    let chosen = packItem.status;
                    let result = {
                        id: id,
                        money: money,
                        chosen: chosen
                    }
                    packResults.push(result)
                })
                return loan.findById(loanId)
            })
            .then(loan => {
                return util.convertLoan(loanId)
            })
            .then(loan => {
                var data = {
                    loan: loan,
                    list_packages: packResults
                }
                var response = new CommonResponse("success", "", data)
                console.log("response", response)
                res.json(response)
            })
            .catch(err => {
                var response = new CommonResponse("error", "", err)
                console.log("response", response)
                res.json(response)
            })
    })
    app.post('/api/loan/homestay', (req, res) => {
        var loanTemp;
        var id = req.body.id;
        loan.findOne({ id: id })
            .then(loan => {
                loanTemp = loan;
                return host.findOne(loan.hostId)
            })
            .then(host => {
                var data = {
                    homestay: {
                        id: loanTemp.id,
                        type: loanTemp.typeHome,
                        name: loanTemp.name,
                        address: loanTemp.address,
                        description: loanTemp.descriptions,
                        list_photos: loanTemp.photos,
                        host_name: host.name,
                        host_address: host.address,
                        phonenumber: host.phoneNumber
                    }
                }
                var response = new CommonResponse("success", "", data)
                console.log("response", response)
                res.json(response)
            })
            .catch(err => {
                var response = new CommonResponse("error", "", err)
                console.log("response", response)
                res.json(response)
            })
    })
    app.post('/api/loan/fullInformation', (req, res) => {
        var id = req.body.id;
        var loanTemp, list_packages, hostTemp;

        loan.findOne({ where: { id: id } })
            .then(loan => {
                console.log('loan.id', loan.id)
                loanTemp = loan;
                return pack.find({ where: { loanId: loanTemp.id } });
            })
            .then(packages => {
                return util.convertPackage(packages);
            })
            .then(result => {
                console.log('dafdsfsffs', result);
                list_packages = result;
                return host.findOne({ id: loanTemp.hostId })
            })
            .then(host => {
                hostTemp = host;
                return util.convertLoan(loanTemp.id)
            })
            .then(loanHost => {
                var homestay = {
                    id: loanTemp.id,
                    type: loanTemp.typeHome,
                    name: loanTemp.name,
                    address: loanTemp.address,
                    description: loanTemp.descriptions,
                    list_photos: loanTemp.photos,
                    host_name: hostTemp.name,
                    host_address: hostTemp.address,
                    phonenumber: hostTemp.phoneNumber

                }
                var data = {
                    loan: loanHost,
                    list_packages: list_packages,
                    homestay: homestay
                }
                var response = new CommonResponse("success", "", data)
                console.log("response", response)
                res.json(response)
            })
            .catch(err => {
                var response = new CommonResponse("error", "", err)
                console.log("response", response)
                res.json(response)
            })
    })

    app.post('/api/loan/getTableInterest', (req, res) => {
        interest_money.find()
            .then(result => {
                var response = new CommonResponse("success", "", result)
                console.log("response", response)
                res.json(response)
            })
            .catch(err => {
                var response = new CommonResponse("error", "", err)
                console.log("response", response)
                res.json(response)
            })
    })

    app.post('/api/loan/deleteLoan', (req, res) => {
        var loanId = req.body.id;
        var token = req.body.token;
        var agencyTemp;
        util.checkToken(token)
            .then(token => {
                console.log('token', token)
                if (token != null) {
                    return agency.findById(token.userId)
                } else {
                    var response = new CommonResponse("error", "", "token invalid")
                    console.log("response", response)
                    res.json(response)
                }
            })
            .then(agency => {
                console.log('acen', agency)
                agencyTemp = agency
                if (agency == null) {
                    var response = new CommonResponse("error", "", "not a agency")
                    console.log("response", response)
                    res.json(response)
                } else {
                    return loan.findById(loanId);
                }
            })
            .then(loan => {
                return util.reCallAllMoneyOfLoan(loanId);
            })
            .then(result => {
                console.log('result', result)
                if (result == "success") {
                    return pack.destroyAll({ loanId: loanId })
                } else {
                    var response = new CommonResponse("error", "", "cannot delete loan")
                    console.log("response", response)
                    res.json(response)
                }

            })
            .then(result => {
                console.log('result 1 ', result)
                return interest.destroyAll({ loanId: loanId })
            })
            .then(result => {
                console.log('result 2 ', result)
                return lend.destroyAll({ loanId: loanId })
            })
            .then(result => {
                console.log('result 3 ', result)
                return loan.deleteById(loanId)
            })
            .then(result => {
                console.log('result 4 ', result)
                var response = new CommonResponse("success", "", result)
                console.log("response", response)
                res.json(response)
            })
            .catch(err => {
                var response = new CommonResponse("error", "", err)
                console.log("response", response)
                res.json(response)
            })
    })

    app.delete('/api/checkforeach', (req, res) => {
        loan.destroyAll({ id: req.body.id })
            .then(result => {
                res.json(result)
            })
            .catch(err => {
                res.json(err);
            })
    })
    app.post('/api/createInterestMoney', (req, res) => {
        var rate = req.body.rate;
        var money = req.body.money;
        interest_money.create({
            money: money,
            interest: rate
        })
            .then(result => {
                res.json(result)
            })
            .catch(err => {
                res.json(err)
            })
    })
}