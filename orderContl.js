var mongoose = require('mongoose');
var Order = mongoose.model('Order');
var WechatFans = mongoose.model('WechatFans');
var async = require('async');
var config = require('../config/config');
var ObjectId = mongoose.Types.ObjectId;
var express = require('express');
var moment = require('moment');
var app = express();
var Device = mongoose.model('Device');
var Store = mongoose.model('Store');
var Franchisee = mongoose.model('Franchisee');
var excal = require('excel-export');
var fs = require('fs');
var orderExoprt = require('../../export_order');
// write

/**
 * 新增型号
 * @param req
 * @param res
 */
exports.init = function (req, res) {
    Device.find({}, function (err, device) {
        for (a in device) {
            for (var i = 1; i < 6; i++) {
                var Or = new Order({
                    wechatFansId: ObjectId('565e6a6279132faf3b852163'), orderNo: "NO888666" + i
                    , deviceId: ObjectId(device[a]._id), amount: 2000 + i, allowance: 2000 + i
                    , status: i + "0", createAt: new Date()
                    , useTime: new Date(), endTime: new Date() + i, execTime: 10 + i
                });

                Or.save(function (err, obj) {
                    if (err) {
                        console.log(err);
                    }
                });
                console.log("Order " + Or + " created.");
            }
        }
        res.redirect('/order/showList')
    })
}
/**
 * 新增型号
 * @param req
 * @param res
 */
exports.testOrder = function (req, res) {
    getOrder(req, res, function (err, orders) {
        res.send(orders);
    });
}
/**
 * 查看全部订单数据
 */
/*user list table json datasource*/
exports.datatable = function (req, res) {
    var code = getStratuName(req.query.search.value);
    var date = vailDateTiem(req.query.search.value);
    var start1 = req.param("starts");
    var end1 = req.param("end");
    var querys = {};
    if (code != '') {
        req.query.search.value = code;
        console.log(req.query.search.value);
    }
    if (date != '') {
        var d = moment(date);
        var startStr = d.format("YYYY/MM/DD 00:00:00");//当天的零点
        var endStr = d.format("YYYY/MM/DD 23:59:59");//当天最后时间
        var start = new Date(startStr);
        var end = new Date(endStr);
        querys = {conditions: {"createAt": {$gte: start, $lt: end}}};
        req.query.search.value = '';
    } else if (start1 != 0 && start1 != null && end1 != "" && end1 != undefined) {
        var date1 = moment(start1).format("YYYY/MM/DD 00:00:00");
        var date2 = moment(end1).format("YYYY/MM/DD 23:59:59");
        var sdate = new Date(date1);
        var edate = new Date(date2);
        querys = {conditions: {"createAt": {$gte: sdate, $lt: edate}}};
        req.query.search.value = '';
    } else {
    }

    Order.dataTable(req.query, querys, function (err, data) {
        res.send(data);
    });
}
/**
 * 根据状态名获取状态编号
 * @param name
 * @returns {string}
 */
function getStratuName(name) {
    var code = '';
    var status = new Order().getAllStatus();
    for (i in status) {
        if (status[i].name == name) {
            code = status[i].code;
            break;
        }
    }
    return code;
}
/**
 * 根据状态名获取状态编号
 * @param name
 * @returns {string}
 */
function getStratuBycode(code) {
    var name = '';
    var status = new Order().getAllStatus();
    for (i in status) {
        if (status[i].code == code) {
            name = status[i].name;
            break;
        }
    }
    return name;
}

/**
 * 验证是否是时间格式的数据
 * @param dateTiem
 * @returns {Date}
 */
function vailDateTiem(dateTiem) {
    var date = new Date();
    var _reTimeReg = /^(?:19|20)[0-9][0-9]-|\/(?:(?:0[1-9])|(?:1[0-2]))-|\/(?:(?:[0-2][1-9])|(?:[1-3][0-1])) (?:(?:[0-2][0-3])|(?:[0-1][0-9])):[0-5][0-9]:[0-5][0-9]$/;
    var _reTimeRegs = /^(?:19|20)[0-9][0-9]-|\/(?:(?:0[1-9])|(?:1[0-2]))-|\/(?:(?:[0-2][1-9])|(?:[1-3][0-1]))$/;
    if (_reTimeReg.test(dateTiem) || _reTimeRegs.test(dateTiem)) {
        date = new Date(dateTiem);
    } else {
        date = '';
    }
    return date;
}
/**
 * 查看全部订单页面
 * @param req
 * @param res
 */
