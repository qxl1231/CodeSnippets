var Redis = require('ioredis');

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
