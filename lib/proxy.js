/**
 * Created by nuintun on 2014/4/2.
 */

'use strict';

require('colors');

var fs = require('fs'),
  path = require('path'),
  config = require('./config'),
  iconv = require('iconv-lite'),
  spawn = require('child_process').spawn,
  adodb = path.join(__dirname, 'adodb.js'),
  sysroot = process.env['systemroot'] || process.env['windir'],
  x64 = fs.existsSync(path.join(sysroot, 'SysWOW64')),
  cscript = path.join(sysroot, x64 ? 'SysWOW64' : 'System32', 'cscript.exe');

// Noop function
function noop(){}

// Is function
function isFunction(func){
  return Object.prototype.toString.call(func) === '[object Function]';
}

// Is string
function isString(string){
  return Object.prototype.toString.call(string) === '[object String]';
}

// Exports exec method
exports.exec = function (method, params, done, fail, encoding){
  var stdio;

  // Format callback function
  done = isFunction(done) ? done : noop;
  fail = isFunction(fail) ? fail : noop;
  // Set encoding
  encoding = isString(encoding) && encoding.trim() ? encoding : config.encoding;

  config.debug && console.log('Exec:'.green.bold, method.cyan.bold);
  config.debug && console.log('Params:'.green.bold, JSON.stringify(params, null, '  ').cyan.bold);

  // Params encode to base64
  params = (new Buffer(JSON.stringify(params))).toString('base64');
  // Exec commond
  stdio = spawn(cscript, [adodb, '//E:JScript', '//Nologo', method, params]);

  // Stdout
  stdio.stdout.on('data', function (data){
    data = iconv.decode(data, encoding);

    try {
      data = JSON.parse(data);
    } catch (e) {
      stdio.stderr.emit('data', data);
      return;
    }

    data.valid ? done(data) : stdio.stderr.emit('data', data.message);
  });

  // Stderr
  stdio.stderr.on('data', function (data){
    data = {
      valid: false,
      message: (data instanceof Buffer ? iconv.decode(data, encoding) : data).replace(/\r\n/img, '')
    };

    config.debug && console.log('Error:'.red.bold, JSON.stringify(data, null, ' ').cyan.bold);
    fail(data);
  });

  // Exec error
  stdio.on('error', function (error){
    console.log('Exec Error:'.red.bold, JSON.stringify(error, null, '  ').cyan.bold);
  });
};