exports.showList = function(req, res) {
    res.render('order/orderList');
}
function queryOrder(querys, callback) {
    var query = Order.find(querys).sort('createAt');
    query.populate([  //这里将所需信的关联对象查出
        {"path": "wechatFansId", "select": "nickname"},
        {"path": "deviceId", "select": "name no"},
        {"path": "storeId", "select": "name ratio"},
        {"path": "commandId", "select": "type"},
        {"path": "franchiseeId", "select": "fullname"}
    ]).exec(function (err, orders) {      //查询结果
        if (!err) {
            var order = [];
            var i = 0;
            orders.forEach(function (pop) {
                i++;
                var item;
                var income = pop.payment - pop.payment * (pop.storeId == null || pop.storeId.ratio == undefined ? 1 : pop.storeId.ratio / 100); //计算实际收入
                var useTime = pop.useTime == undefined ? "无" : moment(pop.useTime).format("YYYY/MM/DD HH:mm:ss");
                var endTime = pop.endTime == undefined ? "无" : moment(pop.endTime).format("YYYY/MM/DD HH:mm:ss");
                var status = getStratuBycode(pop.status);
                var refund=pop.status == '60' ? pop.allowance : 0;
                item = [i
                    , pop.franchiseeId == null ? "" : pop.franchiseeId.fullname   //加盟商
                    , pop.orderNo     //订单号
                    , pop.wxOrderNo ?   pop.wxOrderNo:""   //商户订单号
                    , '学校'
                    , pop.storeId == null ? "" : pop.storeId.name  //洗衣房
                    , pop.deviceId == null ? "" : pop.deviceId.name   //设备名称
                    , pop.deviceId == null ? "" : pop.deviceId.no   //设备编号
                    , pop.wechatFansId == null ? "" : pop.wechatFansId.nickname   //微信用户名
                    , status, pop.commandId == null ? "" : pop.commandId.type    //订单命令
                    , useTime
                    , endTime
                    , pop.payment, pop.amount
                    , pop.storeId == null || pop.storeId.ratio == undefined ? "100%" : pop.storeId.ratio + '%'      //分成比例的计算结果
                    , refund
                ];
                order.push(item);
            });
            callback(err, order);   //返回结果
        }
    });
}
/**
 * 获取订单导出的数据
 * @param req
 * @param res
 */
function getOrder(req, res) {
    var start1 = req.param("starts");
    var end1 = req.param("end");
    var querys = {};
    if (start1 != 0 && start1 != null && end1 != "" && end1 != undefined) {//验证导出时的时间段
        var date1 = moment(start1).format("YYYY/MM/DD 00:00:00");
        var date2 = moment(end1).format("YYYY/MM/DD 23:59:59");
        var sdate = new Date(date1);
        var edate = new Date(date2);
        querys = {"createAt": {$gte: sdate, $lt: edate}}; //根据时间段条件查询
    } else {
        querys = {};
    }
    orderExoprt(querys, res);
}

/**
 * 获取订单导出的数据
 * @param req
 * @param res
 */
function getOrderByFranchisee(req, res) {
    var start1 = req.param("start");
    var end1 = req.param("end");
    console.log("=================================>" + start1);
    console.log("=================================>" + end1);
    var id = req.user._id;
    var querys = {};
    if (start1 != 0 && start1 != null && end1 != "" && end1 != undefined) {//验证导出时的时间段
        var date1 = moment(start1).format("YYYY/MM/DD 00:00:00");
        var date2 = moment(end1).format("YYYY/MM/DD 23:59:59");
        var sdate = new Date(date1);
        var edate = new Date(date2);
        querys = {"createAt": {$gte: sdate, $lt: edate}, "franchiseeId": id}; //根据时间段条件查询
    } else {
        querys = {"franchiseeId": id};
    }
    orderExoprt(querys, res);
}
/**
 * 导出订单
 * @param req
 * @param res
 */
exports.exportOrder = function (req, res) {
    var isFranchisee = req.param("isFranchisee");
    console.log("===============================>" + isFranchisee);
    if (isFranchisee) {
        getOrderByFranchisee(req, res);
    } else {
        getOrder(req, res);
    }

}
/**
 * 查看今日订单页面
 * @param req
 * @param res
 */
