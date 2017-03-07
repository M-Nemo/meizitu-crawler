var express = require('express');
var request = require("request");
var superagent = require('superagent');
var cheerio = require('cheerio');
var fs = require("fs");
var async = require('async');

var app = express();


var baseUrl = 'http://www.mzitu.com/page/'//目标网址
var dir = './images/';//本地存储目录

var albumUrls = new Array();//存储每一相册的URL
var imageUrls = new Array();//存储图片页的URL


function getpageUrls(){
    var pageUrls = new Array();
    for (var i = 1; i <= 100 ; i++) {
        pageUrls.push(baseUrl+i);
    }
    return pageUrls;
}

function getalbumUrls(){
    var urls = getpageUrls();
    async.mapLimit(urls,5,function(url,callback){
        fetchUrl_album(url,callback);
    },function(err,result){
        var reg = /[\d\.]+\,([\d\.]+)/g;
        var result = result.join(",").replace(reg, "$1").split(",");
        for (var i = 0; i < result.length; i+=2) {
            albumUrls.push(result[i])
        }
        getimageurls(albumUrls);
    })
}
var concurrencyCount = 0;
function fetchUrl_album(url,callback){
    concurrencyCount++;
    console.log('现在的并发数是'+concurrencyCount+'，正在抓取的是'+ url);
    superagent.get(url)
        .end(function(err,sres){
            if (err) {
                console.log(err);
                return false;
            }
            var u = new Array();//存储每一相册的URL
            var $ = cheerio.load(sres.text);
            $('#pins a').each(function(){
                u.push($(this).attr('href'));
            })
            callback(null,u);
            concurrencyCount--;
        })
}

function getimageurls(albumUrls){
    async.mapLimit(albumUrls,5,function(url,callback){
        fetchUrl_image(url,callback);
    },function(err,result){
        var reg = /[\d\.]+\,([\d\.]+)/g;
        var result = result.join(",").replace(reg, "$1").split(",");
        console.log(result);
        downloadImage(result);
    })
}

function fetchUrl_image(url,callback){
    concurrencyCount++;
    console.log('现在的并发数是'+concurrencyCount+'，正在抓取的是'+ url);
    superagent.get(url)
        .end(function(err,sres){
            if (err) {
                return next(err);
            }
            var image = new Array();
            var $ = cheerio.load(sres.text);
            var len = parseInt($(".pagenavi a:nth-child(7)>span").text());
            for (var i = 1; i <= len; i++) {
                image.push(url+'/'+i)
            }
            callback(null,image);
            concurrencyCount--;
        })
}

function downloadImage(imageUrls){
    async.mapLimit(albumUrls,5,function(url,callback){
        fetchUrl_download(url,callback);
    },function(err,result){
        console.log(result);
    })
}
function fetchUrl_download(url,callback){
    concurrencyCount++;
    console.log('现在的并发数是'+concurrencyCount+'，正在抓取的是'+ url);
    superagent.get(url)
        .end(function(err,sres){
            if (err) {
                return next(err);
            }
            var $ = cheerio.load(sres.text);
            var src = $('.main-image img').attr("src");
            filename = src.replace("http://i.meizitu.net/","");
            filename = filename.replace("/","");
            filename = filename.replace("/","");
            console.log('正在下载' + src);
            download(src, dir, filename);
            console.log('下载完成');
            callback(null,filename);
            concurrencyCount--;
        })
}
var download = function(url, dir, filename){
    request.head(url, function(err, res, body){
        request(url).pipe(fs.createWriteStream(dir + "/" + filename));
    });
}
getalbumUrls();