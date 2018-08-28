module.exports = function (app) {
    //get User model from the express app
    const CommonResponse = require('../util/CommonResponse')
    const utils = require('../util/Utils')
    const Q = require('q');
    const UserModel = app.models.account;
    const Investor = app.models.investor;
    const Agency = app.models.agency;
    const AccessToken = app.models.AccessToken;
    const wallet = app.models.wallet;
    app.post('/api/login', (req, res) => {
        var email = req.body.email;
        var password = req.body.password;

        //parse user credentials from request body
        const userCredentials = {
            "email": email,
            "password": password,
            "ttl": 86400
        }

        Agency.find({ where: { email: email } }, (err, rs) => {
            console.log('rs', rs)
            if (err)
                console.log(err)
            else if (rs.length == 0) {
                Investor.login(userCredentials, 'investor', (err, result) => {
                    if (err) {
                        //custom logger
                        var response = new CommonResponse("error", "", err)
                        console.log("response", response)
                        res.json(response)
                    }
                    Investor.findById(result.userId, (err, results) => {
                        var data = {
                            "token": result.id,
                            "ttl": result.ttl,
                            "name": results.name,
                            "type": results.type,
                            "userId": result.userId
                        };
                        var response = new CommonResponse("success", "", data)
                        console.log("response", response)
                        res.json(response)
                    })
                });
            } else {
                Agency.login(userCredentials, 'agency', (err, result) => {
                    if (err) {
                        //custom logger
                        console.log(err);
                        var response = new CommonResponse("error", "", err)
                        console.log("response", response)
                        res.json(response)
                        return;
                    }
                    Agency.findById(result.userId, (err, results) => {
                        var data = {
                            "token": result.id,
                            "ttl": result.ttl,
                            "name": results.name,
                            "type": results.type,
                            "userId": result.userId
                        };
                        var response = new CommonResponse("success", "", data)
                        console.log("response", response)
                        res.json(response)
                    })
                });
            }
        })

    });
    app.post('/api/register', (req, res) => {
        const userCredentials = {
            "email": req.body.email,
            "password": req.body.password,
            "type": 2,
            "name": req.body.name
        };
        UserModel.create(userCredentials, (err, result) => {
            if (err) {
                //custom logger
                var response = new CommonResponse("error", "", err)
                console.log("response", response)
                res.json(response)
                return;
            } else {
                Investor.create(userCredentials, (err, results) => {
                    if (err) {
                        console.log(err)
                    } else {
                        console.log('investor   :' ,results)
                        console.log('results', results)
                        wallet.create({
                            type: 2,
                            balance: 0,
                            ownerId: results.id
                        }, (err, walletResult) => {
                            if (err) {
                                console.log('create wallet error!')
                                return
                            } else {
                                console.log(walletResult)
                                Investor.login({ "email": req.body.email, "password": req.body.password }, (err, resultLogin) => {
                                    if (err) {
                                        console.log(err)
                                    }
                                    else {
                                        var data = { token: resultLogin.id, ttl: resultLogin.ttl, userId: resultLogin.userId, created: resultLogin.created, type: 2, name: result.name }
                                        var response = new CommonResponse("success", "", data)
                                        console.log("response", response)
                                        res.json(response)
                                    }
                                })
                            }
                        });
                    }
                }
                )
            }
        })

    })
    app.post('/api/agency/register', (req, res) => {
        const userCredentials = {
            "email": req.body.email,
            "password": req.body.password,
            "type": 1,
            "name": req.body.name,
            "area": req.body.area
        };
        UserModel.create(userCredentials, (err, result) => {
            if (err) {
                //custom logger
                var response = new CommonResponse("error", "", err)
                console.log("response", response)
                res.json(response)
                return;
            } else {
                const userCredentialAgency = {
                    "email": req.body.email,
                    "password": req.body.password,
                    "type": 1,
                    "name": req.body.name,
                    "area": req.body.area
                };
                Agency.create(userCredentialAgency, (err, results) => {
                    if (err) {
                        console.log(err)
                    } else {
                        var data = results
                        var response = new CommonResponse("success", "", data)
                        console.log("response", response)
                        res.json(response)
                    }
                }
                )
            }
        })

    })
    app.post('/api/logout', (req, res) => {
        var access_token = req.query.access_token;
        if (!access_token) {
            var err = { "error": "access token required" };
            var response = new CommonResponse("fail", "", err)
            console.log("response", response)
            res.json(response)
            return;
        }
        Investor.logout(access_token)
            .then(() => {
                var data = { "message": "Logout successfully!" };
                var response = new CommonResponse("success", "", data)
                console.log("response", response)
                res.json(response)
            })
            .catch(err => {
                var response = new CommonResponse("fail", "", err)
                console.log("response", response)
                res.json(response)
            })


    });
    app.post('/api/checkToken', (req, res) => {
        AccessToken.resolve(req.body.token, function (err, token) {
            if (err || token == null) {
                var response = new CommonResponse("error", "", err)
                console.log("response", response)
                res.json(response)
            } else {
                var data = token;
                var response = new CommonResponse("success", "", data)
                console.log("response", response)
                res.json(response)
            }
        });
    })

}