exports.todayOrder = function (req, res) {
  //var now = Date.now();
  //var todayNow = now - now % 86400000 - 28800000;
  //var today = new Date(todayNow);
  //
  //Order.find({}).where('createAt').gt(today).limit(10).exec(function (err, orders) {
  //    console.log('todayOrder', orders.length);
  //    res.render('order/orderTodayList', {
  //        orders: orders
  //    })
  //})
  res.render('order/orderTodayList');
}
/**
 * 查看今日订单数据
 */
/*user list table json datasource*/
exports.datatableToday = function (req, res) {

    var code = getStratuName(req.query.search.value);
    if (code != '') {
        req.query.search.value = code;
        console.log(req.query.search.value);
    }
    var date = moment(new Date());
    var startStr = date.format("YYYY/MM/DD 00:00:00");//当天的零点
    var endStr = date.format("YYYY/MM/DD 23:59:59");//当天最后时间
    var start = new Date(startStr);
    var end = new Date(endStr);
    Order.dataTable(req.query, {conditions: {"createAt": {$gte: start, $lt: end}}}, function (err, data) {
        res.send(data);
    });
}
/**
 * //获取所有的状态
 * @param req
 * @param res
 */
exports.getAllStatus = function (req, res) {
    var status = new Order().getAllStatus(req, res);
    res.send(status);
};
/**
 * 加盟商自己查看订单记录
 * @param req
 * @param res
 */
exports.orderRecord = function (req, res) {
    var orderNo = req.body.orderNo;
    var status = req.body.status;
    var today = req.param("today");
    console.log(req.body);

    orderBydevices(req, res, function (result, page, orders) {
        if (result == '') {   //获取到订单返回页面
            res.render('order/orderRecordList', {
                page: page,
                orders: orders,        //获取到订单返回的订单
                orderNo: orderNo == undefined ? "" : orderNo,  //获取到订单返回查询单号
                status: status == null ? "" : status,         //获取到订单返回页面查询状态
                today: today == null || today == undefined ? req.body.today : today    //获取到订单条件
            })
        } else {
            res.render('order/orderRecordList', {
                page: page,
                results: result,
                orderNo: orderNo == undefined ? "" : orderNo,  //获取到订单返回查询单号
                status: status == null ? "" : status,         //获取到订单返回页面查询状态
                today: today == null || today == undefined ? req.body.today : today  //获取到订单条件
            })
        }
    });
};

/**
 * 根据加盟商的洗衣店获取设备
 * @param req
 * @param res
 * @param callback
 */
function orderBydevices(req, res, callback) {
    var orderNo = req.body.orderNo;
    var status = req.body.status;
    var t = req.param("today");
    var today = t == null || t == undefined ? req.body.today : t;
    var queryObj = {};

    if (orderNo != '' && orderNo != undefined) { //添加订单号查询条件
        queryObj.orderNo = {$regex: orderNo};
    }

    if (status != '' && status != null && status != "") {  //添加订单状态查询条件
        queryObj.status = status;
    }

    if (today != null && today != "undefined") {
        var date = moment(new Date());
        var startStr = date.format("YYYY/MM/DD 00:00:00");//当天的零点
        var endStr = date.format("YYYY/MM/DD 23:59:59");//当天最后时间
        var start = new Date(startStr);
        var end = new Date(endStr);
        queryObj.createAt = {$gte: start, $lt: end};
    }

    deviceByStoreId(req, res, function (err, deviceList) {
        if (deviceList == null) {
            var page1 = {limit: 5, num: 1, pageCount: 0, count: 0};
            callback(err, page1, null);
        } else {
            var ids = getAllDeviceIds(deviceList);//获取设备Id的集合
            queryObj.deviceId = {$in: ids};
            var search = queryObj;
            var page = {limit: 5, num: 1};//给出分页的初始值
            var p = req.body.num;
            if (p) {
                page['num'] = p < 1 ? 1 : p;
            }

            //查询条件与需要的字段
            var model = {
                search: search,
                columns: '_id wechatFansId orderNo deviceId allowance amount status useTime endTime execTime reservationLockTime useLockTime openid',
                page: page
            };

            //分页查询订单数据
            new Order().findPagination(model, function (err, pageCount, list, count) {
                page['pageCount'] = pageCount;
                page['size'] = list.length;
                page['numberOf'] = pageCount > 5 ? 5 : pageCount;
                page['count'] = count;
                callback('', page, list);
            });
        }
    });
}

