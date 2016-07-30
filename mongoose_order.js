/**
 * Created by qqqxxll on 201qxl6/6/12.
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;
var moment = require('moment');

/**
 * 订单记录
 * @type {Schema}
 */
var OrderSchema = new Schema({
    id: ObjectId
    , wechatFansId: {type: ObjectId, ref: 'WechatFans', require: true}//微信用户
    , orderNo: {type: String, trim: true, required: true}//交易编号，系统自动生成
    , storeId: {type: ObjectId, ref: 'Store', require: true}//洗衣房ID
    , deviceId: {type: ObjectId, ref: 'Device', require: true}//设备ID
    , allowance: {type: Number, required: true}//支付金额
    , amount: {type: Number, required: true}//金额
    , status: {type: String, trim: true, required: true}//业务状态 10:预约 20：已支付 30:使用中 40:完成 50:取消
    , createAt: {type: Date, default: Date.now}//创建时间
    , useTime: {type: Date}//开始使用时间
    , endTime: {type: Date}//使用结束时间
    , execTime: {type: Number}//预计执行时间(分钟)
    , reservationLockTime: {type: Date}//预约订单下单后，加入付款锁定时间
    , useLockTime: {type: Date}//付款后，加入使用锁定时间
    , openid: {type: String}//粉丝用户
    , wxOrderNo: {type: String}//粉丝用户
    , commandId: {type: ObjectId, ref: 'DevicePrice'}//关联设备操作ID    //test修改
    , payment: {type: Number, required: true, default: 0}//已支付金额
    , franchiseeId: {type: ObjectId, ref: 'Franchisee'}//所属加盟商
});

var status = [{"code": '10', "name": '预约'}
    , {"code": '20', "name": '已支付'}
    , {"code": '21', "name": '桶自洁中'}
    , {"code": '22', "name": '桶自洁完成'}
    , {"code": '30', "name": '使用中'}
    , {"code": '40', "name": '完成'}
    , {"code": '50', "name": '撤销'}
    , {"code": '60', "name": '退款'}];

OrderSchema.methods = {
    /**
     * 撤销订单
     * @param orderNo
     * @param callback
     */
    defaultContent: function (id, callback) {
        if (id == null || id === '' || id == 'undefined') {
            throw new Error('订单号不存在');
        }

        var query = {"_id": id, 'status': '10'};
        Order.count(query, function (err, count) {
            if (err) {
                throw new Error('查询异常');
            }
            if (count == 0) {
                throw new Error('单据不存在');
            }
            Order.findOne(query, function (err, obj) {
                if (err) {

                }
                //修改单据状态为撤销
                obj.status = '50';
                obj.save(function (err, obj) {
                    callback(err, obj);
                });
            });
        });
    },
    //获取所有的状态
    getAllStatus: function () {
        return status;
    },
    /**
     * 统计完成订单有多少
     * @param req
     * @param res
     * @param callback
     */
    count: function (req, res, callback) {
        var d = moment(new Date());
        var nowStr = d.format("YYYY/MM/DD 00:00:00");
        var mDate = new Date(nowStr);
        Order.count({'status': '40', "createAt": {$gte: mDate}}, function (err, count) {
            if (err) {
                console.log(err);
            } else {
                callback(count);
            }
        });
    },
    /**
     * 生成订单号
     */
    genOrderNo: function () {
        return 'test001';
    },

    findByDeviceId: function (deviceId, callback) {
        //查使用中的设备的订单记录，一个设备同时只能给一个用户使用
        Order.findOne({'deviceId': deviceId, 'status': '30'}, function (err, result) {
            callback(err, result);
        });
    },

    //分页功能
    findPagination: function (obj, callback) {
        //q:查询条件
        var q = obj.search || {};
        console.log(q);
        //col:数据返回字段
        var col = obj.columns;
        console.log(col);
        //pageNumber:当前是第几页，如果不存在默认为第一页
        var pageNumber = obj.page.num || 1;
        console.log(pageNumber);
        //resultsPerPage:每页多少条记录
        var resultsPerPage = obj.page.limit || 10;
        console.log(resultsPerPage);

        var skipFrom = (pageNumber * resultsPerPage) - resultsPerPage;
        console.log(skipFrom);

        //排序功能默认用插入时间倒叙：sort(‘-create_date’)
        var query = Order.find(q).sort('createAt').skip(skipFrom).limit(resultsPerPage);
        query.populate([  //这里将所需信的关联对象查出
            {"path": "wechatFansId", "select": "nickname"},
            {"path": "deviceId", "select": "name no status"},
            {"path": "storeId", "select": "name franchiseeId ratio"},
            {"path": "franchiseeId", "select": "fullname"}
        ]).exec(function (error, results) {
            if (error) {
                callback(error, null, null, 0);
            } else {
                Order.count(q, function (error, count) {
                    if (error) {
                        callback(error, null, null, 0);
                    } else {
                        var pageCount = Math.ceil(count / resultsPerPage);
                        callback(null, pageCount, results, count);
                    }
                });
            }
        });
    }
};

var Order = mongoose.model('Order', OrderSchema)
