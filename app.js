'use strict';
const request = require('request');
var schedule = require('node-schedule');
var SqliteDB = require('./sqlite.js').SqliteDB;
var proc = require('child_process');
var createTableSql = "create table if not exists lottery(issueNo INTEGER primary key,time TEXT, z1 INTEGER, z2 INTEGER, z3 INTEGER, sum INTEGER,size INTEGER,single INTEGER);";
var insertTileSql = "insert OR IGNORE into lottery(issueNo,time,z1, z2, z3, sum, size, single) values(?, ?, ?,?, ?, ?, ?,?)";

function insertData(data)
{
    sqliteDB.insertData(insertTileSql, data);
}

var lotteryOpts = {
    url: 'http://m.okw999.com/v1/lottery/openResult?lotteryCode=1407&dataNum=20&',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36',
        'Referer': 'http://m.okw999.com/lottery/K3/1407'
    },
    form: {
        'DataNum': 20,
        'LotteryCode': 1407
    }
}

function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
        var info = JSON.parse(body);
        parseData(info.data);
        commitToGit();
    }
}

function commitToGit(){
    var cmd = "git pull && git add ./lottery.db && git commit -m \"" + Date() +"\" && git push";
    proc.exec(cmd,function(err,stdout,stderr){
        if(err) {
            console.log('git error:'+stderr);
        } else {
            console.log(stdout);
        }
    });
}

function parseData(data)
{
    var result = [];
    for(var i = 0; i < 20;i++)
    {
        var l = data[i];
        var item = [];
        item.push(l.issue);
        item.push(l.openTime);
        var sum = 0;
        var zz = l.openNumber.split(',');
        for(var j = 0; j < 3;j++)
        {
            sum += parseInt(zz[j]);
            item.push(zz[j]);
        }
        item.push(sum);
        sum >= 11?item.push(1):item.push(0);
        sum % 2 == 0 ? item.push(1):item.push(0);
        result.push(item);
    }
    insertData(result);
}
var file = "lottery.db";
var sqliteDB = new SqliteDB(file);
sqliteDB.createTable(createTableSql);

function scheduleCronstyle(){
    schedule.scheduleJob('1 */15 * * * *', function(){
        request(lotteryOpts, callback);
        console.log('scheduleCronstyle:' + new Date());
    }); 
}

scheduleCronstyle();