let _ = require('lodash')
let then = require('express-then')
let Twitter = require('twitter')
let isLoggedIn = require('./middlewares/isLoggedIn')
let posts = require('../data/posts')
let fb = require ('fb')

let networks = {
    twitter: {
      icon: 'twitter',
      name: 'twitter',
      class: 'btn-info'
    },

    facebook: {
        icon: 'facebook',
        name: 'facebook',
        class: 'btn-primary'
    }
}
let scope = 'email, user_posts, read_stream, user_likes, publish_actions'
//let scope = 'email'

module.exports = (app) => {
    let passport = app.passport
    let twitterConfig = app.config.auth.twitter
    let facebookconfig = app.config.auth.facebook

    fb.options({
        appId: facebookconfig.consumerKey,
        appSecret: facebookconfig.consumerSecret,
        redirectUri: facebookconfig.redirectUri
    })

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


            console.log("*** Get Timeline")

        try{

            //let tweets
            let twitterClient = new Twitter({
                consumer_key: twitterConfig.consumerKey,
                consumer_secret: twitterConfig.consumerSecret,
                access_token_key: req.user.twitter.token,
                access_token_secret:req.user.twitter.secret
            })

            let [tweets,] = await twitterClient.promise.get('/statuses/home_timeline')

            tweets = tweets.map ( tweet => {
                return {
                    id: tweet.id_str,
                    image: tweet.user.profile_image_url,
                    text: tweet.text,
                    name: tweet.user.name,
                    username: '@'+tweet.user.screen_name,
                    liked: tweet.favorited,
                    network: networks.twitter
                }
            })

            // res.render('timeline.ejs', {
            //     posts: tweets
            // })


            let fbPosts

            console.log('***facebook token: ' + req.user.facebook.token)
            try {
                   fbPosts = await fb.api.promise('/me/home', {
                        limit: 10,
                        access_token: req.user.facebook.token
                    })
                    
            } catch (e) {
                fbPosts = e.data
                
            }
           // console.log("***fbPosts", fbPosts)

            let fbPostsProcessed = []
            for (let post of fbPosts) {
                let userId = post.from.id
                let picUri = '/' + userId + '/picture'
                let userPicture
                try {
                    userPicture = await fb.api.promise(picUri, {
                        redirect: false
                    })
                } catch (e) {
                    //TODO: so weird. plz fix
                    userPicture = e.data
                }
                //list of likes is coming from the api.
                let likes = post.likes ? post.likes.data : []
                    //find if likes array contains this user. 
                let liked = _.findIndex(likes, {
                    'id': req.user.facebook.id
                }) >= 0

                fbPostsProcessed.push({
                    id: post.id,
                    image: userPicture.url, //post.picture,
                    text: post.story || post.message,
                    name: post.from.name,
                    pic: post.picture,
                    // username: "@" + tweet.user.screen_name,
                    liked: liked,
                    network: networks.facebook

                })
            }


            let aggregatedPosts = _.union(fbPostsProcessed, tweets)
            res.render('timeline.ejs', {
                posts: aggregatedPosts
            })
            
        }
        catch(e){
            console.log(e)
        }
    }))

    app.get('/compose', isLoggedIn, (req, res) => {
        res.render('compose.ejs', {
            message: req.flash('error')
        })
    })

    // app.post('/compose', isLoggedIn, then (async (req, res) => {
        
    //     let twitterClient = new Twitter({
    //         consumer_key: twitterConfig.consumerKey,
    //         consumer_secret: twitterConfig.consumerSecret,
    //         access_token_key: req.user.twitter.token,
    //         access_token_secret:req.user.twitter.secret,
    //     })

    //     let status = req.query.text
    //     if(status.length > 140) {
    //         return req.flash('error', 'Status is over 140 characters')
    //     }

    //     if(!status) {
    //         return req.flash('error', 'Status is cannot be empty ')
    //     }
    //     await twitterClient.promise.post('statuses/update', {status})

    //     res.redirect('/timeline')
    // }))

 app.post('/compose', isLoggedIn, then(async(req, res) => {
        console.log("req.body", req.body)
        let text = req.body.reply
        let postTo = req.body.postTo
        if (postTo.length == 0) {
            return req.flash('error', 'You have to at least pick one network')
        }

        if (text.length > 140) {
            return req.flash('error', 'status is over 140 chars')
        }
        if (!text.length) {
            return req.flash('error', 'status is empty')
        }
        let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumerKey,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.secret
        })
        console.log("***postTo", postTo)
        //TODO use async promise.all
        if (postTo.indexOf('twitter') >= 0) {
            console.log("***try post twitter")
            try {
                await twitterClient.promise.post('statuses/update', {
                    status: text
                })
            } catch (e) {
                console.log("twitter e", e)
            }
        }

        if (postTo.indexOf('facebook') >= 0) {
            console.log("***try post facebook")
            try {
                await fb.api.promise(`${req.user.facebook.id}/feed`, 'post', {
                    access_token: req.user.facebook.token,
                    message: text
                })
            } catch (e) {
                console.log("***e", e)
            }
        }
        
        return res.redirect('/timeline')
    }))

    // app.get('/share/:id', isLoggedIn, (req, res) => {
    //     res.render('share.ejs', {
    //         post:post
    //         message: req.flash('error')
    //     })
    // })

    app.post('/Twitter/like/:id', isLoggedIn, then(async (req, res) => {

        try{

            let twitterClient = new Twitter({
                consumer_key: twitterConfig.consumerKey,
                consumer_secret: twitterConfig.consumerSecret,
                access_token_key: req.user.twitter.token,
                access_token_secret:req.user.twitter.secret,
            })

            let id = req.params.id
            await twitterClient.promise.post('favorites/create', {id})
            res.end()
            
        }catch(e){
            console.log(e)
        }
    }))

    app.post('/Twitter/unlike/:id', isLoggedIn, then( async (req, res) => {

        try{

            let twitterClient = new Twitter({
                consumer_key: twitterConfig.consumerKey,
                consumer_secret: twitterConfig.consumerSecret,
                access_token_key: req.user.twitter.token,
                access_token_secret:req.user.twitter.secret,
            })

            let id = req.params.id
            await twitterClient.promise.post('favorites/destroy', {id})
            res.end()
            
        }catch(e){
            console.log(e)
        }

            
    }))

    app.get('/twitter/reply/:id', isLoggedIn, then(async(req, res) => {
        let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumerKey,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.secret
        })
        console.log("*** params", req.params)
        let id = req.params.id
        let [tweet, ] = await twitterClient.promise.get('/statuses/show/' + id)

        tweet = {
            id: tweet.id_str,
            image: tweet.user.profile_image_url,
            text: tweet.text,
            name: tweet.user.name,
            username: "@" + tweet.user.screen_name,
            liked: tweet.favorited,
            network: networks.twitter
        }
        console.log("*** in tweet reply, tweet", tweet)

        res.render('reply.ejs', {
            post: tweet
        })
    }))

    app.post('/twitter/reply/:id', isLoggedIn, then(async(req, res) => {
        let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumerKey,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.secret
        })
        let id = req.params.id
        let text = req.body.reply
        if (text.length > 140) {
            return req.flash('error', 'status is over 140 chars')
        }
        if (!text.length) {
            return req.flash('error', 'status is empty')
        }

        await twitterClient.promise.post('statuses/update', {
            status: "@dvalia " + text,
            in_reply_to_status_id: id
        })
        //return res.end()
        return res.redirect('/timeline')
    }))

    app.get('/twitter/share/:id', isLoggedIn, then(async(req, res) => {
        let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumerKey,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.secret
        })
        let id = req.params.id
        let [tweet, ] = await twitterClient.promise.get('/statuses/show/' + id)

        tweet = {
            id: tweet.id_str,
            image: tweet.user.profile_image_url,
            text: tweet.text,
            name: tweet.user.name,
            username: "@" + tweet.user.screen_name,
            liked: tweet.favorited,
            network: networks.twitter
        }

        res.render('share.ejs', {
            post: tweet
        })
    }))

    app.post('/twitter/share/:id', isLoggedIn, then(async(req, res) => {
        let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumerKey,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.secret
        })
        let id = req.params.id
        console.log("***req.body", req.body)
        let text = req.body.share
        if (text.length > 140) {
            return req.flash('error', 'status is over 140 chars')
        }
        if (!text.length) {
            return req.flash('error', 'status is empty')
        }
        try {

            await twitterClient.promise.post('statuses/retweet/' + id, {
                text
            })
        } catch (e) {
            console.log("***Exception", e)
        }
        // return res.end()
        return res.redirect('/timeline')
    }))



    app.get('/auth/twitter', passport.authenticate('twitter'))


    app.get('/auth/twitter/callback', passport.authenticate('twitter', {
        successRedirect: '/profile',
        failureRedirect: '/profile',
        failureFlash: true
    }))

    app.get('/connect/twitter', passport.authorize('twitter', {
        scope
    }))

    app.get('/connect/twitter/callback', passport.authorize('twitter', {
        successRedirect: '/profile',
        failureRedirect: '/profile',
        failureFlash: true
    }))


    //facebook


    app.get('/auth/facebook', passport.authenticate('facebook', {
        scope
    }))

    app.get('/auth/facebook/callback', passport.authenticate('facebook', {
        successRedirect: '/profile',
        failureRedirect: '/login',
        failureFlash: true
    }))

    // Authorization route & Callback URL
    app.get('/connect/facebook', passport.authorize('facebook', {
        scope
    }))

    app.get('/connect/facebook/callback', passport.authorize('facebook', {
        successRedirect: '/profile',
        failureRedirect: '/profile',
        failureFlash: true
    }))
    
    app.post('/facebook/like/:id', isLoggedIn, then(async(req, res) => {
        let id = req.params.id
        let uri = `/${id}/likes`
        try {
            await fb.api.promise(uri, 'post', {
                access_token: req.user.facebook.token
            })
        } catch (e) {
            console.log("e", e)
        }
        res.end()
    }))
    app.post('/facebook/unlike/:id', isLoggedIn, then(async(req, res) => {
        let id = req.params.id
        let uri = `/${id}/likes`
        try {
            await fb.api.promise(uri, 'delete', {
                access_token: req.user.facebook.token
            })
        } catch (e) {
            console.log("e", e)
        }
        res.end()
    }))

    app.get('/facebook/reply/:id', isLoggedIn, then(async(req, res) => {
        let id = req.params.id
        let post
            //TODO fix the post with content
        post = {
            id: id,
            // image: , //post.picture,
            text: req.query.text, //post.story || post.message,
            name: req.query.name, //post.from.name,
            image: decodeURIComponent(req.query.img) + '',
            // username: "@" + tweet.user.screen_name,
            network: networks.facebook
        }
        console.log("*** post.pic", )

        res.render('reply.ejs', {
            post: post
        })
    }))

    app.get('/facebook/share/:id', isLoggedIn, then(async(req, res) => {
        let id = req.params.id
        let post
            //TODO fix the post with content
        post = {
            id: id,
            // image: , //post.picture,
            text: req.query.text, //post.story || post.message,
            name: req.query.name, //post.from.name,
            image: decodeURIComponent(req.query.img) + '',
            // username: "@" + tweet.user.screen_name,
            network: networks.facebook
        }

        res.render('share.ejs', {
            post: post
        })
    }))

    app.post('/facebook/reply/:id', isLoggedIn, then(async(req, res) => {

        let id = req.params.id
        let text = req.body.reply
        if (!text.length) {
            return req.flash('error', 'status is empty')
        }
        let uri = `/${id}/comments`
        try {
            await fb.api.promise(uri, 'post', {
                access_token: req.user.facebook.token,
                message: text
            })
        } catch (e) {
            console.log("e", e)
        }
        return res.redirect('/timeline')
    }))

    app.post('/facebook/share/:id', isLoggedIn, then(async(req, res) => {
        let id = req.params.id
        let text = req.body.share
        if (!text.length) {
            return req.flash('error', 'status is empty')
        }
        // construct id of 112345678_987654321 into
        // https://www.facebook.com/12345678/posts/987654321
        let id_fragments = id.split('_')
        let link = "https://www.facebook.com/" + id_fragments[0] +'/posts/' +  id_fragments[1]
        // let uri = `/${id}/shareposts`
        console.log("***link", link)
        try {
            await fb.api.promise('/me/links', 'post', {
                access_token: req.user.facebook.token,
                // message: text,
                link: link
            })
        } catch (e) {
            console.log("e", e)
        }
        return res.redirect('/timeline')
    }))

    // return passport
}
