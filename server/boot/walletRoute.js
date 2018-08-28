'use strict'
module.exports = (app) => {
    const CommonResponse = require('../util/CommonResponse')
    const wallet = app.models.wallet;
    const Q = require('q');
    const AccessToken = app.models.AccessToken;
    const lend = app.models.lending;
    const interest = app.models.interest;
    const host = app.models.host;
    const investor = app.models.investor;
    const agency = app.models.agency;
    const interestMoney = app.models.interest_money;
    const loan = app.models.loan;
    const pack = app.models.pack;
    const withdraw = app.models.withdraw;
    const Utils = require('../util/Utils')

    app.post('/api/wallet/withdraw/host', (req, res) => {
        console.log(req.body)
        var money = req.body.money;
        var hostId = req.body.id;
        var access_token = req.body.token;
        var name_bank = req.body.name_bank;
        var bank_branch = req.body.bank_branch;
        var account_number = req.body.account_number;
        var name_receiver = req.body.name_receiver;
        console.log('logs', money, hostId, name_bank, bank_branch, account_number)
        AccessToken.findOne({ where: { id: access_token } })
            .then(AccessToken => {
                if (AccessToken == null) {
                    var response = new CommonResponse("fail", "", "token fail")
                    console.log("response", response)
                    res.json(response)
                } else
                    return wallet.findOne({ where: { ownerId: hostId } })
            })
            .then(wallet => {

                if (money <= wallet.balance) {
                    var balance = wallet.balance * 1000000;
                    var sub = money * 1000000;
                    wallet.balance = parseFloat(((balance - sub) / 1000000).toFixed(2));
                    return wallet.save();
                } else {
                    var response = new CommonResponse("fail", "", "not enough money!")
                    res.json(response)
                }
            })
            .then(wallet => {
                return withdraw.create({
                    money: money,
                    name_bank: name_bank,
                    bank_branch: bank_branch,
                    account_number: account_number,
                    name_receiver: name_receiver,
                    ownerId: hostId
                })
            })
            .then(withdraw => {
                var response = new CommonResponse("success", "", withdraw)
                console.log("response", response)
                res.json(response)

            })
            .catch(err => {
                var response = new CommonResponse("fail", "", err)
                console.log("response", response)
                res.json(response)
            })
    })

    app.post('/api/wallet/withdraw/investor', (req, res) => {
        var money = req.body.money;
        var agencyId;
        var access_token = req.body.token;
        var name_bank = req.body.name_bank;
        var bank_branch = req.body.bank_branch;
        var account_number = req.body.account_number;
        var name_receiver = req.body.name_receiver;

        AccessToken.findOne({ where: { id: access_token } })
            .then(AccessToken => {
                if (AccessToken == null) {
                    var response = new CommonResponse("fail", "", "token fail")
                    console.log("response", response)
                    res.json(response)
                } else {
                    agencyId = AccessToken.userId;
                    return wallet.findOne({ where: { ownerId: AccessToken.userId } })
                }
            })
            .then(wallet => {
                if (money <= wallet.balance) {
                    var balance = wallet.balance * 1000000;
                    var sub = money * 1000000;
                    wallet.balance = parseFloat(((balance - sub) / 1000000).toFixed(2));
                    return wallet.save();
                } else {
                    var response = new CommonResponse("fail", "", "not enough money!")
                    res.json(response)
                }
            })
            .then(wallet => {
                return withdraw.create({
                    money: money,
                    name_bank: name_bank,
                    bank_branch: bank_branch,
                    account_number: account_number,
                    name_receiver: name_receiver,
                    ownerId: agencyId
                })
            })
            .then(withdraw => {
                var response = new CommonResponse("success", "", withdraw)
                console.log("response", response)
                res.json(response)

            })
            .catch(err => {
                var response = new CommonResponse("fail", "", err)
                console.log("response", response)
                res.json(response)
            })

    })

    app.post('/api/wallet/getBalanceHost', (req, res) => {
        var hostId = req.body.id_host;
        wallet.findOne({ where: { ownerId: hostId } })
            .then(wallet => {
                var data = { available_money: wallet.balance }
                var response = new CommonResponse("success", "", data)
                console.log("response", response)
                res.json(response)
            })
    })
    app.post('/api/wallet/getBalanceInvestor', (req, res) => {
        var token = req.body.token;
        Utils.checkToken(token)
            .then(token => {
                if (token != null) {
                    return wallet.findOne({ where: { ownerId: token.userId } })
                }
            })
            .then(wallet => {
                var data = { available_money: wallet.balance }
                var response = new CommonResponse("success", "", data)
                console.log("response", response)
                res.json(response)
            })
    })

    app.post('/api/wallet/getListRegisteredLoan', (req, res) => {
        var token = req.body.token;
        var hostId = req.body.id;
        var kq = [];

        AccessToken.findOne({ where: { id: token } })
            .then(token => {
                return loan.find({ 'where': { 'hostId': hostId, 'status': 0 } })
            })
            .then(loans => {
                if (loans.length == 0) {
                    var data = {}
                    var response = new CommonResponse("success", "", data)
                    console.log("response", response)
                    res.json(response);
                } else {
                    var promises = [];
                    var packTemp, called, loanAmount;
                    loans.forEach(loanItem => {
                        console.log('loanItem', loanItem)
                        promises.push(pack.find({ where: { loanId: loanItem.id } })
                            .then(packs => {
                                console.log('packLoanItem', packs)
                                packTemp = packs;
                                return Utils.convertLoan(loanItem.id);
                            })
                            .then(result => {
                                if (loanItem == null) {
                                    result = {};
                                    called = 0;
                                } else {
                                    called = loanItem.called
                                    loanAmount = loanItem.amount;
                                    console.log('loanTempCalled', called);
                                    console.log('loanTempAmount', loanAmount);
                                }
                                if (packTemp == null || packTemp.length == 0) {
                                    packTemp = []
                                }
                                var data = {
                                    loan: result,
                                    list_packages: packTemp,
                                    called: ((called / loanAmount) * 100).toFixed(0)
                                }
                                kq.push(data)
                            })
                            .catch(err => {
                                var response = new CommonResponse("fail", "", err)
                                console.log("response", response)
                                res.json(response)
                            })
                        )
                    })
                    Q.all(promises)
                        .then(() => {
                            var response = new CommonResponse("success", "", kq)
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

    app.post('/api/wallet/getListOnGoingLoan', (req, res) => {
        var token = req.body.token;
        var hostId = req.body.id_host;
        var loanTemp, lendTemp;
        var kq = [];
        var total_loan_money, total_money_will_pay = 0, total_money_paid = 0, next_interest_money = 0, next_interest_date = '', listInterest;
        AccessToken.findOne({ where: { id: token } })
            .then(token => {
                return loan.find({ 'where': { 'hostId': hostId, 'status': 1 } })
            })
            .then(loans => {
                if (loans != null && loans.length > 0) {
                    loans.forEach(loanItem => {
                        loan.findById(loanItem.id)
                            .then(loan => {
                                console.log('loan', loan)
                                loanTemp = loan;
                                return lend.find({ where: { loanId: loan.id } })
                            })
                            .then(lends => {
                                console.log('lends23', lends)
                                if (lends != null && lends.length > 0) {
                                    var promises = [];
                                    lends.forEach(lend => {
                                        promises.push(getInterestNextMonthOfLend(lend.id)
                                            .then(result => {
                                                var interests = result.interest;
                                                console.log('interest date', interests.date)
                                                next_interest_money += interests.money;
                                                next_interest_date = interests.date;

                                                return interest.find({ where: { lendingId: lend.id, status: 1 } })
                                            })
                                            .then(interests => {
                                                console.log('interests', interests)
                                                if (interests != null) {
                                                    interests.forEach(interest => {
                                                        total_money_will_pay += interest.money;
                                                    })
                                                    return interest.find({ where: { lendingId: lend.id, status: 2 } })
                                                }
                                            })
                                            .then(interests => {
                                                console.log('interests1', interests)
                                                if (interests != null) {
                                                    interests.forEach(interest => {
                                                        total_money_paid += interest.money;
                                                    })
                                                    return interest.find({ where: { lendingId: lend.id } })
                                                }
                                            })
                                            .then(interests => {
                                                console.log('interests2', interests)
                                                if (interests != null) {
                                                    listInterest = interests;
                                                    return Utils.convertLoan(loanTemp.id);
                                                }
                                            })
                                            .then(loanHost => {
                                                console.log('loanHost', loanHost)
                                                if (loanHost != null) {
                                                    var data = {
                                                        loan: loanHost,
                                                        total_loan_money: loanTemp.amount,
                                                        interest: loanTemp.interest,
                                                        start_time: loanTemp.start_time,
                                                        end_time: loanTemp.end_time,
                                                        total_money_will_pay: total_money_will_pay,
                                                        total_money_paid: total_money_paid,
                                                        next_interest_date: next_interest_date,
                                                        next_interest_money: next_interest_money,
                                                        list_interest: listInterest
                                                    }

                                                    kq.push(data)
                                                }
                                            })
                                            .catch(err => {
                                                var response = new CommonResponse("fail", "", err)
                                                console.log("response", response)
                                                res.json(response)
                                            })
                                        )
                                    })
                                    Q.all(promises)
                                        .then(() => {
                                            var response = new CommonResponse("success", "", kq)
                                            console.log("response 123", response)
                                            res.json(response)
                                        })
                                        .catch(err => {
                                            var response = new CommonResponse("fail", "", err)
                                            console.log("response", response)
                                            res.json(response)
                                        })
                                }

                            })
                    })
                } else {
                    var response = new CommonResponse("success", "", kq)
                    console.log("response", response)
                    res.json(response)
                }
            })
            .catch(err => {
                var response = new CommonResponse("fail", "", err)
                console.log("response", response)
                res.json(response)
            })
    })

    app.post('/api/wallet/getListCompletedLoan', (req, res) => {
        var token = req.body.token;
        var hostId = req.body.id;
        var result = [];
        var promises1 = [], promises2 = [];
        AccessToken.findOne({ where: { id: token } })
            .then(token => {
                return loan.find({ 'where': { 'hostId': hostId, 'status': 2 } })
            })
            .then(loans => {
                console.log('loan', loans)
                if (loans == null || loans.length == 0) {
                    var temp = []
                    var response = new CommonResponse("success", "", temp)
                    console.log("response", response)
                    res.json(response)
                    return;
                } else {
                    loans.forEach(loan => {
                        var loanTemp;
                        loanTemp = loan;
                        var total_loan_money, total_money_will_pay = 0, total_money_paid = 0, next_interest_money = 0, next_interest_date = '', listInterest;
                        promises1.push(lend.find({ where: { loanId: loanTemp.id } })
                            .then(lends => {
                                if (lends.length > 0) {
                                    lends.forEach(lend => {
                                        promise2.push(getInterestNextMonthOfLend(lend.id)
                                            .then(result => {
                                                var interest = result.interest;
                                                next_interest_money += interest.money;
                                                next_interest_date = interest.time;
                                                return getMoneyReceived(lend.id)
                                            })
                                            .then(total => {
                                                total_money_received += total.total;
                                                return getMoneyWillReceive(lend.Id)
                                            })
                                            .then(total => {
                                                total_money_will_pay += total.total;
                                            })
                                            .catch(err => {
                                                var response = new CommonResponse("fail", "", err)
                                                console.log("response", response)
                                                res.json(response)
                                            })
                                        )
                                    })
                                    Q.all(promises2)
                                        .then(() => {
                                            return interest.find({ where: { lendingId: lend.id } })
                                        })
                                }
                            })
                            .then(interests => {
                                listInterest = interests;
                                return Utils.convertLoan(loanTemp.id)
                            })
                            .then(loanHost => {
                                var data = {
                                    loan: loanHost,
                                    total_loan_money: loanTemp.amount,
                                    interest: loanTemp.interest,
                                    start_time: loanTemp.start_time,
                                    end_time: loanTemp.end_time,
                                    total_money_will_pay: total_money_will_pay,
                                    total_money_paid: total_money_paid,
                                    next_interest_date: next_interest_date,
                                    next_interest_money: next_interest_money,
                                    list_interest: listInterest
                                }
                                result.push[data];
                            })
                            .catch(err => {
                                var response = new CommonResponse("fail", "", err)
                                console.log("response", response)
                                res.json(response)
                            })
                        )
                    })
                    Q.all(promises1)
                        .then(() => {
                            var response = new CommonResponse("success", "", result)
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

    app.post('/api/wallet/getListRegisteredLend', (req, res) => {
        var token = req.body.token;
        var tempLoan, totalMoneyLend, listPackage, interest;
        var data = [];
        AccessToken.findOne({ where: { id: token } })
            .then(token => {
                lend.find({ 'where': { 'investorId': token.userId, 'status': 0 } })
                    .then(lends => {
                        if (lends != null && lends.length > 0) {
                            var promises = [];
                            console.log('123lends', lends)
                            lends.forEach(lend => {
                                promises.push(loan.findOne({ where: { id: lend.loanId } })
                                    .then(loan => {
                                        tempLoan = loan;
                                        totalMoneyLend = lend.amount;
                                        if (totalMoneyLend < 30) {
                                            interest = 2;
                                        } else if (totalMoneyLend < 80) {
                                            interest = 3;
                                        } else {
                                            interest = 15;
                                        }
                                        return pack.find({ 'where': { 'lendingId': lend.id } })
                                    })
                                    .then(packs => {
                                        listPackage = packs;
                                        return Utils.convertLoan(tempLoan.id)
                                    })
                                    .then(result => {
                                        data.push({
                                            loan: result,
                                            list_packages: listPackage,
                                            total_my_chosen_money: totalMoneyLend,
                                            interest: interest
                                        })
                                    })
                                    .catch(err => {
                                        var response = new CommonResponse("fail", "", err)
                                        console.log("response", response)
                                        res.json(response)
                                    })
                                )
                            })
                            Q.all(promises)
                                .then(() => {
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
                            var empty = []
                            var response = new CommonResponse("success", "", empty)
                            console.log("response", response)
                            res.json(response)
                        }
                    })

            })
            .catch(err => {
                var response = new CommonResponse("fail", "", err)
                console.log("response", response)
                res.json(response)
            })
    })
    app.post('/api/wallet/getListOnGoingLend', (req, res) => {
        var token = req.body.token;
        var loanTemp = {}, total_lend_money, interestMoney = 0, start_time, end_time, total_money_will_receive = 0,
            next_interest_date = 'NA', next_interest_money = 0, listInterest = [], total_money_received = 0;
        var data = [];
        var promises = [];
        var interestTemp;
        AccessToken.findOne({ where: { id: token } })
            .then(token => {
                console.log('onGoingLend', token.userId)
                return lend.find({ where: { investorId: token.userId, status: 1 } })
            })
            .then(lends => {
                console.log('onGoingLend', lends)
                if (lends != null) {
                    lends.forEach(lend => {
                        promises.push(interest.find({ where: { lendingId: lend.id } })
                            .then(interests => {
                                console.log('interestsOnGoing:', interests)
                                listInterest = interests
                                return loan.findOne({ where: { id: lend.loanId } })
                            })
                            .then(loan => {
                                console.log('loanOnGoing:', loan)
                                loanTemp = loan;
                                return getMoneyReceived(lend.id)
                            })
                            .then(total => {
                                console.log('totalonGoing:', total)
                                total_money_received = total.total;
                                return getMoneyWillReceive(lend.id)
                            })
                            .then(total => {
                                console.log('totalOngoing:', total)
                                total_money_will_receive = total.total;
                                return getInterestNextMonthOfLend(lend.id);
                            })
                            .then(result => {
                                console.log('resultOngoing:', result)
                                interestTemp = result;
                                next_interest_money = result.interest.money;
                                next_interest_date = result.interest.date;
                                return Utils.convertLoan(loanTemp.id)
                            })
                            .then(result => {
                                console.log('resultOngoing2:', result)
                                data.push({
                                    loan: result,
                                    total_lend_money: lend.money,
                                    interest: interestTemp.interest.rate,
                                    start_time: lend.start_time,
                                    end_time: lend.end_time,
                                    total_money_will_receive: total_money_will_receive,
                                    next_interest_money: next_interest_money,
                                    next_interest_date: next_interest_date,
                                    total_money_received: total_money_received,
                                    list_interest: listInterest
                                })
                            })
                            .catch(err => {
                                var response = new CommonResponse("fail", "", err)
                                console.log("response", response)
                                res.json(response)
                            })
                        )
                    })
                    Q.all(promises)
                        .then(() => {
                            var response = new CommonResponse("success", "", data)
                            console.log("response", response)
                            res.json(response)
                        })
                } else {
                    var empty = []
                    var response = new CommonResponse("success", "", empty)
                    console.log("response", response)
                    res.json(response)
                }
            })
            .catch(err => {
                var response = new CommonResponse("fail", "", err)
                console.log("response", response)
                res.json(response)
            })
    })

    app.post('/api/wallet/getListCompletedLend', (req, res) => {
        var token = req.body.token;
        var loanTemp, total_lend_money, start_time, end_time, total_money_will_receive, listInterest;
        var data = [], rate;
        var promises = [];
        AccessToken.findOne({ where: { id: token } })
            .then(token => {
                if (token == null) {
                    var response = new CommonResponse("fail", "", "token not found")
                    console.log("response", response)
                    res.json(response)
                } else {
                    return lend.find({ where: { investorId: token.userId, status: 2 } })
                }
            })
            .then(lends => {
                if (lends != null) {
                    lends.forEach(lend => {
                        promises.push(interest.find({ where: { lendingId: lend.id } })
                            .then(interests => {
                                listInterest = interests
                                rate = interests[0].rate;
                                return loan.findOne({ where: { id: lend.loanId } })
                                    .then(loan => {
                                        loanTemp = loan;
                                        return getMoneyReceived(lend.id)
                                    })
                                    .then(total => {
                                        total_money_received = total.total;
                                        return Utils.convertLoan(loanTemp.id)
                                    })
                                    .then(result => {
                                        data.push({
                                            loan: result,
                                            total_lend_money: lend.money,
                                            start_time: lend.start_time,
                                            end_time: lend.end_time,
                                            interest: rate,
                                            total_money_received: total_money_received,
                                            list_interest: listInterest
                                        })
                                    })
                                    .catch(err => {
                                        var response = new CommonResponse("fail", "", err)
                                        console.log("response", response)
                                        res.json(response)
                                    })

                            })
                        )
                    })
                    Q.all(promises)
                        .then(() => {
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
                    var empty = []
                    var response = new CommonResponse("success", "", empty)
                    console.log("response", response)
                    res.json(response)
                }
            })
            .catch(err => {
                var response = new CommonResponse("fail", "", err)
                console.log("response", response)
                res.json(response)
            })

    })

    app.post('/api/money_interest', (req, res) => {
        var money = req.body.money;
        var rate = req.body.rate;
        interestMoney.create({
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
    app.get('/api/money_interest', (req, res) => {
        interestMoney.find()
            .then(interest => {
                var response = new CommonResponse("success", "", interest)
                console.log("response", response)
                res.json(response)
            })
            .catch(err => {
                var response = new CommonResponse("fail", "", err)
                console.log("response", response)
                res.json(response)
            })
    })
    app.get('/loan/getTotal/:loanId', (req, res) => {
        getTotalLendMoney(req.params.loanId)
            .then(loan => {
                res.json(loan)
            })
            .catch(err => {
                res.json(err)
            })
    })

    app.post('/checkDate', (req, res) => {
        var day = req.body.day;
        var range_time = req.body.range_time;
        console.log(new Date())
        Utils.dayAfterSomeMonth(day, range_time)
            .then(result => {
                console.log('result', result)
                res.json(result.result);
            })
            .catch(err => {
                res.json(err)
            })
    })


    app.post('/api/wallet/getWalletHost', (req, res) => {
        var token = req.body.token;
        var hostId = req.body.id;
        var hostTemp;
        var agencyTemp;
        var resultHost;
        var money = 0, next_day = 'NA', next_money = 0, number_registed = 0, number_current = 0, number_complete = 0, total_debt = 0;
        var loancurrent = 0, loancomplete = 0;
        Utils.checkToken(token)
            .then(token => {
                return agency.find({ where: { id: token.userId } })
            })
            .then(agencies => {
                if (agencies == null || agencies.length == 0) {
                    var response = new CommonResponse("fail", "", "permission denied")
                    console.log("response", response)
                    res.json(response)
                } else {
                    agencyTemp = agencies[0];
                    console.log('agency ', agencyTemp)
                    return host.findOne({ where: { id: hostId, agencyId: agencyTemp.id } })
                }
            })
            .then(host => {
                hostTemp = host;
                return wallet.findOne({ where: { ownerId: host.id } })
            })
            .then(wallet => {
                money = wallet.balance;
                return loan.find({ where: { hostId: hostId, status: 0 } })
            })
            .then(loans => {
                number_registed = loans.length;
                return loan.find({ where: { hostId: hostId, status: 2 } })
            })
            .then(loans => {
                number_complete = loans.length;
                if (number_complete > 0) {
                    loan.forEach(loanItem => {
                        loancomplete += loanItem.amount;
                    })
                }
                return loan.find({ where: { hostId: hostId, status: 1 } })
            })
            .then(loans => {
                number_current = loans.length;
                if (number_current > 0) {
                    loans.forEach(loanItem => {
                        loancurrent += loanItem.amount;
                        total_debt = loan.amount;
                    })
                }

                return interest.find({ where: { loanId: loan.id, status: 0 } })
            })
            .then(interests => {
                if (interests.length > 0) {
                    next_day = interests[0].time;
                    next_money = ((interests[0].money) / 100).toFixed(2)
                }
                resultHost = {
                    id: hostTemp.id,
                    name: hostTemp.name,
                    avatar: hostTemp.avatar,
                    email: hostTemp.email,
                    available_money: money,
                    next_interest_date: next_day,
                    next_interest_money: next_money,
                    phone_number: hostTemp.phoneNumber,
                    address: hostTemp.address,
                    number_registered_loan: number_registed,
                    number_completed_loan: number_complete,
                    number_current_loan: number_current
                }
                var data = {
                    host: resultHost,
                    borrowed_money: loancomplete,
                    borrowing_money: loancurrent
                }
                var response = new CommonResponse("success", "", data)
                console.log("response", response)
                res.json(response)
            })
            .catch(err => {
                var response = new CommonResponse("fail", "", err)
                console.log("response", response)
            })

    })

    app.post('/api/wallet/getWalletInvestor', (req, res) => {
        var token = req.body.token;
        var resultAll = [];
        var investorTemp, available_money, lended_money = 0, lending_money = 0, avatar = "";
        Utils.checkToken(token)
            .then(token => {
                return investor.findById(token.userId);
            })
            .then(investor => {
                investorTemp = investor;
                avatar = investor.avatar;
                return wallet.findOne({ where: { ownerId: investor.id } })
            })
            .then(wallet => {
                console.log('wallet', wallet)
                available_money = wallet.balance;
                return lend.find({ where: { investorId: investorTemp.id } });
            })
            .then(lends => {
                lends.forEach(lend => {
                    if (lend.status == 0) {
                        lending_money += lend.amount;
                    } else if (lend.status == 1) {
                        lended_money += lend.amount;
                    }
                })
                var data = {
                    name: investorTemp.name,
                    avatar: avatar,
                    email: investorTemp.email,
                    available_money: available_money,
                    lended_money: lended_money,
                    lending_money: lending_money
                }
                // resultAll.push(data)
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

    app.post('/api/wallet/addToWallet/host', (req, res) => {
        var token = req.body.token;
        var id = req.body.id;
        var money = req.body.money;

        wallet.findOne({ where: { ownerId: id } })
            .then(wallet => {
                var balance = wallet.balance * 1000000;
                var add = money * 1000000;
                wallet.balance = parseFloat(((balance + add) / 1000000).toFixed(2));
                return wallet.save();
            })
            .then(wallet => {
                var response = new CommonResponse("success", "", wallet)
                console.log("response", response)
                res.json(response)
            })
            .catch(err => {
                var response = new CommonResponse("fail", "", err)
                console.log("response", response)
                res.json(response)
            })

    })

    app.post('/api/wallet/addToWallet/investor', (req, res) => {
        var token = req.body.token;
        var money = req.body.money;

        Utils.checkToken(token)
            .then(token => {
                return wallet.findOne({ where: { ownerId: token.userId } })
            })
            .then(wallet => {
                var balance = wallet.balance * 1000000;
                var add = money * 1000000;
                wallet.balance = parseFloat(((balance + add) / 1000000).toFixed(2));
                return wallet.save();
            })
            .then(wallet => {
                var response = new CommonResponse("success", "", wallet)
                console.log("response", response)
                res.json(response)
            })
            .catch(err => {
                var response = new CommonResponse("fail", "", err)
                console.log("response", response)
                res.json(response)
            })

    })

    var getTotalLendMoneyToHost = (loanId) =>
        new Promise((resolve, reject) => {
            var total = 0;
            loan.findById(loanId)
                .then(loan => {
                    console.log(loan)
                    resolve({ loan: loan.amount })
                })
                .catch(err => {
                    reject(err)
                })
        });
    var getTotalMoneyReceive = (loanId, investorId) =>
        new Promise((resolve, reject) => {
            var totalMoney = 0;
            lend.findOne({ 'where': { 'investorId': investorId, 'loanId': loanId } })
                .then(lend => {
                    return interest.find({ 'where': { 'lendingId': lend.id, 'status': 1 } })
                })
                .then(moneyInterests => {
                    moneyInterests.forEach(interest => {
                        totalMoney += interest.money;
                    })
                    resolve({ total: totalMoney })
                })
                .catch(err => {
                    reject(err)
                })

        })
    var getListInterestOfLoan = (loanId) =>
        new Promise((resolve, reject) => {

        })
    var getTotalMoneyMustPaid = (loanId) =>
        new Promise((resolve, reject) => {
            var totalMoney = 0;
            lend.find({ where: { loanId: loanId } })
                .then(lends => {
                    var promises = [];
                    lends.forEach(lend => {
                        promises.push(getMoneyWillReceive(lend.id)
                            .then(result => {
                                totalMoney += result.total;
                            })
                        )
                    })
                    Q.all(() => {
                        resolve({ total: totalMoney })
                    })

                })
                .catch(err => { reject(err) })
        })
    var getMoneyWillReceive = (lendId) =>
        new Promise((resolve, reject) => {
            var totalMoney = 0;
            interest.find({ 'where': { 'lendingId': lendId } })
                .then(moneyInterests => {
                    console.log('moneyInterests', moneyInterests)
                    moneyInterests.forEach(interest => {
                        totalMoney += interest.money;
                    })
                    console.log('totalMoney', totalMoney)
                    resolve({ total: totalMoney })
                })
                .catch(err => {
                    reject(err)
                })
        })
    var getMoneyReceived = (lendId) =>
        new Promise((resolve, reject) => {
            var totalMoney = 0;
            interest.find({ 'where': { 'lendingId': lendId, 'status': 2 } })
                .then(moneyInterests => {
                    moneyInterests.forEach(interest => {
                        totalMoney += interest.money;
                    })
                    resolve({ total: totalMoney })
                })
                .catch(err => {
                    reject(err)
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
    var getInterestNextMonthOfLend = (lendId) =>
        new Promise((resolve, reject) => {
            interest.findOne({ where: { lendingId: lendId } })
                .then(interest => {
                    resolve({ interest: interest })
                })
                .catch(err => {
                    reject(err)
                })
        })
}