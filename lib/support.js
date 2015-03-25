var qs    = require('qs'),
    http  = require('http'),
    https = require('https');

// Support
var Support = function (options) {
  options = options || {};

  this.protocol = options.protocol || 'https';
  this.host = options.host || 'support.zoho.com';
  this.port = options.port || (this.protocol === 'https' ? 443 : 80);

  if (!options.authtoken) {
    return console.log('Error: Zoho Support instance requires the parameter `authtoken` to be initialized correctly');
  }

  if (!options.portal) {
    return console.log('Error: Zoho Support instance requires the parameter `portal` to be initialized correctly');
  }

  if (!options.department) {
    return console.log('Error: Zoho Support instance requires the parameter `department` to be initialized correctly');
  }

  this.authtoken = options.authtoken;
  this.portal = options.portal;
  this.department = options.department;
};

// Create Record
Support.prototype.createRecord = function (module, params, callback) {
  params = params || {};

  if (typeof params !== 'object' || Object.keys(params).length === 0) {
    return callback({ message: 'Error: params object required to create record' }, null);
  }

  var records = params instanceof Array ? params : [params];

  var xml = '<requests>';
  records.forEach(function (params, index) {
    xml += '<row no="' + (index + 1) + '">';
    for (var param in params) {
      if (params.hasOwnProperty(param)) {
        xml += '<fl val="' + param + '">' + params[param] + '</fl>';
      }
    }
    xml += '</row>';
  });
  xml += '</requests>';

  this._request('GET', module + '/addrecords', { xml: xml }, callback);
};

// Get Records
Support.prototype.getRecords = function () {};

// Get Record By Id
Support.prototype.getRecordById = function () {};

// Update Record
Support.prototype.updateRecord = function () {};

// Delete Record
Support.prototype.deleteRecord = function (module, id, callback) {
  if (typeof id === 'object' || typeof id === 'undefined') {
    return callback({ message: 'Error: ID required parameter missing to delete a record' }, null);
  }

  this._request('GET', module + '/deleterecords', { id: id }, callback);
};

/* Private functions */

// Request
Support.prototype._request = function (method, endpoint, params, callback) {
  params = params || {};

  params.portal = this.portal;
  params.authtoken = this.authtoken;
  params.department = this.department;

  var options = {
    host: this.host,
    port: this.port,
    path: '/api/json/' + endpoint + '?' + qs.stringify(params),
    method: method,
    headers: {
      'Content-Length': JSON.stringify(params).length
    }
  };

  var protocol = this.protocol === 'https' ? https : http;

  var req = protocol.request(options, function (res) {
    var data = '';
    res.setEncoding('utf8');
    res.on('data', function (chunk) { data += chunk; });
    res.on('end', function () {
      if (data) {
        data = JSON.parse(data);

        if (data.response.error) {
          return callback({
            code: data.response.error.code,
            message: data.response.error.message
          }, null);
        } else {
          return callback(null, {
            code: data.response.result.responsecode,
            data: data.response.result.responsedata
          });
        }
      }

      return callback({ message: 'No content data' }, null);
    });
  });

  req.on('error', function (e) {
    return callback(e, null);
  });

  req.write(JSON.stringify(params));
  req.end();
};


module.exports = Support;