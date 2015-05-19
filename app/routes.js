// let _ = require('lodash')
let then = require('express-then')
let Twitter = require('twitter')
let isLoggedIn = require('./middlewares/isLoggedIn')
let posts = require('../data/posts')

let networks = {
    {
      icon: 'twitter',
      name: 'Twitter',
      class: 'btn-info'
    }
}

module.exports = (app) => {
    let passport = app.passport
    let twitterConfig = app.config.auth.twitter

    app.get('/', (req, res) => res.render('index.ejs'))

    app.get('/profile', isLoggedIn, (req, res) => {
        res.render('profile.ejs', {
            user: req.user,
            message: req.flash('error')
        })
    })

    app.get('/logout', (req, res) => {
        req.logout()
        res.redirect('/')
    })

    app.get('/login', (req, res) => {
        res.render('login.ejs', {message: req.flash('error')})
    })

    app.get('/signup', (req, res) => {
        res.render('signup.ejs', {message: req.flash('error') })
    })

    app.post('/login', passport.authenticate('local-login', {

		successRedirect: '/profile',
		failureRedirect: '/login',
		failureFlash: true

	}))

    // process the signup form
	app.post('/signup', passport.authenticate('local-signup', {

		// {}=> {console.log('******passport-authentication')}

	    successRedirect: '/profile',
	    failureRedirect: '/signup',
	    failureFlash: true
	}))

    app.get('/timeline', isLoggedIn, then(async (req, res) => {

        let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumer_key,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret:req.user.twitter.secret,
        })

        let [tweets] = await twitterClient.promise.get('statuses/home_timeline')

        tweets = tweets.map ( tweet => {
            return {
                id: tweet.id_str,
                image: tweet.user.profile_image_url,
                text: tweet.text,
                name: tweet.user.name,
                username: '@'+tweet.user.screen_name,
                liked: tweet.favorited.
                network: networks.twitter
            }
        })

        res.render('timeline.ejs', {
            posts: posts
        })
    }))

    app.get('/compose', isLoggedIn, (req, res) => {
        res.render('compose.ejs', {
            message: req.flash('error')
        })
    })

    app.post('/compose', isLoggedIn, then (async (req, res) => {
        
        let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumer_key,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret:req.user.twitter.secret,
        })

        let status = req.query.text
        if(status.length > 140) {
            return req.flash('error', 'Status is over 140 characters')
        }

        if(!status) {
            return req.flash('error', 'Status is cannot be empty ')
        }
        await twitterClient.promise.post('statuses/update', {status})

        res.redirect('/timeline')
    }))

    // app.get('/share/:id', isLoggedIn, (req, res) => {
    //     res.render('share.ejs', {
    //         post:post
    //         message: req.flash('error')
    //     })
    // })

    app.post('/like/:id', isLoggedIn, then(async (req, res) => {

        let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumer_key,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret:req.user.twitter.secret,
        })

        let id = req.params.id
        await twitterClient.promise.post('favorites/create', {id})
        res.end()
    }))

    app.post('/unlike/:id', isLoggedIn, then( async (req, res) => {

        let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumer_key,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret:req.user.twitter.secret,
        })

        let id = req.params.id
        await twitterClient.promise.post('favorites/destroy', {id})
        res.end()
    }))


    return passport
}
