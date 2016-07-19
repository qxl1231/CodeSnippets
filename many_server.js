var loopback = require('loopback');
var boot = require('loopback-boot');
var path = require('path');
var Redis = require('ioredis');
var configuration = require('./configuration');
var cors = require('cors');
var url = require('url');

var app = module.exports = loopback();

var http = require('http');
var https = require('https');
var sslCert = require('./private/ssl_cert');
var httpsOptions = {
  key: sslCert.privateKey,
  cert: sslCert.certificate
};
app.httpsOptions = httpsOptions;

app.logger = require('./lib/logger');

var whitelist = ["http://www.baidu.com", "http://www.baidu.com", "http://www.baidu.com", "http://www.baidu.com", "http://www.baidu.com"];
var corsOptions = {
  origin: function(origin, callback){
    var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
    // app.logger.debug({origin:origin, allowed:originIsWhitelisted}, '跨域请求');
    callback(null, originIsWhitelisted);
    // callback(null, true);
  },
  credentials: true,
  maxAge: 86400
};

app.use(function(req, res, next) {
    // app.logger.debug({header:req.headers, url:req.originalUrl}, '请求');
    if (req.headers.origin === undefined && req.headers.referer){
      var parsedReferer = url.parse(req.headers.referer);
      req.headers.origin = parsedReferer.protocol + '//' + parsedReferer.host;
    }
    req.headers['accept-encoding'] = 'gzip,deflate';
    res.set('X-Accel-Buffering','no');
    next();
});
app.use(cors(corsOptions));


// 使用redis在集群的实例之间传递设备状态变化消息
app.redisPublisher = new Redis({host: configuration.redis_host, port: configuration.redis_port});
app.redisPublisher.on('error', function(error){
  app.logger.warn({Error: error, host: configuration.redis_host, port: configuration.redis_port}, 'Error from redisPublisher');
});

app.redisSubscriber = new Redis({host: configuration.redis_host, port: configuration.redis_port});
app.redisSubscriber.on('error', function(error){
  app.logger.warn({Error: error, host: configuration.redis_host, port: configuration.redis_port}, 'Error from redisSubscriber');
});
app.redisSubscriber.subscribe('deviceStatus', 'bindStatus', function (err, count) {
  if (err) {
    app.logger.warn({Error: err}, 'Unable to subscribe to deviceStatus redis channel');
  } else {
    app.redisSubscriber.on('message', function(channel, message){
      if (channel === 'deviceStatus'){
        app.logger.info({message: message}, '通过Redis PubSub收到设备状态更新消息');
        var data = JSON.parse(message);

        process.nextTick(function() {
          app.logger.info(data, '向相关用户推送设备状态变化信息');
          app.models.LbUser.notifyObserversOf(data.instance.applianceId, data);
        });
      } else if (channel === 'bindStatus') {
        app.logger.info({message: message}, '通过Redis PubSub收到绑定关系状态更新消息');
        var data = JSON.parse(message);

        process.nextTick(function() {
          app.logger.info(data, '向相关用户推送绑定关系状态变化信息');
          app.models.LbUser.notifyObserversOf('user-' + data.instance.lbUserId, data);
        });
      }
    });
  }
});


// Passport configurators..
var loopbackPassport = require('loopback-component-passport');
// var PassportConfigurator = loopbackPassport.PassportConfigurator;
var PassportConfigurator = require('./lib/passport-configurator');
var passportConfigurator = new PassportConfigurator(app);

/*
 * body-parser is a piece of express middleware that
 *   reads a form's input and stores it as a javascript
 *   object accessible through `req.body`
 *
 */
var bodyParser = require('body-parser');

// attempt to build the providers/passport config
var config = {};
try {
  config = require('../providers.json');
} catch (err) {
  console.trace(err);
  process.exit(1); // fatal
}

// configure view handler
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(loopback.static(path.resolve(__dirname, '../client')));


