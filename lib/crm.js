var qs    = require('qs'),
    http  = require('http'),
    https = require('https');
var _ = require('lodash');

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

  if (typeof params !== 'object' || (!params.id && !params.idlist)) {
    return callback({ message: 'Error: ID or ID list is required parameter missing to get record' }, null);
  }

  module = module.charAt(0).toUpperCase() + module.slice(1);

  this._request('GET', module + '/getRecordById', params, callback);
};

// Create Record
CRM.prototype.createRecord = function (module, jsonData, options, callback) {
  jsonData = jsonData || {};
  var opts = _.cloneDeep(options || {});

  if (typeof jsonData !== 'object' || Object.keys(jsonData).length === 0) {
    return callback({ message: 'Error: params object required to create record' }, null);
  }

  module = module.charAt(0).toUpperCase() + module.slice(1);

  opts.xmlData = this._build(module, jsonData);
  this._request('GET', module + '/insertRecords', opts, callback);
};

// Update Record
CRM.prototype.updateRecord = function (module, id, jsonData, options, callback) {
  jsonData = jsonData || {};
  var opts = _.cloneDeep(options || {});

  if (typeof jsonData !== 'object' || Object.keys(jsonData).length === 0) {
    return callback({ message: 'Error: params object required to update record' }, null);
  }

  if (typeof id === 'object' || typeof id === 'undefined') {
    return callback({ message: 'Error: ID required parameter missing to update a record' }, null);
  }

  module = module.charAt(0).toUpperCase() + module.slice(1);

  opts.id = id;
  opts.xmlData = this._build(module, jsonData);

  this._request('POST', module + '/updateRecords', opts, callback);
};

// Update Multiple Records
CRM.prototype.updateRecords = function (module, jsonData, options, callback) {
  jsonData = jsonData || {};
  var opts = _.cloneDeep(options || {});

  if (typeof jsonData !== 'object' || Object.keys(jsonData).length === 0) {
    return callback({ message: 'Error: params object required to update record' }, null);
  }

  module = module.charAt(0).toUpperCase() + module.slice(1);
  opts.xmlData = this._build(module, jsonData);
  opts.version = 4;

  this._request('POST', module + '/updateRecords', opts, callback);
};

// Delete Record
CRM.prototype.deleteRecord = function (module, id, options, callback) {
  var opts = _.cloneDeep(options || {});

  if (typeof id === 'object' || typeof id === 'undefined') {
    return callback({ message: 'Error: ID required parameter missing to delete a record' }, null);
  }

  module = module.charAt(0).toUpperCase() + module.slice(1);

  opts.id = id;
  this._request('GET', module + '/deleteRecords', opts, callback);
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
        try {
          data = JSON.parse(data);
        } catch (err) {
          return callback({
            message: 'Abnormal response ' + data
          })
        }

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
