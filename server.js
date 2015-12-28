/* jshint node:true */
'use strict';
var loopback = require('loopback');
var boot = require('loopback-boot');
var proServerConfig = require('./configuration');
var Redis = require('ioredis');
var Logstash = require('./lib/logstash-redis');
var esLogger = require('./lib/log-esclient-to-bunyan');
var Elasticsearch = require('elasticsearch');
var WEATHER_REDIS_DB = 0;
var APPLIANCE_INFO_REDIS_DB = 2;
var APPLIANCE_STATUS_REDIS_DB = 3;
var LOGTASH_REDIS_DB = 1;
var APP_USER_ID_REDIS_DB = 4;

var app = module.exports = loopback();
console.log('======== Running at env:', process.env.NODE_ENV);
app.logger = require('./lib/logger');

app.weatherRedis = new Redis({host: proServerConfig.redis_host, port: proServerConfig.redis_port, db: WEATHER_REDIS_DB});
app.weatherRedis.on('error', function(error){
  app.logger.warn({Error: error, host: proServerConfig.redis_host, port: proServerConfig.redis_port}, 'Error from weatherRedis');
});

app.applianceInfoRedis = new Redis({host: proServerConfig.redis_host, port: proServerConfig.redis_port, db: APPLIANCE_INFO_REDIS_DB});
app.applianceInfoRedis.on('error', function(error){
  app.logger.warn({Error: error, host: proServerConfig.redis_host, port: proServerConfig.redis_port}, 'Error from applianceInfoRedis');
});

app.applianceStatusRedis = new Redis({host: proServerConfig.redis_host, port: proServerConfig.redis_port, db: APPLIANCE_STATUS_REDIS_DB});
app.applianceStatusRedis.on('error', function(error){
  app.logger.warn({Error: error, host: proServerConfig.redis_host, port: proServerConfig.redis_port}, 'Error from applianceStatusRedis');
});

app.appUserIdRedis = new Redis({host: proServerConfig.redis_host, port: proServerConfig.redis_port, db: APP_USER_ID_REDIS_DB});
app.appUserIdRedis.on('error', function(error){
  app.logger.warn({Error: error, host: proServerConfig.redis_host, port: proServerConfig.redis_port}, 'Error from appUserIdRedis');
});

var logstashRedisClient = new Redis({host: proServerConfig.redis_host, port: proServerConfig.redis_port, db: LOGTASH_REDIS_DB});
logstashRedisClient.on('error', function(error){
  app.logger.warn({Error: error, host: proServerConfig.redis_host, port: proServerConfig.redis_port}, 'Error from logstashRedis');
});
app.logstashLogger = Logstash.createLogger(logstashRedisClient, 'logstash');

app.esClient = new Elasticsearch.Client({
  host: proServerConfig.elasticsearch_host_port,
  log: esLogger,
  requestTimeout: 5 * 1000,
  deadTimeout: 10 * 1000,
  maxSockets: 100,
});

app.esClient.ping({
  requestTimeout: 30000,
  // undocumented params are appended to the query string
  hello: "elasticsearch"
}, function (error) {
  if (error) {
    console.error('elasticsearch cluster is down!');
  } else {
    console.log('elasticsearch ping is well');
  }
});

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    console.log('Web server listening at: %s', app.get('url'));
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