// -- Add your pre-processing middleware here --
// app.use(require('express-bunyan-logger')({
//     name: 'logger',
//     streams: [{
//         level: 'info',
//         stream: process.stdout
//         }]
//     }));
// app.use(function(req, res, next) {
//     req.log.debug('this is debug in middleware');
//     next();
// });

app.use(loopback.context());
app.use(loopback.token());
// app.use(function setCurrentUser(req, res, next) {
//   if (!req.accessToken) {
//     return next();
//   }
//   console.log('accessToken', req.accessToken);
//   app.models.lbUser.findById(req.accessToken.userId, function(err, user) {
//     if (err) {
//       return next(err);
//     }
//     if (!user) {
//       return next();
//     }
//     var loopbackContext = loopback.getCurrentContext();
//     if (loopbackContext) {
//       loopbackContext.set('currentUser', user);
//     }
//     next();
//   });
// });

// Setup the view engine (jade)
// var path = require('path');
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err){
  if (err) throw err;
});

// to support JSON-encoded bodies
app.middleware('parse', bodyParser.json());
// to support URL-encoded bodies
app.middleware('parse', bodyParser.urlencoded({
	extended: true
}));

// The access token is only available after boot
app.middleware('auth', loopback.token({
  model: app.models.accessToken
}));

app.middleware('session:before', loopback.cookieParser(app.get('cookieSecret')));
app.middleware('session', loopback.session({
	secret: app.get('cookieSecret'),
	saveUninitialized: true,
	resave: true
}));
passportConfigurator.init();

passportConfigurator.setupModels({
  userModel: app.models.lbUser,
  userIdentityModel: app.models.userIdentity,
  userCredentialModel: app.models.userCredential
});
for (var s in config) {
  var c = config[s];
  c.session = c.session !== false;
  passportConfigurator.configureProvider(s, c);
}

//show password reset form
app.get('/reset-password', function(req, res, next) {
  if (!req.accessToken) return res.sendStatus(401);
  res.render('password-reset', {
    accessToken: req.accessToken.id
  });
});

//reset the user's pasword
app.post('/reset-password', function(req, res, next) {
  if (!req.accessToken) return res.sendStatus(401);

  //verify passwords match
  if (!req.body.password ||
      !req.body.confirmation ||
      req.body.password !== req.body.confirmation) {
    return res.sendStatus(400, new Error('Passwords do not match'));
  }

  app.models.LbUser.findById(req.accessToken.userId, function(err, user) {
    if (err) return res.sendStatus(404);
    user.updateAttribute('password', req.body.password, function(err, user) {
    if (err) return res.sendStatus(404);
      console.log('> password reset processed successfully');
      res.render('response', {
        title: 'Password reset success',
        content: 'Your password has been reset successfully',
        redirectTo: '/',
        redirectToLinkText: 'Log in'
      });
    });
  });
});


// app.get('/auth/account', function(req, res, next) {
//   console.log('Logged in', req.user);
//   res.send(req.user);
// });
//
// app.get('/auth/current', function(req, res, next) {
//   if (!req.isAuthenticated || !req.isAuthenticated()) {
//     return res.status(200).json({});
//   }
//   //poor man's copy
//   var ret = JSON.parse(JSON.stringify(req.user));
//   delete ret.password;
//   res.status(200).json(ret);
// });
//
// app.get('/auth/logout', function(req, res, next) {
//   req.logout();
//   res.redirect('/');
//   console.log('Logged out', req.user)
// });


var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
//
// app.get('/', function (req, res, next) {
//   res.render('pages/index', {user:
//     req.user,
//     url: req.url
//   });
// });

// var passport = require('passport');
// app.post('/auth/localnew',
//   passport.authenticate('local', { failureRedirect: '/login' }),
//   function(req, res) {
//     res.send(req.user);
//   });
//

// app.get('/', function(req, res, next) {
//   console.log('/ get request:', req);
//   res.send('200');
// });

