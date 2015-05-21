let passport = require('passport')
let nodeifyit = require('nodeifyit')
let LocalStrategy = require('passport-local').Strategy
let FacebookStrategy = require('passport-facebook').Strategy
let TwitterStrategy = require('passport-twitter').Strategy
let User = require('../models/User')

require('songbird')

function useExternalPassportStrategy(OauthStrategy, config, field) {
    console.log("useExternalPassportStrategy: " + field)
  config.passReqToCallback = true
  passport.use(new OauthStrategy(config, nodeifyit(authCB, {spread: true})))

  async function authCB(req, token, _ignored_, account) {

    console.log("req: " + JSON.stringify(req.user))
    console.log("token: " + token)
    console.log("account: " + account.id)

      // 1. Load user from store
      // 2. If req.user exists, we're authorizing (connecting an account)
      // 2a. Ensure it's not associated with another account
      // 2b. Link account
      // 3. If not, we're authenticating (logging in)
      // 3a. If user exists, we're logging in via the 3rd party account
      // 3b. Otherwise create a user associated with the 3rd party account

        let accountID = account.id
        let key = field + ".id"
        let user
        if (req.user) {
            user = await User.promise.findById(req.user.id)
        } else {
            //if such user exist in database for facebook or twitter
            user = await User.promise.findOne({
                key: accountID
            })

        }
        // console.log("><account", account)
        console.log("><req user", req.user)

        if (!user) {
            user = new User({})
        }
        user[field] = {
            id: accountID,
            token: token,
            secret: _ignored_,
            name: account.displayName
        }

        console.log("id: " + accountID + "token: " + token + "secret: " + _ignored_ + "name: " + account.displayName)
        return await user.save()
  }
}

function configure(config) {
  // Required for session support / persistent login sessions

  console.log("Inside configure")
  passport.serializeUser(nodeifyit(async (user) => user._id))

  passport.deserializeUser(nodeifyit(async(id) => {
    return await User.findById(id)
  }))

  useExternalPassportStrategy(FacebookStrategy, {
        clientID: config.facebook.consumerKey,
        clientSecret: config.facebook.consumerSecret,
        callbackURL: config.facebook.callbackUrl
    }, 'facebook')
    console.log("config", config.twitter)

 useExternalPassportStrategy(TwitterStrategy, {
      consumerKey: config.twitter.consumerKey,
      consumerSecret: config.twitter.consumerSecret,
      callbackURL: config.twitter.callbackUrl
  }, 'twitter')

  // useExternalPassportStrategy(LinkedInStrategy, {...}, 'linkedin')
  // useExternalPassportStrategy(LinkedInStrategy, {...}, 'facebook')
  // useExternalPassportStrategy(LinkedInStrategy, {...}, 'google')
  // useExternalPassportStrategy(LinkedInStrategy, {...}, 'twitter')
  // passport.use('local-login', new LocalStrategy({...}, (req, email, password, callback) => {...}))
  // passport.use('local-signup', new LocalStrategy({...}, (req, email, password, callback) => {...}))

  return passport
}




// module.exports = (app) => {

//   let passport = app.passport

  // passport.use('local-login', new LocalStrategy ({

  //       // console.log('******* new local-strategy 1')
  //   usernameField: 'email',

  //   failureFlash: true

  //   }, nodeifyit( async (req, email, password) => {

  //        //email = (email || '').toLowerCase()

  //        // if(email !== user.email) {
  //        //   return [false, {message: 'Invalid username'}]
  //        // }
  
  //        let user
  //        // if(username.indexOf('@') !== -1){

  //        //    let email = username.toLowerCase()
  //        //    user = await User.promise.findOne({email})

  //        //  // console.log("******user: " + JSON.stringify(user))
  //        // } else {

  //        //    let regexp = new RegExp(username, 'i')
  //        //    user = await User.promise.findOne({
  //        //      username: {$regex: regexp}
  //        //    })

  //        // }
         

  //        if (!email) {
  //          return [false, {message: 'Invalid username.'}]
  //       }

  //       console.log("******user passed")
  //        // if(!await bcrypt.promise.compare(password, user.password)) {
  //         if(!await user.validatePassword(password)){
  //          return [false, {message: 'Invalid password'}]
  //         }

  //        return user

  //   }, {spread: true} )))


  //   passport.use('local-signup', new LocalStrategy({
  //    // Use "email" field instead of "username"
  //    // console.log('******* new local-strategy 2')
  //    usernameField: 'email',
  //    failureFlash: true,
  //    passReqToCallback: true

  // }, nodeifyit(async (req, email, password) => {
  //     console.log('******* passport nodeifyit 2')
  //     email = (email || '').toLowerCase()
  //     // Is the email taken?
  //     if (await User.promise.findOne({email})) {
  //         return [false, {message: 'That email is already taken.'}]
  //     }

  //     // console.log('*******Req body:' + JSON.stringify(req.body))

  //   //   let {username, title, description} = req.body

  //   //   let regexp = new RegExp(username, 'i')

  //   // let query = {username: {$regex: regexp}}

  //   // // console.log('***************' + query)

  //   // // let result =  await User.promise.findone('aaa')

  //   // console.log('************* Query result: ' + result )

  //     // if(await User.promise.findOne(query)){
  //     //   return [false, {message: 'That username is already taken.'}]
  //     // }


  //     // create the user
  //     let user = new User()
  //     user.email = email
  //     //user.username = username
  //    // user.blogTitle = title
  //    // user.blogDescription = description
  //     // Use a password hash instead of plain-text
  //     user.password = await user.generateHash(password)
  //    // user.password = password

  //     try{

  //       console.log("B4 save - User: " + user.email + " password: " + user.password)
  //      return await user.save()

  //     } catch (e){

  //      return [false, {message: e.message}]
  //     }
      
  // }, {spread: true})))

  
//}




module.exports = {passport, configure}
