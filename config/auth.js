// config/auth.js
module.exports = {
  'development': {
    'facebook': {
      'consumerKey': '1147071958639992',
      'consumerSecret': '4e7eacd11fbda07479083e30a260522c',
      'callbackUrl': 'http://socialfeed.com:8000/auth/facebook/callback'
    },
    'twitter': {
      'consumerKey': 'k8hRe1RoUI0dBDJuvJPCP15TP',
      'consumerSecret': 'NXOnIzV92Q5CcnhMnJVzvDZHSibDSJHL6YciBDQM2mVh7o3qqi',
      'callbackUrl': 'http://socialfeed.com:8000/auth/twitter/callback'
    },
    'google': {
      'consumerKey': '446585441765-unda5mjs6307q1pqobvhiqj87m9m2kh1.apps.googleusercontent.com',
      'consumerSecret': '...',
      'callbackUrl': 'http://socialfeed.com:8000/auth/google/callback'
    }
  }
}
