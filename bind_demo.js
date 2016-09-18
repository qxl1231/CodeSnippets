/**
 * Created by qiangxl on 16/8/29.
 */
var readline = require('readline-cb');
var async = require('async');
var promise = require('promise');
var _ = require('lodash')
var server_config = require('../server-config');
var app = require('../server');
var bind = function (filePath, response) {
  //function clearString(s) {
  //  var pattern = new RegExp("[`~!@#$^&*()=|{}':;',\\[\\].<>/?~！@#￥……&*（）&;|{}【】‘；：”“'。，、？]")
  //  var rs = "";
  //  for (var i = 0; i < s.length; i++) {
  //    rs = rs + s.substr(i, 1).replace(pattern, '');
  //  }
  //  return rs;
  //}

  var i = 0;

  var lineList = [];
  var limit = 0;
  var wechatRetOK = 0;
  var errMacNum = 0;
  var errMacList = [];
  var productId = server_config["wechat-iot"]["productId"];
  var isError = false;
  readline.readLines(filePath,
    function (line, linecb) {
      if (isError) {
        return linecb();
      }
      console.log(++i, line);

      //console.log('aaaa:', arguments);
      var trimline = line.trim();

      if (trimline != '' & trimline.length != 12) {
        isError = true;
        response.send('error:微信鉴权必须上传正确长度的mac地址,长度必须为12,mac:'+ trimline);
      }
      else {

        if (trimline) {
          //先做判断数据库中是否存在mac的逻辑判断,存在则不让插入
          var check = {
            'mac': trimline.toUpperCase(),
          };
          app.models.Device.findOne({where: check}, function (err, checkRes){
            //console.log('check:',checkRes)
            if(checkRes||err){

              return linecb();
            }
            else{
              var empty = {
                'mac': 'empty',
              };
              app.models.Device.findOne({where: empty}, function (err, find) {

                //todo:此处需要考虑,万一没有empty的设备的情况
                //console.log(arguments)
                if (find == null) {
                  //console.log('no empty device can use!please apply new');
                  app.logger.debug('no empty device can use!please apply new');

                  isError = true;
                  response.send('数据库中设备池为空,请联系管理员添加!然后再上传~');
                  return linecb();
                }
                else {
                  //4.get auth wechat,connect_protocol=3-蓝牙,4-wifi
                  var optype = '1';
                  var deviceId = find.deviceId;
                  //  var deviceId='gh_19f3c9f2297a_8c2b2af1dbb5bd34dc2a6ca0631f5a24';
                  var qrTicket = find.qrTicket;
                  var mac = trimline.toUpperCase();
                  var device = {
                    'id': deviceId,
                    'mac': mac,
                    'connect_protocol': '3',
                    'auth_key': '',
                    'close_strategy': '1',
                    'conn_strategy': '1',
                    'crypt_method': '0',
                    'auth_ver': '0',
                    'manu_mac_pos': '-1',
                    'ser_mac_pos': '-2',
                    'ble_simple_protocol': '0'
                  }
                  //state=1 mac读取成功,并入库,state=2 微信绑定返回成功
                  //find[index].updateAttributes({'mac': mac, state: 1});

                  app.api.authorizeDevices([device], optype, productId,
                    function (err, res) {
                      console.log('微信授权回复:', res)
                      if (err || res == null || res == undefined) {
                        app.logger.error(err, '绑定mac时与微信通信失败');
                        errMacList.push(device.mac);
                        errMacNum++;
                        return linecb();
                        //done(err);
                      } else {
                        //done: 1.判断是否返回成功,2.成功的话才去数据库里查询设备,然后更新mac属性
                        for (var i = 0; i < res.resp.length; i++) {
                          var errCode = res.resp[i].errcode;
                          if (errCode == 0 || errCode == '0') {

                            var base_info = res.resp[i].base_info;
                            app.logger.debug(res, '绑定mac时与微信通信成功');
                            var query = {
                              'deviceId': base_info.device_id,
                            };
                            app.models.Device.findOne({where: query}, function (err, one) {
                              if (err)   app.logger.error(err, '微信返回成功后查询device失败');
                              one.updateAttributes({mac: mac,state: 2});
                              return linecb();
                            })
                            wechatRetOK++;

                            //console.log('wechatRetOK',wechatRetOK);

                            //done('success!');
                          } else {
                            app.logger.error(res, '绑定mac时与微信通信返回err');
                            errMacList.push(device.mac);
                            errMacNum++;
                            return linecb();
                            //done(res);
                          }
                        }
                      }

                    });
                }

              });
            }
          })


        }
        else{
          return linecb();
        }
      }
    },
    function (err) {
      if (err) app.logger.error(err);
      if(!isError) {
        var countState = 0;
        //查询当前数据库中包括多少stat=2 也就是微信绑定成功的设备
        app.models.Device.count({state: 2}, function (err, count) {
          //console.log('count:',count);
          countState = count;
          var total = countState ;
          if (errMacNum == 0) {
            response.send('本次上传并绑定' + wechatRetOK + '个设备mac!' + '当前数据库中总计绑定了' + total + '个设备mac!');
          }
          else {
            response.send('本次上传并绑定' + wechatRetOK + '个设备mac!' + '微信鉴权失败了' + errMacNum + '个设备,设备列表:' + errMacList + '!请重新上传!' + '当前数据库中总计绑定了' + total + '个设备mac!');
          }
        })
      }
      isError = false;
    });

}
exports.bind = bind;
