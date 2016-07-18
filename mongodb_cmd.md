方法如下：
创建数据库
use tt
这样就创建了一个数据库,如果什么都不操作离开的话,这个库就会被系统删除.所以还要执行下面的命令:
db.usr.insert({'name':'tompig'});
db.usr.insert({'name':'tompig1','id':1});
随便整了2个表,这个无所谓的,反正要导入表的话就删除掉这2个就可以了,目前只是想让数据库保持住.
然后使用命令查看是否有保存tt这个数据库:
show dbs
3.配置用户
use tt
db.addUser('mongodb','123456');
mongodb是用户名,123456是密码.
好了,这样一个数据库和对这个数据库配置用户就完成了.
mongodb常用命令:
1、Help查看命令提示
help
db.help();
db.yourColl.help();
db.youColl.find().help();
rs.help();
2、切换/创建数据库
use yourDB; 当创建一个集合(table)的时候会自动创建当前数据库
3、查询所有数据库
show dbs;
4、删除当前使用数据库
db.dropDatabase();
5、从指定主机上克隆数据库
db.cloneDatabase(“127.0.0.1”); 将指定机器上的数据库的数据克隆到当前数据库
6、从指定的机器上复制指定数据库数据到某个数据库
db.copyDatabase("mydb", "temp", "127.0.0.1");将本机的mydb的数据复制到temp数据库中
7、修复当前数据库
db.repairDatabase();
8、查看当前使用的数据库
db.getName();
db; db和getName方法是一样的效果，都可以查询当前使用的数据库
9、显示当前db状态
db.stats();
10、当前db版本
db.version();
11、查看当前db的链接机器地址
db.getMongo();
Collection聚集集合
1、创建一个聚集集合（table）
db.createCollection(“collName”, {size: 20, capped: 5, max: 100});
2、得到指定名称的聚集集合（table）
db.getCollection("account");
3、得到当前db的所有聚集集合
db.getCollectionNames();
4、显示当前db所有聚集索引的状态
db.printCollectionStats();
用户相关
1、添加一个用户
db.addUser("name");
db.addUser("userName", "pwd123", true); 添加用户、设置密码、是否只读
2、数据库认证、安全模式
db.auth("userName", "123123");
3、显示当前所有用户
show users;
4、删除用户
db.removeUser("userName");
其他
1、查询之前的错误信息
db.getPrevError();
2、清除错误记录
db.resetError();