/**
 * 获取集合所有设备的id
 * @param devices
 * @returns {Array}
 */
function getAllDeviceIds(devices) {
    var ids = [];
    for (i in devices) {
        ids = ids.concat(devices[i]._id);
    }
    return ids;
}

/**
 * 加盟商自己查看订单记录
 * @param req
 * @param res
 */
exports.orderDetail = function (req, res) {
    var orderId = req.param("orderId");
    Order.findOne({_id: orderId}).populate('wechatFansId deviceId').exec(function (err, order) {
        if (err) {
            console.log(err);
        } else {
            res.render('order/orderDetail', {
                order: order
            })
        }
    });
};

/**
 * 根据登陆用户获取加盟商
 * @param req
 * @param res
 * @param callback
 */
function franchiseeByUserId(req, res, callback) {

    var id = req.user._id;
    Franchisee.findOne({_id: id}, function (err, fran) {
        callback(err, fran);
    })
}
/**
 * 根据加盟商获取洗衣店
 * @param req
 * @param res
 * @param callback
 */
function storeByfranchiseeId(req, res, callback) {
    franchiseeByUserId(req, res, function (err, fran) {
        if (fran != null) {
            Store.find({franchiseeId: fran._id}, function (err, store) {
                if (store == null) {
                    callback("加盟商用户没有洗衣店", store);
                } else {
                    callback('', store);
                }
            })
        } else {
            callback("您不是加盟商用户", null);
        }
    });

}
/**
 * 根据加盟商的洗衣店获取设备
 * @param req
 * @param res
 * @param callback
 */
function deviceByStoreId(req, res, callback) {
    storeByfranchiseeId(req, res, function (err, stores) {
        var deviceList = [];

        if (stores == null || stores.length == 0) {
            callback(err, null);
        } else {
            var fn = function (stores) {
                var pop = stores.pop();
                getDevices(pop._id, function (err, devices) {
                    if (stores.length > 0) {
                        deviceList = arrayToArray(deviceList, devices);
                        fn(stores);
                    } else {
                        deviceList = arrayToArray(deviceList, devices);
                        callback('', deviceList);
                    }
                });
            };
            fn(stores);
        }
    });

}
/**
 * 将第二个数组的元素放到第一个数组中
 * @param arr1 数组1
 * @param arr2 数组2
 */
function arrayToArray(arr1, arr2) {
    for (i in arr2) {
        arr1 = arr1.concat(arr2[i]);
    }
    return arr1;
}

/**
 * 获取设备
 * @param storeId 洗衣店ID
 * @param callback 回调函数
 */
function getDevices(storeId, callback) {
    Device.find({storeId: storeId}, function (err, devices) {
        if (err) {
            console.log(err);
        } else {
            callback(err, devices);
        }
    });
}

exports.cancelOrder = function (req, res) {
    var orderId = req.body.ids;
    console.log("orderId", orderId);
    Order.findOne({_id: orderId}, function (err, order) {
        var deviceId = order.deviceId;
        console.log("deviceId", deviceId);
        Device.findOne({_id: deviceId}, function (err, devices) {
            Order.update({'_id': orderId}, {
                status: '20',
                useTime: null,
                execTime: null,
                useLockTime: new Date()
            }, {multi: false, upsert: false}, function (err, docs) {
                if (err) {
                    console.log(err);
                } else {
                    Device.update({'_id': deviceId}, {
                        status: '1',
                        useTime: null,
                        endData: null,
                        execTime: null
                    }, {multi: false, upsert: false}, function (err, docs) {
                        if (err) {
                            console.log(err);
                        } else {
                            res.redirect('/vendor/orderRecord?&today=today')
                        }
                    });
                }
            });
        });
    });
};

exports.updateOrder = function(req, res) {

  Order.find({}).populate('storeId').exec(function(err, orders) {
    var i = 0;
    orders.forEach(function(item) {
      i++;
      console.log(i);
      if (item.storeId) {
        item.franchiseeId = item.storeId.franchiseeId;
        item.save();
      } else {
        item.remove();
      }
    })
  });

};
