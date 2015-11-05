var qs    = require('qs'),
    http  = require('http'),
    https = require('https');

// CRM
var CRM = function (options) {
  options = options || {};

  this.protocol = options.protocol || 'https';
  this.host = options.host || 'crm.zoho.com';
  this.port = options.port || (this.protocol === 'https' ? 443 : 80);

  if (!options.authtoken) {
    return console.log('Error: Zoho CRM instance requires the parameter `authtoken` to be initialized correctly');
  }

  this.authtoken = options.authtoken;
  this.scope = options.scope || 'crmapi';
};

// Get Record
CRM.prototype.getRecords = function (module, params, callback) {
  params = params || {};

  module = module.charAt(0).toUpperCase() + module.slice(1);

  var endpoint = module + '/getRecords';

  if (typeof params === 'function') {
    this._request('GET', endpoint, {}, params);
  } else {
    this._request('GET', endpoint, params, callback);
  }
};

// Get Record By Id
CRM.prototype.getRecordById = function (module, params, callback) {
  params = params || {};

  if (typeof params !== 'object' || !params.id) {
    return callback({ message: 'Error: ID required parameter missing to get record' }, null);
  }

  module = module.charAt(0).toUpperCase() + module.slice(1);

  this._request('GET', module + '/getRecordById', params, callback);
};

// Create Record
CRM.prototype.createRecord = function (module, params, callback) {
  params = params || {};

  if (typeof params !== 'object' || Object.keys(params).length === 0) {
    return callback({ message: 'Error: params object required to create record' }, null);
  }

  module = module.charAt(0).toUpperCase() + module.slice(1);
  var xml = this._build(module, params);

  this._request('GET', module + '/insertRecords', { xmlData: xml }, callback);
};

// Update Record
CRM.prototype.updateRecord = function (module, id, params, callback) {
  params = params || {};

  if (typeof params !== 'object' || Object.keys(params).length === 0) {
    return callback({ message: 'Error: params object required to update record' }, null);
  }

  if (typeof id === 'object' || typeof id === 'undefined') {
    return callback({ message: 'Error: ID required parameter missing to update a record' }, null);
  }

  module = module.charAt(0).toUpperCase() + module.slice(1);
  var xml = this._build(module, params);

  this._request('POST', module + '/updateRecords', { id: id, xmlData: xml }, callback);
};

// Update Multiple Records
CRM.prototype.updateRecords = function (module, params, callback) {
  params = params || {};

  if (typeof params !== 'object' || Object.keys(params).length === 0) {
    return callback({ message: 'Error: params object required to update record' }, null);
  }

  module = module.charAt(0).toUpperCase() + module.slice(1);
  var xml = this._build(module, params);

  this._request('POST', module + '/updateRecords', { xmlData: xml, version: 4 }, callback);
};

// Delete Record
CRM.prototype.deleteRecord = function (module, id, callback) {
  if (typeof id === 'object' || typeof id === 'undefined') {
    return callback({ message: 'Error: ID required parameter missing to delete a record' }, null);
  }

  module = module.charAt(0).toUpperCase() + module.slice(1);

  this._request('GET', module + '/deleteRecords', { id: id }, callback);
};


/* Private functions */

// Build XML data
CRM.prototype._build = function (module, data) {
  var records = data instanceof Array ? data : [data];

  var xml = '<' + module + '>';
  records.forEach(function (params, index) {
    xml += '<row no="' + (index + 1) + '">';
    for (var param in params) {
      if (params.hasOwnProperty(param)) {
        xml += '<FL val="' + param + '"><![CDATA[' + params[param] + ']]></FL>';
      }
    }
    xml += '</row>';
  });
  xml += '</' + module + '>';

  return xml;
};

// Request
CRM.prototype._request = function (method, endpoint, params, callback) {
  params = params || {};

  params.authtoken = this.authtoken;
  params.scope = this.scope;

  var options = {
    host: this.host,
    port: this.port,
    path: '/crm/private/json/' + endpoint + '?' + qs.stringify(params),
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
        } else if (data.response.nodata) {
          return callback({
            code: data.response.nodata.code,
            message: data.response.nodata.message
          }, null);
        } else {
          var object = {};

          object.code = data.response.result.code || 0;
          object.data = data.response.result.recorddetail;
          object.data = object.data || data.response.result;

          return callback(null, object);
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

module.exports = CRM;
