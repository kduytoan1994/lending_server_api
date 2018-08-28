module.exports = (app) => {
    const CommonResponse = require('../util/CommonResponse')
    const util = require('../util/Utils')
    const loan = app.models.loan;
    const pack = app.models.pack;
    const host = app.models.host;
    const investor = app.models.investor;
    const transaction = app.models.transaction;
    const Q = require('q');

    app.post('/api/informationHome', (req, res) => {
        var numBorrower, listTransaction, listInvestor, numInvestors, listLoan = [];
        host.count()
            .then(numBorrowers => {
                numBorrower = numBorrowers;
                console.log(numBorrowers)
                return investor.count()
            })
            .then(numInvestor => {
                numInvestors = numInvestor;
                return transaction.count();
            })
            .then(numTransaction => {
                listTransaction = numTransaction;
                return investor.find()
            })
            .then(investors => {
                console.log('investorsTemp2', investors)
                return util.convertInvestor(investors)
            })
            .then(investorsTemp => {
                console.log('investorsTemp', investorsTemp)
                listInvestor = investorsTemp.result;
                return loan.find({where : {status : 0}});
            })
            .then(loans => {
                var promises = [];
                for (var i = 0; i < loans.length; i++) {
                    promises.push(util.convertLoan(loans[i].id)
                        .then(loanHost => {
                            listLoan.push(loanHost)
                        })
                    )
                }
                Q.all(promises)
                    .then(() => {
                        var data = {
                            total_money: 10000,
                            total_borrower: numBorrower,
                            total_investor: numInvestors,
                            total_transaction: listTransaction,
                            list_investors: listInvestor,
                            list_loans: listLoan
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
            .catch(err => {
                var response = new CommonResponse("error", "", err)
                console.log("response", response)
                res.json(response)
            })
    })
    app.post('/abc', (req, res) => {
        var id = req.body.id;
        console.log(id)
        host.find({ 'where': { 'id': id } }, { fields: { 'id': true, 'email': false } })
            .then(host => {
                var response = new CommonResponse("success", "", host)
                console.log("response", response)
                res.json(response)
            })
            .catch(err => {
                var response = new CommonResponse("error", "", err)
                console.log("response", response)
                res.json(response)
            })
    })
}