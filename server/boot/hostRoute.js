'use strict'
module.exports = (app) => {
    const CommonResponse = require('../util/CommonResponse')
    const host = app.models.host;
    const accessToken = app.models.AccessToken;
    const agency = app.models.agency;
    const account = app.models.account;
    const loan = app.models.loan;
    const wallet = app.models.wallet;
    const interest = app.models.interest;
    const utils = require('../util/Utils')
    const Q = require('q');

    app.post('/api/host/addHost', (req, res) => {
        var token = req.body.token;
        var email = req.body.email;
        var phoneNumber = req.body.phone_number;
        var address = req.body.address;
        var name = req.body.name;
        var avatar = req.body.user_photo;
        var IDNumber = req.body.id_number;
        var IDPhoto1 = req.body.id_photo_1;
        var IDPhoto2 = req.body.id_photo_2;
        var hostTemp;
        account.find({ 'where': { 'email': email } })
            .then(accounts => {
                console.log('accounts', accounts)
                if (accounts.length != 0) {
                    var err = "email is duplicated!"
                    var response = new CommonResponse("fail", "", err)
                    console.log("response", response)
                    res.json(response)
                } else {
                    utils.checkToken(token)
                        .then(token => {
                            console.log('token', token)
                            return host.create({
                                email: email,
                                phoneNumber: phoneNumber,
                                address: address,
                                name: name,
                                avatar: avatar,
                                IDNumber: IDNumber,
                                IDPhoto1: IDPhoto1,
                                IDPhoto2: IDPhoto2,
                                agencyId: token.userId
                            })
                        })
                        .then(host => {
                            console.log(host)
                            hostTemp = host;
                            return wallet.create({
                                type: 1,
                                balance: 0.0,
                                ownerId: host.id
                            })
                        })
                        .then((wallet) => {
                            console.log('wallet', wallet)
                            var data = hostTemp;
                            var response = new CommonResponse("success", "", data)
                            console.log("response", response)
                            res.json(response)
                        })
                        .catch(err => {
                            var response = new CommonResponse("fail", "", err)
                            console.log("response", response)
                            res.json(response)
                        })
                }
            })
            .catch(err => {
                var response = new CommonResponse("fail", "", err)
                console.log("response", response)
                res.json(response)
            })
    })

    app.post('/api/host/getHost', (req, res) => {
        var hostId = req.body.id;
        var token = req.body.token;
        var result;
        host.findOne({ where: { id: hostId } })
            .then(host => {
                let money = 0, next_day = 'NA', next_money = 0, number_registed = 0, number_current = 0, number_complete = 0, total_debt = 0;
                wallet.findOne({ where: { ownerId: host.id } })
                    .then(wallet => {
                        money = wallet.balance;
                        return loan.find({ where: { hostId: hostId, status: 0 } })
                    })
                    .then(loanResult => {
                        number_registed = loanResult.length;
                        return loan.find({ where: { hostId: hostId, status: 2 } })
                    })
                    .then(loanResult => {
                        number_complete = loanResult.length;
                        return loan.find({ where: { hostId: hostId, status: 1 } })
                    })
                    .then(loan => {
                        number_current = loan.length;
                        total_debt = loan.amount;
                        return interest.find({ where: { loanId: loan.id, status: 0 } })
                    })
                    .then(interests => {
                        if (interests.length > 0) {
                            next_day = interests[0].date;
                            next_money = ((interests[0].money) / 100).toFixed(2)
                        }
                    })
                    .catch(err => {
                        var response = new CommonResponse("fail", "", err)
                        console.log("response", response)
                    })
                result = {
                    id: host.id,
                    name: host.name,
                    avatar: host.avatar,
                    email: host.email,
                    available_money: money,
                    next_interest_date: next_day,
                    next_interest_money: next_money,
                    phone_number: host.phoneNumber,
                    address: host.address,
                    number_registered_loan: number_registed,
                    number_completed_loan: number_complete,
                    number_current_loan: number_current,
                    total_debt_money: total_debt
                }
                var data = { host: result }
                var response = new CommonResponse("success", "", data)
                console.log("response", response)
                res.json(response)
            })
            .catch(err => {
                var response = new CommonResponse("fail", "", err)
                console.log("response", response)
                res.json(response)
            })
    })

    app.post('/api/host/listHost', (req, res) => {
        var token = req.body.token;
        var area;
        var result = [];
        accessToken.findOne({ where: { id: token } })
            .then(token => {
                return agency.findOne({ where: { id: token.userId } })
            })
            .then(agency => {
                area = agency.area;
                return host.find({ where: { agencyId: agency.id } })
            })
            .then(hosts => {
                var promises = [];
                hosts.forEach(host => {
                    let money = 0, next_day = 'NA', next_money = 0, number_registed = 0, number_current = 0, number_complete = 0, total_debt = 0;
                    promises.push(wallet.findOne({ where: { ownerId: host.id } })
                        .then(wallet => {
                            money = wallet.balance;
                            return loan.find({ where: { hostId: host, status: 0 } })
                        })
                        .then(loans => {
                            number_registed = loans.length;
                            return loan.find({ where: { hostId: host, status: 2 } })
                        })
                        .then(loans => {
                            number_complete = loans.length;
                            return loan.find({ where: { hostId: host, status: 1 } })
                        })
                        .then(loans => {
                            number_current = loans.length;
                            total_debt = loan.amount;
                            return interest.find({ where: { loanId: loan.id, status: 0 } })
                        })
                        .then(interests => {
                            if (interests.length > 0) {
                                next_day = interests[0].date;
                                next_money = ((interests[0].money) / 100).toFixed(2)
                            }
                            result.push({
                                id: host.id,
                                name: host.name,
                                avatar: host.avatar,
                                email: host.email,
                                available_money: money,
                                next_interest_date: next_day,
                                next_interest_money: next_money,
                                phone_number: host.phoneNumber,
                                address: host.address,
                                number_registered_loan: number_registed,
                                number_completed_loan: number_complete,
                                number_current_loan: number_current,
                                total_debt_money: total_debt
                            })
                        })
                        .catch(err => {
                            var response = new CommonResponse("fail", "", err)
                            console.log("response", response)
                        })
                    )
                })
                Q.all(promises)
                    .then(() => {
                        var data = { list_hosts: result, agency_area: area }
                        var response = new CommonResponse("success", "", data)
                        console.log("response", response)
                        res.json(response)
                    })

            })
            .catch(err => {
                var response = new CommonResponse("fail", "", err)
                console.log("response", response)
                res.json(response)

            })
    })
    app.post('/api/loan/calculatePackage', (req, res) => {
        var money = req.body.money;
        var pack1, pack2, pack3;
        pack1 = Math.floor(money * 0.1);
        pack2 = Math.floor(money * 0.3);
        pack3 = money - pack1 - pack2;
        var arr = [pack1, pack2, pack3];
        var data = { listMoney: arr }

        var response = new CommonResponse("success", "", data)
        console.log("response", response)
        res.json(response)
    })

    app.post('/gethost', (req,res)=>{
        var email = req.body.email;
        host.findOne({where : {email : email}})
        .then(hostResult => {
            res.json(hostResult)
        })
        .catch(err=>{
            res.json(err)
        })
    })
}