app.get('/auth/account', function (req, res, next) {
  console.log('auth account req', req);
  // console.log('auth account res', res);

  res.send('200 OKOKOK');
  // res.render('pages/loginProfiles', {
  //   user: req.user,
  //   url: req.url
  // });
});

//测试服务器配错地址了 ....临时解决一下 -_-#
// var request = require('request'); // npm install request
//
// app.post('/auth/verify', function(req, res) {
//     app.logger.warn('someone is using old url!!!');
//     request.post({ url: 'http://0.0.0.0:3004/api/mcloud2app/auth/verify', headers: req.headers, form: req.body}, function(err, remoteResponse, remoteBody) {
//         if (err) { console.log(err); return res.status(500).end('Error'); }
//         res.writeHead(remoteResponse.headers);
//         res.status(remoteResponse.statusCode).end(remoteBody);
//     });
// });
//
// app.post('/mpush/submit', function(req, res) {
//     app.logger.warn('someone is using old url!!!');
//     request.post({url:'http://0.0.0.0:3004/api/mcloud2app/mpush/submit', headers: req.headers, body: req.body.toString() }, function(err, remoteResponse, remoteBody) {
//         if (err) { return res.status(500).end('Error'); }
//         res.writeHead(remoteResponse.headers);
//         res.status(remoteResponse.statusCode).end(remoteBody);
//     });
// });

app.get('/link/account', ensureLoggedIn('/login'), function (req, res, next) {
  res.render('pages/linkedAccounts', {
    user: req.user,
    url: req.url
  });
});

app.get('/local', function (req, res, next){
  res.render('pages/local', {
    user: req.user,
    url: req.url
  });
});

app.get('/signup', function (req, res, next){
  res.render('pages/signup', {
    user: req.user,
    url: req.url
  });
});

app.post('/signup', function (req, res, next) {

  var User = app.models.lbUser;

  var newUser = {};
  newUser.email = req.body.email.toLowerCase();
  newUser.username = req.body.username.trim();
  newUser.password = req.body.password;

  User.create(newUser, function (err, user) {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('back');
    } else {
      // Passport exposes a login() function on req (also aliased as logIn())
      // that can be used to establish a login session. This function is
      // primarily used when users sign up, during which req.login() can
      // be invoked to log in the newly registered user.
      req.login(user, function (err) {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('back');
        }
        return res.redirect('/auth/account');
      });
    }
  });
});

// app.get('/login', function (req, res, next){
//   res.render('pages/login', {
//     user: req.user,
//     url: req.url
//    });
// });

app.get('/login', function (req, res, next){
  res.render('login', {demoUser:
    {
      username: 'bob',
      password: 'secret'
    }
  });
});

app.get('/link', function (req, res, next){
  res.render('pages/link', {
    user: req.user,
    url: req.url
  });
});

app.get('/auth/logout', function (req, res, next) {
  req.logout();
  res.redirect('/');
});


// -- Mount static files here--
// All static middleware should be registered at the end, as all requests
// passing the static middleware are hitting the file system
// Example:
// var path = require('path');
// app.use(loopback.static(path.resolve(__dirname, '../client/public')));


app.start = function() {
  // start the web server
  // return app.listen(function() {
  //   app.emit('started');
  //   var baseUrl = app.get('url').replace(/\/$/, '');
  //   console.log('Web server listening at: %s', baseUrl);
  //   if (app.get('loopback-component-explorer')) {
  //     var explorerPath = app.get('loopback-component-explorer').mountPath;
  //     console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
  //   }
  // });

  var port = app.get('port');
  var host = app.get('host');
  var httpServer = http.createServer(app).listen(port, host, function() {

    var httpsPort = app.get('https-port');
    var httpsServer = https.createServer(httpsOptions, app).listen(httpsPort,
      host, function() {

        app.emit('started');

        app.close = function(cb) {
          app.removeAllListeners('started');
          app.removeAllListeners('loaded');
          httpServer.close(function() {
            httpsServer.close(cb);
          });
        };
      });
    });
};

// start the server if `$ node server.js`
if (require.main === module) {
  app.start();
}
