var csv = require("fast-csv");
var mongoose = require('mongoose');
var Order = mongoose.model('Order');
var moment = require('moment');

var PART = 1000;


var Order = mongoose.model('Order');


/**
 * 导出订单
 * @param req
 * @param res
 */
var exportOrder = function(query, res) {
  var dateStart = Date.now();

  var headers = [ //导出文件的标题
    '序号',
    '加盟商',
    '订单号',
    '商户订单号',
    '场所（学校/酒店）',
    '洗衣房名称',
    '设备类型',
    '设备编号',
    '微信用户',
    '订单状态',
    '程序',
    '开始时间',
    '结束时间',
    '实际支付金额',
    '基准价',
    '分成比例',
    '退款金额'
  ];
  var name = "order" + moment().format("YYYYMMDDhhmmss") + ".csv";
  console.log('exportOrder', name);

  var csvStream = csv
    .format({
      headers: true
    });

  res.setHeader('Content-disposition', 'attachment; filename=' + name);
  res.setHeader('Content-type', 'text/csv');
  csvStream.pipe(res);
  csvStream.write(headers);
  var i = 0;

  var writePart = function(skip, count) {
    var read = (count - skip) > PART ? PART : (count - skip);
    console.log(name, 'skip', skip, 'count', count, 'read', read, 'now', (Date.now() - dateStart) / 1000);

    Order.find(query)
      .skip(skip)
      .limit(read)
      .populate([ //这里将所需信的关联对象查出
        {
          "path": "wechatFansId",
          "select": "nickname"
        }, {
          "path": "deviceId",
          "select": "name no"
        }, {
          "path": "storeId",
          "select": "name ratio"
        }, {
          "path": "commandId",
          "select": "type"
        }, {
          "path": "franchiseeId",
          "select": "fullname"
        }
      ]).exec(function(err, orders) {
        var realRead = orders.length;
        orders.forEach(function(pop) {
          i++;
          csvStream.write(tranform(pop, i));
        });
        if ((skip + realRead) >= count) {
          csvStream.end();
          var dateEnd = Date.now();
          console.log(name, "DONE!", 'dateStart', dateStart, 'dateEnd', dateEnd, 'cost', (dateEnd - dateStart) / 1000);
        } else {
          writePart(skip + realRead, count);
        }
      });

  };
  Order.count(query)
    .exec(function(err, count) {
      console.log(name, 'count', count);
      writePart(0, count);
    });
};

function tranform(pop, i) {
  var item;
  var income = pop.payment - pop.payment * (pop.storeId == null || pop.storeId.ratio == undefined ? 1 : pop.storeId.ratio / 100); //计算实际收入
  var useTime = pop.useTime == undefined ? "无" : moment(pop.useTime).format("YYYY/MM/DD HH:mm:ss");
  var endTime = pop.endTime == undefined ? "无" : moment(pop.endTime).format("YYYY/MM/DD HH:mm:ss");
  var status = getStratuBycode(pop.status);
  var refund = pop.status == '60' ? pop.allowance : 0;
  item = [i, pop.franchiseeId == null ? "" : pop.franchiseeId.fullname //加盟商
    , pop.orderNo //订单号
    , pop.wxOrderNo ? pop.wxOrderNo : "" //商户订单号
    , '学校', pop.storeId == null ? "" : pop.storeId.name //洗衣房
    , pop.deviceId == null ? "" : pop.deviceId.name //设备名称
    , pop.deviceId == null ? "" : pop.deviceId.no //设备编号
    , pop.wechatFansId == null ? "" : pop.wechatFansId.nickname //微信用户名
    , status, pop.commandId == null ? "" : pop.commandId.type //订单命令
    , useTime, endTime, pop.payment, pop.amount, pop.storeId == null || pop.storeId.ratio == undefined ? "100%" : pop.storeId.ratio + '%' //分成比例的计算结果
    , refund
  ];
  return item;
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
module.exports = exportOrder;
