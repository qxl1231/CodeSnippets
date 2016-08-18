var _ = require('lodash');
var bcrypt = require('bcrypt');
var PassThrough = require('stream')
  .PassThrough;
var apiClient = require('../../server/lib/api-clients');
var moment = require('moment');
var uuid = require('node-uuid');
var Logger = require('../../server/lib/logger');
var config = require('../../server/configuration');
var securityUtils = require('../../server/lib/security-utils');
var request = require('request');

var weChatOAuth = require('wechat-oauth');
var weChatClient = new weChatOAuth(config.wx_appId, config.wx_appsecret);

var getOpenCloudUserToken = require(
  '../../server/lib/wmbackend2open-user-token-get');

module.exports = function (LbUser) {
  // acls
  LbUser.disableRemoteMethod('count', true);
  LbUser.disableRemoteMethod('create', true);
  LbUser.disableRemoteMethod('upsert', true);
  LbUser.disableRemoteMethod('exists', true);
  // LbUser.disableRemoteMethod('findById', true);
  LbUser.disableRemoteMethod('find', true);
  LbUser.disableRemoteMethod('findOne', true);
  LbUser.disableRemoteMethod('destroyById', true);
  LbUser.disableRemoteMethod('deleteById', true);
  // LbUser.disableRemoteMethod('createChangeSteam', true);
  LbUser.disableRemoteMethod('updateAll', true);

  LbUser.disableRemoteMethod('__create__lbMobile', false);
  LbUser.disableRemoteMethod('__destroy__lbMobile', false);
  LbUser.disableRemoteMethod('__update__lbMobile', false);

  LbUser.disableRemoteMethod('__count__accessTokens', false);
  LbUser.disableRemoteMethod('__create__accessTokens', false);
  LbUser.disableRemoteMethod('__delete__accessTokens', false);
  LbUser.disableRemoteMethod('__destroyById__accessTokens', false);
  LbUser.disableRemoteMethod('__findById__accessTokens', false);
  LbUser.disableRemoteMethod('__get__accessTokens', false);
  LbUser.disableRemoteMethod('__updateById__accessTokens', false);

  LbUser.disableRemoteMethod('__count__udids', false);
  LbUser.disableRemoteMethod('__create__udids', false);
  LbUser.disableRemoteMethod('__delete__udids', false);
  LbUser.disableRemoteMethod('__destroyById__udids', false);
  LbUser.disableRemoteMethod('__findById__udids', false);
  LbUser.disableRemoteMethod('__get__udids', false);
  LbUser.disableRemoteMethod('__updateById__udids', false);

  LbUser.disableRemoteMethod('__count__identities', false);
  LbUser.disableRemoteMethod('__create__identities', false);
  LbUser.disableRemoteMethod('__delete__identities', false);
  LbUser.disableRemoteMethod('__destroyById__identities', false);
  LbUser.disableRemoteMethod('__findById__identities', false);
  LbUser.disableRemoteMethod('__get__identities', false);
  LbUser.disableRemoteMethod('__updateById__identities', false);

  LbUser.disableRemoteMethod('__count__credentials', false);
  LbUser.disableRemoteMethod('__create__credentials', false);
  LbUser.disableRemoteMethod('__delete__credentials', false);
  LbUser.disableRemoteMethod('__destroyById__credentials', false);
  LbUser.disableRemoteMethod('__findById__credentials', false);
  LbUser.disableRemoteMethod('__get__credentials', false);
  LbUser.disableRemoteMethod('__updateById__credentials', false);

  LbUser.disableRemoteMethod('__count__lbDevices', false);
  LbUser.disableRemoteMethod('__create__lbDevices', false);
  LbUser.disableRemoteMethod('__delete__lbDevices', false);
  LbUser.disableRemoteMethod('__destroyById__lbDevices', false);
  LbUser.disableRemoteMethod('__findById__lbDevices', false);
  // LbUser.disableRemoteMethod('__get__lbDevices', false);
  LbUser.disableRemoteMethod('__updateById__lbDevices', false);
  LbUser.disableRemoteMethod('__exists__lbDevices', false);
  LbUser.disableRemoteMethod('__link__lbDevices', false);
  LbUser.disableRemoteMethod('__unlink__lbDevices', false);

  LbUser.disableRemoteMethod('__count__lbShareShared', false);
  LbUser.disableRemoteMethod('__create__lbShareShared', false);
  LbUser.disableRemoteMethod('__delete__lbShareShared', false);
  LbUser.disableRemoteMethod('__destroyById__lbShareShared', false);
  LbUser.disableRemoteMethod('__findById__lbShareShared', false);
  // LbUser.disableRemoteMethod('__get__lbShareShared', false);
  LbUser.disableRemoteMethod('__updateById__lbShareShared', false);

  LbUser.disableRemoteMethod('__count__lbShareOwned', false);
  LbUser.disableRemoteMethod('__create__lbShareOwned', false);
  LbUser.disableRemoteMethod('__delete__lbShareOwned', false);
  LbUser.disableRemoteMethod('__destroyById__lbShareOwned', false);
  LbUser.disableRemoteMethod('__findById__lbShareOwned', false);
  // LbUser.disableRemoteMethod('__get__lbShareOwned', false);
  LbUser.disableRemoteMethod('__updateById__lbShareOwned', false);

  LbUser.disableRemoteMethod('__count__lbSharedDevices', false);
  LbUser.disableRemoteMethod('__create__lbSharedDevices', false);
  LbUser.disableRemoteMethod('__delete__lbSharedDevices', false);
  LbUser.disableRemoteMethod('__destroyById__lbSharedDevices', false);
  LbUser.disableRemoteMethod('__findById__lbSharedDevices', false);
  // LbUser.disableRemoteMethod('__get__lbSharedDevices', false);
  LbUser.disableRemoteMethod('__updateById__lbSharedDevices', false);
  LbUser.disableRemoteMethod('__exists__lbSharedDevices', false);
  LbUser.disableRemoteMethod('__link__lbSharedDevices', false);
  LbUser.disableRemoteMethod('__unlink__lbSharedDevices', false);

  LbUser.afterRemote('prototype.__get__lbShareShared', function(ctx, shares, next) {
    LbUser.app.models.LbShare.include(shares, [
          {
            relation: 'owner',
            scope: {
              fields: ['username']
            }
          },
          {
            relation: 'lbDevice',
            scope: {
              fields: ['applianceId', 'nickname', 'deviceType', 'deviceModel', 'readableName']
            }
          }
      ],
      function(error, results){
        next();
    });
  });

  LbUser.afterRemote('prototype.__get__lbShareOwned', function(ctx, shares, next) {
    LbUser.app.models.LbShare.include(shares, [
          {
            relation: 'user',
            scope: {
              fields: ['username']
            }
          },
          {
            relation: 'lbDevice',
            scope: {
              fields: ['applianceId', 'nickname', 'deviceType', 'deviceModel', 'readableName']
            }
          }
      ],
      function(error, results){
        next();
    });
  });

  //send password reset link when requested
  LbUser.on('resetPasswordRequest', function(info) {
    var url = config.this_host_port + '/reset-password';
    var html = '点击 <a href="' + url + '?access_token=' +
        info.accessToken.id + '">此处</a> 进行密码重置<br/>' +
        'Click <a href="' + url + '?access_token=' +
        info.accessToken.id + '">here</a> to reset your password';

    LbUser.app.models.Email.send({
      to: info.email,
      from: 'littleswan.app@midea.com',
      subject: '密码重置 / Password reset',
      html: html
    }, function(err) {
      if (err) return console.log('> error sending password reset email', err);
      console.log('> sending password reset email to:', info.email);
    });
  });


  LbUser.prototype.requestWithAccesstoken = function (method, args) {
    var user = this;
    var callback = args[args.length - 1];

    getOpenCloudUserToken(user, function (err, token, expires) {
      if (err) {
        return callback(err);
      }

      method.apply(user, args);
    });
  }

  LbUser.prototype.getOpenCloudUserToken = function (cb) {
    var user = this;
    var log = Logger.child({
      userId: user.id
    });
    log.debug('收到获取OpenCloud Token请求');

    getOpenCloudUserToken(user, function (err, token, expires) {
      if (err) {
        return cb(err);
      }

      cb(null, token, expires.valueOf());
    });
  };

  LbUser.prototype.getDeviceListAndInfo = function (cb) {
    var user = this;
    var log = Logger.child({
      userId: user.id
    });
    var LbDevice = LbUser.app.models.LbDevice;
    cb(null, '0', '正在更新设备信息');

    //2. 通过mcloudUserId查询设备列表，根据列表进行bind关系维护
    var requestParams = {};

    requestParams.appId = '1020';
    requestParams.stamp = moment()
      .format('YYYYMMDDHHmmss');
    requestParams.userId = user.mcloudUserId;
    requestParams.sid = uuid.v1();
    requestParams.sign = 'appserver';

    log.info({
      requestParams: requestParams
    }, '查询用户设备列表：向Pro服务器发送查询请求');
    apiClient.open2proClient['DA'].getApplianceByUserId.applianceByUserGet(
      requestParams,
      function (resp) {
        var list = _.get(resp, 'obj.result.list');
        log.info({
          list: list
        }, 'M-Cloud返回用户设备列表');

        if (list == null || list.length == 0) return;

        var applianceIdList = _.pluck(list, 'applianceId');

        //删除已经解绑的设备
        user.lbDevices(function (err, appliances) {
          if (err) return;
          for (var i = 0; i < appliances.length; i++) {
            if (_.indexOf(applianceIdList, appliances[i].applianceId) ==
              -1) {
              user.lbDevices.remove(appliances[i]);
            }
          }
        });

        //删除已经解绑的设备
        user.lbSharedDevices(function (err, appliances) {
          if (err) return;
          for (var i = 0; i < appliances.length; i++) {
            if (_.indexOf(applianceIdList, appliances[i].applianceId) == -1) {
              user.lbSharedDevices.remove(appliances[i]);
            }
          }
        });

        //删除已经解绑的设备
        user.lbShareOwned(function (err, shares) {
          if (err) return;
          for (var i = 0; i < shares.length; i++) {
            if (_.indexOf(applianceIdList, shares[i].lbDeviceId) == -1) {
              user.lbShareOwned.destroy(share[i].id);
            }
          }
        });

        //删除已经解绑的设备
        user.lbShareShared(function (err, shares) {
          if (err) return;
          for (var i = 0; i < shares.length; i++) {
            if (_.indexOf(applianceIdList, shares[i].lbDeviceId) == -1) {
              user.lbShareShared.destroy(share[i].id);
            }
          }
        });

        for (var i = 0; i < list.length; i++) {
          var applianceId = list[i].applianceId;

          var requestParams = {};

          requestParams.appId = '1020';
          requestParams.stamp = moment()
            .format('YYYYMMDDHHmmss');
          requestParams.applianceId = applianceId;
          requestParams.sid = uuid.v1();
          requestParams.sign = 'appserver';

          //获取设备信息
          log.info({
            requestParams: requestParams
          }, '查询设备信息：向Pro服务器发送查询请求');
          apiClient.open2proClient['DA'].applianceInfoGet.getApplianceInfo(
            requestParams,
            function (resp) {
              var applianceInfo = _.get(resp, 'obj.result');
              log.info({
                applianceInfo: applianceInfo
              }, '查询设备信息：Pro服务器返回结果');

              var remoteApplianceInstance = {
                applianceId: _.get(applianceInfo, 'mInfo.applianceId'),
                sn: _.get(applianceInfo, 'mInfo.sn'),
                // nickname: _.get(applianceInfo, 'mInfo.name'),
                deviceType: _.get(applianceInfo, 'mInfo.type')
                  .substring(2, 4)
                  .toUpperCase(),
                deviceModel: _.get(applianceInfo, 'mInfo.model'),
                online: _.get(applianceInfo, 'mInfo.onlineStatus'),
                lastOnlineTime: _.get(applianceInfo,
                  'mInfo.offlineTime')
              };

              //创建或更新设备
              if (_.indexOf(['DA', 'DB', 'DC'], remoteApplianceInstance
                  .deviceType) === -1) {
                log.info({
                  deviceType: remoteApplianceInstance.deviceType
                }, '其他设备类型');
              } else {
                LbDevice.upsert(remoteApplianceInstance, function (err,
                  applianceInstance) {
                  if (err) return;
                  //加入至用户设备列表
                  user.lbDevices.add(applianceInstance);
                  //发送0303指令, 注意不同的设备类型，查询指令不一样！
                  var requestParams = {};

                  requestParams.appId = '1020';
                  requestParams.src = '20';
                  requestParams.stamp = moment()
                    .format('YYYYMMDDHHmmss');
                  requestParams.virtualId = applianceInstance.applianceId;
                  requestParams.deviceType = '0x' +
                    applianceInstance.deviceType;
                  requestParams.sign = 'appserver';

                  log.info({
                    requestParams: requestParams
                  }, '查询设备状态（0303）：向Pro服务器发送查询请求');
                  apiClient.open2proClient[applianceInstance.deviceType]
                    .deviceStatus.getDeviceStatus(requestParams,
                      function (resp) {
                        var errorCode = _.get(resp, 'obj.errorCode');
                        if (errorCode == 3123) {
                          applianceInstance.updateAttributes({
                            online: 0
                          });
                        } else {
                          var status = _.get(resp,
                            'obj.result.reply');
                          log.info({
                            status: status
                          }, '更新设备状态');
                          applianceInstance.updateAttributes({
                            status: status
                          });
                        }
                      },
                      function (err) {
                        log.warn({
                          error: err
                        }, '向M-Cloud查询设备状态错误');
                      });
                });
              }
            },
            function (err) {
              log.warn({
                error: err
              }, '向M-Cloud查询设备状态错误');
            });
        }
      },
      function (err) {
        log.warn({
          error: err
        }, '向M-Cloud查询用户设备列表错误');
      });
  }

  LbUser.prototype.initializeDevicesInfo = function (cb) {

    this.requestWithAccesstoken(this.getDeviceListAndInfo,
      arguments);
  };

  // LbUser.prototype.updateMcloudUserId = function (mcloudUserId, cb) {
  //   this.mcloudUserId = parseInt(mcloudUserId);
  //   if (this.mcloudUserId == 0 || this.mcloudUserId == NaN) {
  //     cb(new Error('mcloudUserId is invalid'));
  //   }
  //
  //   this.save(function (err, user) {
  //     if (err) cb(err);
  //     cb(null, '0');
  //   });
  // };

  LbUser.prototype.unbindDeviceThroughOpenCloud = function (virtualId, fn) {
    this.requestWithAccesstoken(this._unbindDeviceThroughOpenCloud,
      arguments);
  }

  LbUser.prototype._unbindDeviceThroughOpenCloud = function (virtualId, fn) {
    var user = this;
    var log = Logger.child({
      applianceId: virtualId,
      userId: user.id
    });
    var LbDevice = LbUser.app.models.LbDevice;

    fn = fn || utils.createPromiseCallback();

    var requestParams = {};
    requestParams.appId = config.appId;
    requestParams.stamp = moment()
      .format('YYYYMMDDHHmmss');
    requestParams.accessToken = securityUtils.encrypt(user.mcloudAccessToken,
      config.appKey);
    requestParams.virtualId = virtualId;
    requestParams.sign = securityUtils.requestSign('/v1/device/unbind',
      requestParams, config.appKey);

    log.info({
      requestParams: requestParams
    }, '解绑设备：向opencloud发送请求');
    apiClient.wmbackend2openClient.device.unbind(requestParams, function (
      resp) {
      log.info('解绑成功');

      user.lbDevices.findById(virtualId, function (err, appliance) {
        if (err) return;
        user.lbDevices.remove(appliance);
      });

      fn(null, '0', '解绑成功');
    }, function (err) {
      log.warn({
        error: err
      }, '解绑错误');
      return fn(err);
    });

    return fn.promise;
  }

  LbUser.prototype.createShare = function (lbDeviceId, fn) {
    var user = this;
    var log = Logger.child({
      applianceId: lbDeviceId,
      userId: user.id
    });

    user.lbDevices.findById(lbDeviceId, function(error, device) {
      if(error) {
        var err = new Error('查找用户绑定的设备时出错');
        err.statusCode = 401;
        err.code = 'SYSTEM_ERROR';
        log.error(error, '查找用户绑定的设备时出错');
        return fn(err);
      }

      if(device == null) {
        var err = new Error('设备不存在');
        err.statusCode = 404;
        err.code = 'NO_SUCH_DEVICE';
        log.debug('设备不存在');
        return fn(err);
      }

      var shareTempId = uuid.v4();
      var shareTempObj = {
        ownerId: user.id,
        lbDeviceId: lbDeviceId
      };
      LbUser.app.redisShareDevice.set(shareTempId, JSON.stringify(shareTempObj), 'EX', 120);
      shareTempObj.id = shareTempId;
      log.debug({share: shareTempObj}, '生成临时共享设备模型');

      fn(null, shareTempId);
    });
  }

  LbUser.prototype.deleteShare = function (lbDeviceId, userId, fn) {
    var user = this;
    var log = Logger.child({
      applianceId: lbDeviceId,
      userId: user.id
    });

    user.lbShareOwned({where: {userId: userId, lbDeviceId: lbDeviceId}}, function(error, share) {
      if(error) {
        var err = new Error('查找用户共享的设备时出错');
        err.statusCode = 401;
        err.code = 'SYSTEM_ERROR';
        log.error(error, '查找用户共享的设备时出错');
        return fn(err);
      }

      if(share == null || share.length == 0) {
        var err = new Error('设备不存在');
        err.statusCode = 404;
        err.code = 'NO_SUCH_DEVICE';
        log.debug('设备不存在');
        return fn(err);
      }

      user.lbShareOwned.destroy(share[0].id, function(error, result) {
        if(error) {
          var err = new Error('删除共享设备时出错');
          err.statusCode = 401;
          err.code = 'SYSTEM_ERROR';
          log.error(error, '删除共享设备时出错');
          return fn(err);
        }

        if(result == null || result.count == 0) {
          var err = new Error('设备不存在');
          err.statusCode = 404;
          err.code = 'NO_SUCH_DEVICE';
          log.debug('设备不存在');
          return fn(err);
        }

        log.debug({result: result}, '删除共享设备成功');
        fn(null, share[0].lbDeviceId);
      });
    });
  }

  LbUser.prototype.bindShare = function (qrCode, fn) {
    var user = this;
    var log = Logger.child({
      qrCode: qrCode,
      userId: user.id
    });

    LbUser.app.redisShareDevice.get(qrCode, function(error, result) {
      if(error) {
        var err = new Error('查找临时共享设备时出错');
        err.statusCode = 401;
        err.code = 'SYSTEM_ERROR';
        log.error(error, '查找临时共享设备时出错');
        return fn(err);
      }

      if(result == null) {
        var err = new Error('设备不存在');
        err.statusCode = 404;
        err.code = 'NO_SUCH_DEVICE';
        log.debug({qrCode: qrCode}, '设备不存在');
        return fn(err);
      }

      var resultObj = null;
      try{
        resultObj = JSON.parse(result);
      }
      catch(e) {
        log.error({error: e, result: result}, '解析临时共享模型失败');
        var err = new Error('解析临时共享模型失败');
        err.statusCode = 401;
        err.code = 'SYSTEM_ERROR';
        return fn(err);
      }
      log.debug({result: resultObj}, '解析临时共享模型成功');

      if(resultObj.ownerId != user.id) {
        user.lbShareShared({where: {lbDeviceId: resultObj.lbDeviceId}}, function(error, result) {
          if(error) {
            var err = new Error('查询绑定共享设备时出错');
            err.statusCode = 401;
            err.code = 'SYSTEM_ERROR';
            log.error(error, '查询绑定共享设备时出错');
            return fn(err);
          }

          if(result == null || result.length == 0) {
            resultObj.userId = user.id;
            user.lbShareShared.create(resultObj, function(error, result) {
              if(error) {
                var err = new Error('绑定共享设备时出错');
                err.statusCode = 401;
                err.code = 'SYSTEM_ERROR';
                log.error(error, '绑定共享设备时出错');
                return fn(err);
              }

              if(result == null) {
                var err = new Error('绑定共享设备失败');
                err.statusCode = 401;
                err.code = 'BIND_FAILED';
                log.debug('绑定共享设备失败');
                return fn(err);
              }

              log.debug({result: result}, '绑定共享设备成功');
              return fn(null, resultObj.lbDeviceId);
            });
          }
          else {
            var err = new Error('已绑定过该设备');
            err.statusCode = 401;
            err.code = 'BIND_EXISTED';
            log.debug({result: result}, '已绑定过该设备');
            return fn(err);
          }
        });
      }
      else {
        var err = new Error('不能共享给自己');
        err.statusCode = 401;
        err.code = 'CANNOT_SHARE_TO_SELF';
        log.debug({result: resultObj}, '不能共享给自己');
        return fn(err);
      }
    });
  }

  LbUser.prototype.unbindShare = function (lbDeviceId, fn) {
    var user = this;
    var log = Logger.child({
      applianceId: lbDeviceId,
      userId: user.id
    });

    user.lbShareShared({where: {lbDeviceId: lbDeviceId}}, function(error, share) {
      if(error) {
        var err = new Error('查找共享设备时出错');
        err.statusCode = 401;
        err.code = 'SYSTEM_ERROR';
        log.error(error, '查找共享设备时出错');
        return fn(err);
      }

      if(share == null || share.length == 0) {
        var err = new Error('设备不存在');
        err.statusCode = 404;
        err.code = 'NO_SUCH_DEVICE';
        log.debug('设备不存在');
        return fn(err);
      }
      log.debug({result: share}, '删除共享设备');

      user.lbShareShared.destroy(share[0].id, function(error, result) {
        if(error) {
          var err = new Error('删除共享设备时出错');
          err.statusCode = 401;
          err.code = 'SYSTEM_ERROR';
          log.error(error, '删除共享设备时出错');
          return fn(err);
        }

        if(result == null || result.count == 0) {
          var err = new Error('设备不存在');
          err.statusCode = 404;
          err.code = 'NO_SUCH_DEVICE';
          log.debug('设备不存在');
          return fn(err);
        }

        log.debug({result: result}, '删除共享设备成功');
        fn(null, share[0].lbDeviceId);
      });
    });
  }

  LbUser.prototype.bindDeviceThroughMcloudThirdApi = function (qrCodeSN, fn) {
    this.requestWithAccesstoken(this._bindDeviceThroughMcloudThirdApi,
      arguments);
  }

  LbUser.prototype._bindDeviceThroughMcloudThirdApi = function (qrCodeSN, fn) {
    var user = this;
    var log = Logger.child({
      userId: user.id
    });
    var LbDevice = LbUser.app.models.LbDevice;

    // console.log('qrCodeSN:', qrCodeSN);
    //LSMjEeJR-qJjkSLxb.w25hJuAzSlt3.r1rifF9OR

    fn = fn || utils.createPromiseCallback();

    var requestParams = {};
    var iotsn_path = '/v1/device/pid/get/by/qrcode';
    requestParams.encryption = "1";
    requestParams.orgSn = securityUtils.encrypt(qrCodeSN, config.iotsn_appKey);
    requestParams.stamp = moment()
      .format('YYYYMMDDHHmmss');
    requestParams.sign = securityUtils.requestSign(iotsn_path,
      requestParams, config.iotsn_appKey);

    log.debug({
      requestParams: requestParams
    }, '向SN服务器请求SN信息');
    request.post({
        url: config.iotsn_host_port + iotsn_path,
        qs: requestParams,
        strictSSL: false
      },
      function (err, httpResponse, body) {
        if (err) {
          log.error({
            err: err
          }, '查询设备SN失败');
          return fn(err);
        }
        log.debug({
          body: body
        }, 'sn服务器回复');
        var resultString = JSON.parse(body);
        var result = JSON.parse(resultString);
        var encryptedSN = _.get(result, 'result.applianceSn');
        var decryptedSN = securityUtils.decrypt(encryptedSN, config.iotsn_appKey);
        log.debug({
          applianceSn: decryptedSN
        }, 'sn解码结果');

        // var requestParams = {};
        // requestParams.appId = config.appId;
        // requestParams.stamp = moment().format('YYYYMMDDHHmmss');
        // requestParams.accessToken = securityUtils.encrypt(user.mcloudAccessToken, config.appKey);
        // requestParams.physicalId = securityUtils.encrypt(qrCodeSN, config.appKey);
        // requestParams.sign = securityUtils.requestSign('/v1/third/open/device/register', requestParams, config.appKey);
        //
        // log.debug({requestParams: requestParams}, '向mCloud提交注册请求');
        //
        // request.post({url:'http://'+ config.mcloud_third_host_port + '/v1/third/open/device/register', form:requestParams, strictSSL:false},
        //   function(err, result){
        //     if (err) {
        //       log.error({err: err}, '注册设备失败');
        //       return fn(err);
        //     }
        //
        //     var body = JSON.parse(result.body);
        //     log.debug({body:body}, '注册结果');

        var requestParams = {};
        requestParams.appId = config.appId;
        requestParams.stamp = moment()
          .format('YYYYMMDDHHmmss');
        requestParams.accessToken = securityUtils.encrypt(user.mcloudAccessToken,
          config.appKey);
        requestParams.physicalId = securityUtils.encrypt(qrCodeSN, config
          .appKey);
        requestParams.referPhysicalId = securityUtils.encrypt(decryptedSN,
          config.appKey);
        requestParams.deviceType = '0x' + decryptedSN.substring(4, 6)
          .toUpperCase();

        var PID = LbUser.app.models.PID;
        PID.findById(decryptedSN.substring(8, 17), function (err, result) {
          var deviceType = decryptedSN.substring(4, 6)
            .toLowerCase();
          var modelName = '0000.' + deviceType + '.00000';
          var deviceName = '未知类型设备';
          if (deviceType === 'da') {
            deviceName = '波轮洗衣机';
          } else if (deviceType == 'db') {
            deviceName = '滚筒洗衣机';
          } else if (deviceType == 'dc') {
            deviceName = '干衣机';
          }

          if (result && result.modelName) {
            modelName = result.modelName;
          }

          if (result && result.readableName) {
            deviceName = result.readableName;
          }

          requestParams.modelNumber = modelName;
          requestParams.deviceName = deviceName;
          requestParams.sign = securityUtils.requestSign(
            '/v1/third/open/device/bind', requestParams, config.appKey
          );

          log.debug({
            requestParams: requestParams
          }, '向mCloud提交绑定请求');

          request.post({
              url: 'http://' + config.mcloud_third_host_port +
                '/v1/third/open/device/bind',
              form: requestParams,
              strictSSL: false
            },
            function (err, result) {
              if (err) {
                log.error({
                  err: err
                }, '绑定设备失败');
                return fn(err);
              }
              var body = JSON.parse(result.body);
              log.debug({
                body: body
              }, '绑定结果');
              if (body.errorCode != 0) {
                return fn(new Error(body.errorCode));
              }

              var remoteApplianceInstance = {
                applianceId: _.get(body, 'result.virtualId'),
                sn: decryptedSN,
                deviceType: _.get(body, 'result.deviceType')
                  .substring(2, 4),
                // nickname: deviceName,
                deviceModel: modelName,
                readableName: deviceName
              };

              //创建或更新设备
              LbDevice.upsert(remoteApplianceInstance, function (
                err, applianceInstance) {
                if (err) return;
                //加入至用户设备列表
                user.lbDevices.add(applianceInstance);
                //发送0303指令, 注意不同的设备类型，查询指令不一样！
                var requestParams = {};

                requestParams.appId = '1020';
                requestParams.src = '20';
                requestParams.stamp = moment()
                  .format('YYYYMMDDHHmmss');
                requestParams.virtualId = applianceInstance.applianceId;
                requestParams.deviceType = '0x' +
                  applianceInstance.deviceType;
                requestParams.sign = 'appserver';

                log.info({
                  requestParams: requestParams
                }, '查询设备状态（0303）：向Pro服务器发送查询请求');
                apiClient.open2proClient[applianceInstance.deviceType]
                  .deviceStatus.getDeviceStatus(requestParams,
                    function (resp) {
                      console.log(resp.obj);
                      var errorCode = _.get(resp,
                        'obj.errorCode');
                      if (errorCode == 3123) {
                        applianceInstance.updateAttributes({
                          online: 0
                        });
                      } else {
                        var status = _.get(resp,
                          'obj.result.reply');
                        log.info({
                          status: status
                        }, '更新设备状态');
                        applianceInstance.updateAttributes({
                          status: status
                        });
                      }
                    },
                    function (err) {
                      log.warn({
                        error: err
                      }, '向M-Cloud查询设备状态错误');
                    });
              });

              fn(null, '0', '绑定成功');
            });
        });
        // });
      });

    return fn.promise;
  };

  LbUser.getModelByTypeFromQR = function (type, fn) {
    var log = Logger;
    var PID = LbUser.app.models.PID;

    fn = fn || utils.createPromiseCallback();

    PID.findOne({
        where: {
          typeFromQR: type.toUpperCase()
        }
      },
      function (err, result) {
        if (err) {
          log.error({
            err: err
          }, '查询设备TYPE失败');
          return fn(err);
        }
        log.debug({
          result: result
        }, '查询设备TYPE结果');

        if(result) {
          return fn(null, {modelNumber:result.modelName, modelName:result.readableName});
        }
        else {
          return fn(null, '该设备不存在');
        }

      });

    return fn.promise;
  }

  LbUser.getModelByScannedQRCode = function (qrCodeSN, fn) {
    var log = Logger;

    var LbDevice = LbUser.app.models.LbDevice;

    fn = fn || utils.createPromiseCallback();

    var requestParams = {};
    var iotsn_path = '/v1/device/pid/get/by/qrcode';
    requestParams.encryption = "1";
    requestParams.orgSn = securityUtils.encrypt(qrCodeSN, config.iotsn_appKey);
    requestParams.stamp = moment()
      .format('YYYYMMDDHHmmss');
    requestParams.sign = securityUtils.requestSign(iotsn_path,
      requestParams, config.iotsn_appKey);

    log.debug({
      requestParams: requestParams
    }, '向SN服务器请求SN信息');
    request.post({
        url: config.iotsn_host_port + iotsn_path,
        qs: requestParams,
        strictSSL: false
      },
      function (err, httpResponse, body) {
        if (err) {
          log.error({
            err: err
          }, '查询设备SN失败');
          return fn(err);
        }
        log.debug({
          body: body
        }, 'sn服务器回复');
        var resultString = JSON.parse(body);
        var result = JSON.parse(resultString);
        var encryptedSN = _.get(result, 'result.applianceSn');
        var decryptedSN = securityUtils.decrypt(encryptedSN, config.iotsn_appKey);
        log.debug({
          applianceSn: decryptedSN
        }, 'sn解码结果');

        var deviceInfo = {};
        var PID = LbUser.app.models.PID;
        PID.findById(decryptedSN.substring(8, 17), function (err, result) {
          if (err) {
            log.error({
              err: err
            }, '查询设备型号失败');
            return fn(err);
          }

          var deviceType = decryptedSN.substring(4, 6)
            .toLowerCase();
          var modelName = '0000.' + deviceType + '.00000';
          var deviceName = '未知类型设备';
          if (deviceType === 'da') {
            deviceName = '波轮洗衣机';
          } else if (deviceType == 'db') {
            deviceName = '滚筒洗衣机';
          } else if (deviceType == 'dc') {
            deviceName = '干衣机';
          }

          if (result && result.modelName) {
            modelName = result.modelName;
          }

          if (result && result.readableName) {
            deviceName = result.readableName;
          }

          return fn(null, {modelNumber:modelName, modelName:deviceName});
        });
      });

    return fn.promise;
  };

  LbUser.prototype.controlDevice = function (virtualId, command, fn) {
    var user = this;
    var log = Logger.child({
      applianceId: virtualId,
      userId: user.id
    });
    var LbDevice = LbUser.app.models.LbDevice;

    fn = fn || utils.createPromiseCallback();

    var controlRequest = function(applianceInstance){
      var requestParams = {};

      requestParams.appId = '1020';
      requestParams.src = '20';
      requestParams.stamp = moment()
        .format('YYYYMMDDHHmmss');
      requestParams.virtualId = applianceInstance.applianceId;
      requestParams.deviceType = '0x' + applianceInstance.deviceType;
      requestParams.command = command;
      requestParams.sign = 'appserver';

      log.info({
        requestParams: requestParams
      }, '控制设备状态（0202）：向Pro服务器发送查询请求');
      apiClient.open2proClient[applianceInstance.deviceType].deviceControl
        .controlDevice(requestParams, function (resp) {
          var errorCode = _.get(resp, 'obj.errorCode');
          var msg = _.get(resp, 'obj.msg');
          if (errorCode != 0) {
            log.warn({
              errorCode: errorCode,
              msg: msg
            }, '控制设备时发生错误');
            return fn(new Error(errorCode));
          } else {
            var status = _.get(resp, 'obj.result.reply');
            //TODO: 是否在此处需要判断控制结果与实际期望一致？
            log.info({
              status: status
            }, '控制设备的实时返回结果（非最终状态）');
            return fn(null, '0');
          }
        }, function (err) {
          log.warn({
            error: err
          }, '控制设备时发生错误');
          return fn(err);
        });
    }

    user.lbDevices.findById(virtualId, function (err, applianceInstance) {
      if (err || !applianceInstance) {
        user.lbSharedDevices.findById(virtualId, function (err, applianceInstance) {
          if (err || !applianceInstance) {
            return fn('4001'); //This user has no such appliance
          }
          else {
            controlRequest(applianceInstance);
          }
        });
      }
      else {
        controlRequest(applianceInstance);
      }
    });

    return fn.promise;
  };

  LbUser.prototype.monitorDevice = function (req, cb) {

    var self = this;

    var connectionId = req.accessToken.id;
    var userId = req.accessToken.userId;

    var log = Logger.child({
      connectionId: connectionId,
      userId: userId
    });

    var changes = new PassThrough({
      objectMode: true
    });
    log.info({
      sessionId: changes.domain.members[0].sessionID
    }, '收到设备状态跟踪请求并创建change stream');

    var writeable = true;


    changes.destroy = function () {
      if (changes) {
        log.info({
          sessionId: changes.domain.members[0].sessionID
        }, '删除change stream');
        changes.removeAllListeners('error');
        changes.removeAllListeners('end');
        writeable = false;
        changes = null;
      }
    };

    changes.on('error', function () {
      writeable = false;
    });
    changes.on('end', function () {
      writeable = false;
    });

    process.nextTick(function () {
      cb(null, changes);
    });

    if (LbUser._changes[connectionId]) {
      LbUser._changes[connectionId].destroy();
      LbUser._changes[connectionId] = null;
    }
    LbUser._changes[connectionId] = changes;

    var userListenerTag = 'user-' + userId + '-' + connectionId;
    if (LbUser._listeners[userListenerTag]) {
      LbUser.removeObserver('user-' + userId, LbUser._listeners[
        userListenerTag]);
      LbUser._listeners[userListenerTag] = null;
    }

    var userListener = createBindChangeHandler();
    LbUser._listeners[userListenerTag] = userListener;
    LbUser.observe('user-' + userId, userListener);

    self.lbDevices(function (err, results) {
      if (err || !results) return;

      //TODO: Removing listeners if an accesstoken is removed
      //TODO: further removing dangling listeners (using timestamp? in case an user logins many times without logout. Basically the app should avoid this).
      //TODO: Restrict the number of accesstokens that an user can create.

      for (var i = 0; i < results.length; i++) {
        var listenerTag = results[i].applianceId + '-' + connectionId;
        if (LbUser._listeners[listenerTag]) {
          LbUser.removeObserver(results[i].applianceId, LbUser._listeners[
            listenerTag]);
          LbUser._listeners[listenerTag] = null;
        }
        var listener = createDeviceChangeHandler();
        LbUser._listeners[listenerTag] = listener;
        LbUser.observe(results[i].applianceId, listener);
      }
    });

    function createBindChangeHandler() {
      return function (ctx, next) {
        if (!changes) {
          return next();
        }

        if (!ctx.instance) {
          return next();
        }

        var change = {
          target: ctx.instance.lbUserId,
          data: 'bind',
          type: ctx.operation
        };

        if (writeable) {
          changes.write(change);
          log.info(change, 'Writing bind event');
        }
        return next();
      };
    }

    function createDeviceChangeHandler() {
      return function (ctx, next) {
        if (!changes) {
          return next();
        }

        if (!ctx.instance) {
          return next();
        }
        var data = ctx.instance;
        var target = data.applianceId;

        var change = {
          target: target,
          data: data
        };

        change.type = ctx.isNewInstance ? 'create' : 'update';
        if (writeable) {
          changes.write(change);
          log.info(change, 'Writing change event');
        }
        return next();
      };
    }

  };

  LbUser.udidRegistered = function (udid, fn) {
    fn = fn || utils.createPromiseCallback();
    var UDID = this.relations.udids.modelTo;

    UDID.exists(udid, function (err, exists) {
      if (err) return fn(err);
      fn(null, exists);
    });

    return fn.promise;
  };

  LbUser.signup = function (userInfo, fn) {
    var log = Logger.child({
      username: userInfo.username
    });
    var self = this;
    fn = fn || utils.createPromiseCallback();

    LbUser.app.unique.isUniqueSeconds(userInfo.username, 1, function(error, isUnique) {
      if(error) {
        var err3 = new Error('查看请求是否重复时出错');
        err3.statusCode = 401;
        err3.code = 'SYSTEM_ERROR';
        log.error({isUnique:isUnique, error:error}, '查看请求是否重复时出错');
        fn(err3);
        return fn.promise;
      }
      if(isUnique == null) {
        var err3 = new Error('该请求已经存在');
        err3.statusCode = 401;
        err3.code = 'REQUEST_DUP';
        log.debug({isUnique:isUnique, error:error}, '该请求已经存在');
        fn(err3);
        return fn.promise;
      }
      self.create(userInfo, function (err, userObj) {
        if (err) {
          var err3 = new Error('创建用户失败');
          err3.statusCode = 401;
          err3.code = 'SYSTEM_ERROR';
          log.error({userInfo:userInfo, error:err}, '创建用户失败');
          fn(err3);
          return fn.promise;
        }
        userObj.createAccessToken(1209600, function (err, token) {
          if (err) return fn(err);
          token.__data.user = userObj;
          fn(err, token);
          return fn.promise;
        });
      });
    });
  };

  LbUser.loginByMobile = function (userInfo, fn) {
    var log = Logger.child({
      mobile: userInfo.mobile
    });
    var mobile = userInfo.mobile;
    var code = userInfo.code;
    fn = fn || utils.createPromiseCallback();

    // 校验手机验证码
    LbUser.app.models.LbMobile.verifyMobileCode(mobile, code, function(error, lbMobile) {
      if(error) {
        fn(error);
        return fn.promise;
      }

      // 获取该手机号相关的user
      lbMobile.lbUser(function(error, userObj) {
        if(error) {
          var err3 = new Error('查找的手机绑定的用户时错误');
          err3.statusCode = 401;
          err3.code = 'SYSTEM_ERROR';
          log.error({mobile:mobile, error:error}, '查找的手机绑定的用户时错误');
          fn(err3);
          return fn.promise;
        }

        // 该手机号已存在user
        if(userObj) {
          log.debug({mobile:mobile}, '手机用户使用验证码登录');
          //创建token，有效期31天
          userObj.createAccessToken(2678400, function (err1, token) {
            if (err1) {
              fn(err1);
              return fn.promise;
            }
            token.__data.user = userObj;
            fn(err1, token);
            return fn.promise;
          });
        }//END 该手机号已存在user
        // 该手机号不已存在user
        else {
          LbUser.create({'username':'ls_m_' + mobile, 'password':uuid.v4().substring(0, 8)}, function (err1, userObj1) {
            if (err1) {
              fn(err1);
              return fn.promise;
            }
            //建立hasOne与belongsTo关系
            userObj1.lbMobile(userObj1.lbMobile.build(lbMobile));
            lbMobile.lbUser(lbMobile.lbUser.build(userObj1));
            //保存object到数据库
            userObj1.save();
            lbMobile.save();
            log.debug({mobile:mobile}, '创建手机用户成功');
            //创建token，有效期31天
            userObj1.createAccessToken(2678400, function (err2, token) {
              if (err2) {
                fn(err2);
                return fn.promise;
              }
              token.__data.user = userObj1;
              fn(err2, token);
              return fn.promise;
            });
          });
        }//END 该手机号不已存在user
      });//END 获取该手机号相关的user
    });//END 校验手机验证码
  };

  // 用户绑定手机号
  LbUser.prototype.bindMobile = function (mobileInfo, fn) {
    var log = Logger.child({
      mobile: mobileInfo.mobile
    });
    var mobile = mobileInfo.mobile;
    var code = mobileInfo.code;
    var self = this;
    fn = fn || utils.createPromiseCallback();
    LbUser.app.models.LbMobile.verifyMobileCode(mobile, code, function(error, lbMobile) {
      if(error) {
        fn(error);
        return fn.promise;
      }
      lbMobile.lbUser(function(error, userObj) {
        if(error) {
          var err3 = new Error('查找的手机绑定的用户时错误');
          err3.statusCode = 401;
          err3.code = 'SYSTEM_ERROR';
          log.error({mobile:mobile, error:error}, '查找的手机绑定的用户时错误');
          fn(err3);
          return fn.promise;
        }
        if(userObj) {
          var err3 = new Error('该手机号已经注册');
          err3.statusCode = 401;
          err3.code = 'MOBILE_EXIST';
          log.debug({mobile:mobile, user:userObj}, '该手机号已经注册');
          fn(err3);
          return fn.promise;
        }
        else {
          self.lbMobile(self.lbMobile.build(lbMobile));
          lbMobile.lbUser(lbMobile.lbUser.build(self));
          //保存object到数据库
          self.save();
          lbMobile.save();
          log.debug({mobile:mobile, user:self}, '用户成功绑定手机成功');
          fn(null, '绑定成功');
          return fn.promise;
        }
      });
    });
  };

  /**
   * Signup a user by with the given udid and passcode.
   *
   * ```js
   *    User.signupByUDID(udidInfo, function (err, user) {
   *      console.log(user);
   *    });
   * ```
   *
   * @param {Object} {udid:udid, passcode:passcode, os:.......}
   * @callback {Function} callback Callback function
   * @param {Error} err Error object
   * @param {user} user if signup is successful
   */

  LbUser.signupByUDID = function (udidInfo, fn) {
    var self = this;
    fn = fn || utils.createPromiseCallback();


    if (!udidInfo.udid) {
      var err1 = new Error('udid is required');
      err1.statusCode = 400;
      err1.code = 'UDID_REQUIRED';
      fn(err1);
      return fn.promise;
    }

    if (!udidInfo.passcode) {
      var err2 = new Error('passcode is required');
      err2.statusCode = 400;
      err2.code = 'PASSCODE_REQUIRED';
      fn(err2);
      return fn.promise;
    }

    var UDID = self.relations.udids.modelTo;

    UDID.exists(udidInfo.udid, function (err, exists) {
      if (err) return fn(err);

      if (exists) {
        var err3 = new Error('udid exists');
        err3.statusCode = 401;
        err3.code = 'UDID_EXISTS';
        return fn(err3);
      }

      var passcode = udidInfo.passcode;
      self.findOrCreate({
          where: {
            username: udidInfo.udid
          }
        }, {
          username: udidInfo.udid,
          password: passcode
        },
        function (err, userObj) {
          if (err) return fn(err);
          userObj.udids.create(udidInfo, function (err, udidInfo) {
            if (err) return fn(err);
            userObj.createAccessToken(1209600, function (err,
              token) {
              if (err) return fn(err);
              token.__data.user = userObj;
              fn(err, token);
            });
          });
        }
      );
    });
    return fn.promise;
  };

  /**
   * Login a user by with the given udid and passcode.
   *
   * ```js
   *    User.loginByUDID(creds, include, function (err, token) {
   *      console.log(token.id);
   *    });
   * ```
   *
   * @param {Object} {udid:udid, passcode:passcode}
   * @param {String[]|String} [include] Optionally set it to "user" to include
   * the user info
   * @callback {Function} callback Callback function
   * @param {Error} err Error object
   * @param {AccessToken} token Access token if login is successful
   */

  LbUser.loginByUDID = function (creds, include, fn) {
    var log = Logger;

    log.info({
      creds: creds
    }, '用户使用UDID登录');

    var self = this;
    var UDID = self.relations.udids.modelTo;

    if (typeof include === 'function') {
      fn = include;
      include = undefined;
    }

    fn = fn || utils.createPromiseCallback();

    UDID.findById(creds.udid, function (err, udidObj) {
      if (err) return fn(err);
      if (!udidObj) {
        return self.login({}, include, fn);
      }

      udidObj.lbUser(function (err, user) {
        if (err) return fn(err);

        bcrypt.compare(creds.passcode, udidObj.passcode, function (
          err, isMatch) {
          if (err) return fn(err);

          var defaultError = new Error('login failed');
          defaultError.statusCode = 401;
          defaultError.code = 'LOGIN_FAILED';

          if (!isMatch) {
            return fn(defaultError);
          }

          function tokenHandler(err, token) {
            if (err) return fn(err);
            if (Array.isArray(include) ? include.indexOf('user') !==
              -1 : include === 'user') {
              // NOTE(bajtos) We can't set token.user here:
              //  1. token.user already exists, it's a function injected by
              //     "AccessToken belongsTo User" relation
              //  2. ModelBaseClass.toJSON() ignores own properties, thus
              //     the value won't be included in the HTTP response
              // See also loopback#161 and loopback#162
              token.__data.user = user;
            }
            fn(err, token);
          }

          if (user.createAccessToken.length === 2) {
            user.createAccessToken(creds.ttl, tokenHandler);
          } else {
            user.createAccessToken(creds.ttl, creds,
              tokenHandler);
          }

        });

      });
    });
    return fn.promise;
  };

  LbUser.loginByOpenWeixin = function (creds, include, fn) {
    var log = Logger;

    log.info({
      creds: creds
    }, '用户使用微信OPEN登录');

    var self = this;
    var WeChat = self.relations.wechat.modelTo;

    if (typeof include === 'function') {
      fn = include;
      include = undefined;
    }

    fn = fn || utils.createPromiseCallback();

    var defaultError = new Error('login failed');
    defaultError.statusCode = 401;
    defaultError.code = 'LOGIN_FAILED';

    if (!creds.code) return fn(defaultError);

    //通过微信Oauth接口获取token
    var request = require("request");
    var options = {
      method: 'POST',
      //TODO 将url改为从配置文件中获取
      url: config.wx_token_server_host+":"+config.wx_token_server_port+'/api/WechatOAuthTokens/get_open_user',
      headers: {
        'content-type': 'application/json'
      },
      body: {
        code: creds.code
      },
      json: true
    };

    request(options, function (err, response, result) {
      log.info({
        err: err,
        result: result
      }, '微信OPEN登录结果');
      if (err) {
        log.error({
          options:options,
          err: err,
          result: result
        }, '微信OPEN登录错误');
        return fn(err);
      }
      if (!result.unionid) return fn(defaultError);

      //TODO 获取code的错误处理
      // var accessToken = result.data.access_token;
      var openid = result.unionid;

      WeChat.findOrCreate({
          where: {
            openId: openid
          }
        }, {
          openId: openid,
        },
        function (err, weChatObj) {
          log.info({
            err: err,
            weChatObj: weChatObj
          }, 'App系统微信OPEN账号建立');
          if (err) return fn(err);

          //检查该微信账号是否有对应的app账号，如果没有需要创建
          weChatObj.lbUser(function (err, userObj) {
            if (err) {
              log.warn({
                error: err
              }, '查找微信OPEN对应的User时错误');
              return fn(err);
            }

            if (userObj) { //已有app账号
              log.info({
                userObj: userObj
              }, '使用已有App账号登录');
              userObj.createAccessToken(7200, function (err,
                token) {
                if (err) return fn(err);
                token.__data.user = userObj;
                fn(err, token);
              });
            } else { //没有app账号
              self.findOrCreate({
                  where: {
                    username: 'wx_' + openid
                  }
                }, {
                  username: 'wx_' + openid,
                  password: uuid.v4()
                    .substring(0, 8)
                },
                function (err, userObj) {
                  log.info({
                    userObj: userObj
                  }, '创建App账号登录');
                  if (err) return fn(err);

                  weChatObj.updateAttributes({
                    lbUserId: userObj.id
                  }, function (err, instance) {
                    if (err) return fn(err);
                    log.info({
                      weChatObj: weChatObj,
                      userObj: userObj
                    }, '绑定微信OPEN UnionId与App账号');
                  });

                  userObj.createAccessToken(7200, function (err,
                    token) {
                    if (err) return fn(err);
                    token.__data.user = userObj;
                    fn(err, token);
                  });
                });
            }
          });
        });
    });

    return fn.promise;
  };

  LbUser.loginByWeChat = function (creds, include, fn) {
    var log = Logger;

    log.info({
      creds: creds
    }, '用户使用微信登录');

    var self = this;
    var WeChat = self.relations.wechat.modelTo;

    if (typeof include === 'function') {
      fn = include;
      include = undefined;
    }

    fn = fn || utils.createPromiseCallback();

    var defaultError = new Error('login failed');
    defaultError.statusCode = 401;
    defaultError.code = 'LOGIN_FAILED';

    if (!creds.code) return fn(defaultError);

    //通过微信Oauth接口获取token
    var request = require("request");
    var options = {
      method: 'POST',
      //TODO 将url改为从配置文件中获取
      url: config.wx_token_server_host+":"+config.wx_token_server_port+'/api/WechatOAuthTokens/get_user',
      headers: {
        'content-type': 'application/json'
      },
      body: {
        code: creds.code
      },
      json: true
    };

    request(options, function (err, response, result) {
      log.info({
        err: err,
        result: result
      }, '微信登录结果');
      if (err) {
        log.error({
          options:options,
          err: err,
          result: result
        }, '微信登录错误');
        return fn(err);
      }

      //TODO 获取code的错误处理
      // var accessToken = result.data.access_token;
      if (!result.unionid) return fn(defaultError);
      var openid = result.unionid;

      WeChat.findOrCreate({
          where: {
            openId: openid
          }
        }, {
          openId: openid,
        },
        function (err, weChatObj) {
          log.info({
            err: err,
            weChatObj: weChatObj
          }, 'App系统微信账号建立');
          if (err) return fn(err);

          //更新如果lb-wechat的openIdReal不存在，则更新
          if (weChatObj.openIdReal == null) {
            weChatObj.updateAttributes({
              'openIdReal': result.openid
            }, function(wechatUpdateErr, wechatUpdateResult) {
              if (wechatUpdateErr == null) {
                console.log('wechatUpdateResult', JSON.stringify(wechatUpdateResult));
              } else {
                console.log('wechatUpdateErr', JSON.stringify(wechatUpdateErr));
              }
            });
          }

          //检查该微信账号是否有对应的app账号，如果没有需要创建
          weChatObj.lbUser(function (err, userObj) {
            if (err) {
              log.warn({
                error: err
              }, '查找微信对应的User时错误');
              return fn(err);
            }

            if (userObj) { //已有app账号
              log.info({
                userObj: userObj
              }, '使用已有App账号登录');
              userObj.createAccessToken(7200, function (err,
                token) {
                if (err) return fn(err);
                token.__data.user = userObj;
                fn(err, token);
              });
            } else { //没有app账号
              self.findOrCreate({
                  where: {
                    username: 'wx_' + openid
                  }
                }, {
                  username: 'wx_' + openid,
                  password: uuid.v4()
                    .substring(0, 8)
                },
                function (err, userObj) {
                  log.info({
                    userObj: userObj
                  }, '创建App账号登录');
                  if (err) return fn(err);

                  weChatObj.updateAttributes({
                    lbUserId: userObj.id
                  }, function (err, instance) {
                    if (err) return fn(err);
                    log.info({
                      weChatObj: weChatObj,
                      userObj: userObj
                    }, '绑定微信OpenId与App账号');
                  });

                  userObj.createAccessToken(7200, function (err,
                    token) {
                    if (err) return fn(err);
                    token.__data.user = userObj;
                    fn(err, token);
                  });
                });
            }
          });
        });
    });

    return fn.promise;
  };

  LbUser.getAppUserIdByMcloudId = function(mcloudId, cb){
    LbUser.find({where: {mcloudUserId: mcloudId}}, function(err, result){
      if (err) {
        return cb(err);
      } else if (result && result.length) {
        return cb(null, result[0].id);
      } else {
        return cb(null, null);
      }
    });
  }

  LbUser.remoteMethod(
    'initializeDevicesInfo', {
      accessType: 'READ',
      isStatic: false,
      http: [
        {
          verb: 'post',
          path: '/refresh-devices-list'
        },
        {
          verb: 'get',
          path: '/refresh-devices-list'
        }
    ],
      returns: [
        {
          arg: 'errorCode',
          type: 'string'
      },
        {
          arg: 'msg',
          type: 'string'
      }
    ]
    }
  );

  // LbUser.remoteMethod(
  //   'updateMcloudUserId', {
  //     accessType: 'WRITE',
  //     isStatic: false,
  //     accepts: {
  //       arg: 'mcloudUserId',
  //       type: 'string',
  //       http: {
  //         source: 'query'
  //       }
  //     },
  //     http: [
  //       {
  //         verb: 'put',
  //         path: '/updateMcloudUserId'
  //       }
  //   ],
  //     returns: [
  //       {
  //         arg: 'errorCode',
  //         type: 'string'
  //     },
  //       {
  //         arg: 'msg',
  //         type: 'string'
  //     }
  //   ]
  //   }
  // );

  LbUser.remoteMethod(
    'unbindDeviceThroughOpenCloud', {
      accessType: 'WRITE',
      isStatic: false,
      accepts: {
        arg: 'virtualId',
        type: 'string',
        http: {
          source: 'query'
        }
      },
      http: [
        {
          verb: 'put',
          path: '/unbind'
        }
    ],
      returns: [
        {
          arg: 'errorCode',
          type: 'string'
      },
        {
          arg: 'msg',
          type: 'string'
      }
    ]
    }
  );

  LbUser.remoteMethod(
    'createShare', {
      description: '创建一个临时的共享关系，有效期120s.',
      isStatic: false,
      accepts: {
        arg: 'lbDeviceId',
        type: 'string',
        required: true,
        http: {
          source: 'query'
        }
      },
      http: [
        {
          verb: 'get',
          path: '/createShare'
        }
    ],
      returns: [
        {
          arg: 'qrCode',
          type: 'string'
      },
        {
          arg: 'msg',
          type: 'string'
      }
    ]
    }
  );

  LbUser.remoteMethod(
    'deleteShare', {
      description: '强制删除共享关系.',
      isStatic: false,
      accepts: [
        {
        arg: 'lbDeviceId',
        type: 'string',
        required: true,
        http: {
          source: 'query'
          }
        },
        {
        arg: 'userId',
        type: 'string',
        required: true,
        http: {
          source: 'query'
        }
      }
      ],
      http: [
        {
          verb: 'get',
          path: '/deleteShare'
        }
    ],
      returns: [
        {
          arg: 'lbDeviceId',
          type: 'string'
      },
        {
          arg: 'msg',
          type: 'string'
      }
    ]
    }
  );

  LbUser.remoteMethod(
    'bindShare', {
      description: '通过共享绑定设备.',
      isStatic: false,
      accepts: {
        arg: 'qrCode',
        type: 'string',
        required: true,
        http: {
          source: 'query'
        }
      },
      http: [
        {
          verb: 'get',
          path: '/bindShare'
        }
    ],
      returns: [
        {
          arg: 'lbDeviceId',
          type: 'string'
      },
        {
          arg: 'msg',
          type: 'string'
      }
    ]
    }
  );

  LbUser.remoteMethod(
    'unbindShare', {
      description: '解绑通过共享获取的设备.',
      isStatic: false,
      accepts: {
        arg: 'lbDeviceId',
        type: 'string',
        required: true,
        http: {
          source: 'query'
        }
      },
      http: [
        {
          verb: 'get',
          path: '/unbindShare'
        }
    ],
      returns: [
        {
          arg: 'lbDeviceId',
          type: 'string'
      },
        {
          arg: 'msg',
          type: 'string'
      }
    ]
    }
  );

  LbUser.remoteMethod(
    'bindDeviceThroughMcloudThirdApi', {
      accessType: 'WRITE',
      isStatic: false,
      accepts: {
        arg: 'qrCodeSN',
        type: 'string',
        http: {
          source: 'query'
        }
      },
      http: [
        {
          verb: 'put',
          path: '/bind'
        }
    ],
      returns: [
        {
          arg: 'errorCode',
          type: 'string'
      },
        {
          arg: 'msg',
          type: 'string'
      }
    ]
    }
  );

  LbUser.remoteMethod(
    'controlDevice', {
      isStatic: false,
      accepts: [
        {
          arg: 'virtualId',
          type: 'number',
          description: '设备虚拟ID（M-Cloud平台家电ID）',
          required: true
      },
        {
          arg: 'command',
          type: 'string',
          description: '设备控制命令，苏宁，京东示例：{"temperture":"2","mode":"2"} 阿里示例：{ "temp": { "value": "24"},"fanspeed": { "value": "5"}}，具体参数根据阿里提供的设备功能定义确定。\n',
          required: true
      }
    ],
      returns: [
        {
          arg: 'errorCode',
          type: 'string'
        },
        {
          arg: 'result',
          type: 'object'
        }
    ],
      http: {
        verb: 'put',
        path: '/control'
      },
      description: '应用服务器给OpenCloud提供设备控制功能。\n返回值：{errorCode:xxx, result: {reply: \'设备状态返回值\'}}\n'
    }
  );

  LbUser.remoteMethod(
    'monitorDevice', {
      accessType: 'READ',
      isStatic: false,
      accepts: {
        arg: 'req',
        type: 'object',
        http: {
          source: 'req'
        }
      },
      http: [
        {
          verb: 'post',
          path: '/monitor-device'
        },
        {
          verb: 'get',
          path: '/monitor-device'
        }
    ],
      returns: {
        arg: 'changes',
        type: 'ReadableStream',
        json: true
      }
    }
  );

  LbUser.remoteMethod(
    'getOpenCloudUserToken', {
      accessType: 'READ',
      isStatic: false,
      http: [
        {
          verb: 'get',
          path: '/opencloud-token'
        }
    ],
      returns: [
        {
          arg: 'token',
          type: 'string'
        },
        {
          arg: 'expires',
          type: 'number'
        }
    ]
    }
  );

  LbUser.remoteMethod(
    'udidRegistered', {
      description: 'Check if an udid has been registered.',
      accepts: [
        {
          arg: 'udid',
          type: 'string',
          required: true,
          http: {
            source: 'query'
          },
          description: 'the udid to check'
        }
    ],
      returns: {
        arg: 'exists',
        type: 'boolean'
      },
      http: {
        verb: 'get'
      }
    }
  );

  LbUser.remoteMethod(
    'signupByUDID', {
      description: 'signup and login an user with udid and passcode.',
      accepts: [
        {
          arg: 'udidInfo',
          type: 'Object',
          required: true,
          http: {
            source: 'body'
          },
          description: '{"udid": "abcde", "passcode":"1234", "os":"android"}'
        }
    ],
      returns: {
        arg: 'accessToken',
        type: 'object',
        root: true,
        description: '  - `user` - `{User}` - Data of the currently logged in user. (`include=user`)\n\n'
      },
      http: {
        verb: 'post'
      }
    }
  );

  LbUser.remoteMethod(
    'bindMobile', {
      isStatic: false,
      description: 'login an user with mobile and code.',
      accepts: [
        {
          arg: 'mobileInfo',
          type: 'Object',
          required: true,
          http: {
            source: 'body'
          },
          description: '{"mobile": "13012341234", "code":"123123"}'
        }
    ],
      returns: {
        arg: 'accessToken',
        type: 'object',
        root: true,
        description: '  - `user` - `{User}` - Data of the currently logged in user. (`include=user`)\n\n'
      },
      http: {
        verb: 'post'
      }
    }
  );

  LbUser.remoteMethod(
    'loginByMobile', {
      description: 'login an user with mobile and code.',
      accepts: [
        {
          arg: 'userInfo',
          type: 'Object',
          required: true,
          http: {
            source: 'body'
          },
          description: '{"mobile": "13012341234", "code":"123123"}'
        }
    ],
      returns: {
        arg: 'accessToken',
        type: 'object',
        root: true,
        description: '  - `user` - `{User}` - Data of the currently logged in user. (`include=user`)\n\n'
      },
      http: {
        verb: 'post'
      }
    }
  );

  LbUser.remoteMethod(
    'signup', {
      description: 'signup and login an user with udid and passcode.',
      accepts: [
        {
          arg: 'userInfo',
          type: 'Object',
          required: true,
          http: {
            source: 'body'
          },
          description: '{"username": "abcde", "password":"1234"}'
        }
    ],
      returns: {
        arg: 'accessToken',
        type: 'object',
        root: true,
        description: '  - `user` - `{User}` - Data of the currently logged in user. (`include=user`)\n\n'
      },
      http: {
        verb: 'post'
      }
    }
  );

  LbUser.remoteMethod(
    'loginByUDID', {
      description: 'Login a user with udid and passcode.',
      accepts: [
        {
          arg: 'creds',
          type: 'Object',
          required: true,
          http: {
            source: 'body'
          },
          description: '{"udid": "abcde", "passcode":"1234"}'
        },
        {
          arg: 'include',
          type: ['string'],
          http: {
            source: 'query'
          },
          description: 'Related objects to include in the response. ' +
            'See the description of return value for more details.'
        }
    ],
      returns: {
        arg: 'accessToken',
        type: 'object',
        root: true,
        description: 'The response body contains properties of the AccessToken created on login.\n' +
          'Depending on the value of `include` parameter, the body may contain ' +
          'additional properties:\n\n' +
          '  - `user` - `{User}` - Data of the currently logged in user. (`include=user`)\n\n'
      },
      http: {
        verb: 'post'
      }
    }
  );

  LbUser.remoteMethod(
    'loginByOpenWeixin', {
      description: 'Login a user with wechat\'s redirected code parameter.',
      accepts: [
        {
          arg: 'creds',
          type: 'Object',
          required: true,
          http: {
            source: 'body'
          },
          description: '{"code": "12345"}'
        },
        {
          arg: 'include',
          type: ['string'],
          http: {
            source: 'query'
          },
          description: 'Related objects to include in the response. ' +
            'See the description of return value for more details.'
        }
    ],
      returns: {
        arg: 'accessToken',
        type: 'object',
        root: true,
        description: 'The response body contains properties of the AccessToken created on login.\n' +
          'Depending on the value of `include` parameter, the body may contain ' +
          'additional properties:\n\n' +
          '  - `user` - `{User}` - Data of the currently logged in user. (`include=user`)\n\n'
      },
      http: {
        verb: 'post'
      }
    }
  );

  LbUser.remoteMethod(
    'loginByWeChat', {
      description: 'Login a user with wechat\'s redirected code parameter.',
      accepts: [
        {
          arg: 'creds',
          type: 'Object',
          required: true,
          http: {
            source: 'body'
          },
          description: '{"code": "12345"}'
        },
        {
          arg: 'include',
          type: ['string'],
          http: {
            source: 'query'
          },
          description: 'Related objects to include in the response. ' +
            'See the description of return value for more details.'
        }
    ],
      returns: {
        arg: 'accessToken',
        type: 'object',
        root: true,
        description: 'The response body contains properties of the AccessToken created on login.\n' +
          'Depending on the value of `include` parameter, the body may contain ' +
          'additional properties:\n\n' +
          '  - `user` - `{User}` - Data of the currently logged in user. (`include=user`)\n\n'
      },
      http: {
        verb: 'post'
      }
    }
  );

  LbUser.remoteMethod(
    'getAppUserIdByMcloudId', {
      description: 'Get user id by mcloud id.',
      accepts: [
        {
          arg: 'mcloudId',
          type: 'string',
          required: true,
          http: {
            source: 'query'
          }
        }
      ],
      returns: {
        arg: 'appUserId',
        type: 'string'
      },
      http: {
        verb: 'get',
        path: '/appUserId'
      }
    }
  );

  LbUser.remoteMethod(
    'getModelByTypeFromQR', {
      description: 'Get device model info by scanned device type.',
      accepts: [
        {
          arg: 'type',
          type: 'string',
          required: true
        }
      ],
      returns: {
        arg: 'modelInfo',
        type: 'object',
        description: '{modelNumber:0000.db.12345, modelName:MG70-eco11}'
      },
      http: {
        verb: 'get',
        path: '/modelInfoByType'
      }
    }
  );

  LbUser.remoteMethod(
    'getModelByScannedQRCode', {
      description: 'Get device model info by scanned qrcode sn.',
      accepts: [
        {
          arg: 'qrCodeSN',
          type: 'string',
          required: true
        }
      ],
      returns: {
        arg: 'modelInfo',
        type: 'object',
        description: '{modelNumber:0000.db.12345, modelName:MG70-eco11}'
      },
      http: {
        verb: 'get',
        path: '/modelInfo'
      }
    }
  );
};
