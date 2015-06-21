var q = require('q')
    , fs = require('fs')
    , path = require('path')
    , extend = require('node.extend')
    , request = require('request')

var liveAPI = 'https://apis.live.net/v5.0'
    , onedriveAPI = 'https://api.onedrive.com/v1.0';

function resolveFolderIdentifier(identifier) {
    if (identifier) {
        return 'items/' + identifier;
    }
    
    return 'root';
}

var Client = function () {
    this._onedriveClientPromise = null;
};

Client.prototype.accountInfo = function (options) {
    var self = this;
    return self._getClient().then(function (client) {
        var deferred = q.defer();
        client.get({
                url: liveAPI + '/me'
            },
            function (err, r, body) {
                if (err) return deferred.reject(err);
                return deferred.resolve(JSON.parse(body));
            });

        return deferred.promise;
    });
};

Client.prototype.checkQuota = function (options) {
    var self = this;
    return self._getClient().then(function (client) {
        var deferred = q.defer();
        client.get({
                url: onedriveAPI + '/drive'
            },
            function (err, r, body) {
                if (err) return deferred.reject(err);
                return deferred.resolve(JSON.parse(body));
            });

        return deferred.promise;
    });
};

Client.prototype.createFile = function (fileName, parentIdentifier, content_buffer, options) {
    var self = this;
    parentIdentifier = resolveFolderIdentifier(parentIdentifier);
    
    return self._getClient().then(function (client) {
        var deferred = q.defer();
        client.put(
            {
                url: onedriveAPI + '/drive/items/' + parentIdentifier + ':/' + fileName + '/content',
                body: content_buffer
            },
            function (err, r, body) {
                err = errorHandler(r, body, err);
                if (err) return deferred.reject(err);
                return deferred.resolve(JSON.parse(body));
            });
        return deferred.promise;
    });
};

Client.prototype.deleteFile = Client.prototype.deleteFolder = function (identifier) {
    var self = this;
    return self._getClient().then(function (client) {
        var deferred = q.defer();
        client.del(
            {
                url: onedriveAPI + '/drive/items/' + identifier
            },
            function (err, r, body) {
                err = errorHandler(r, body, err);
                if (err) return deferred.reject(err);
                return deferred.resolve({});
            }
        );
        return deferred.promise;
    });
};

Client.prototype.downloadFile = function (identifier) {
    var self = this;
    return self._getClient().then(function (client) {
        var deferred = q.defer();
        client.get(
            {
                url: onedriveAPI + '/drive/items/' + identifier + '/content',
                encoding: null /*forces the content to be sent back in binary form, body will always be a buffer.*/
            },
            function (err, r, body) {
                err = errorHandler(r, body, err);
                if (err) return deferred.reject(err);
                return deferred.resolve({ "headers": r.headers, "data": body});
            }
        );
        return deferred.promise;
    });
};

Client.prototype.getFileInformation = Client.prototype.getFolderInformation = function (identifier) {
    var self = this;
    identifier = resolveFolderIdentifier(identifier);
    
    return self._getClient().then(function (client) {
        var deferred = q.defer();
        client.get(
            {
                url: onedriveAPI + '/drive/' + identifier
            },
            function (err, r, body) {
                err = errorHandler(r, body, err);
                if (err) return deferred.reject(err);
                return deferred.resolve(JSON.parse(body));
            }
        );
        return deferred.promise;
    });
};

Client.prototype.createFolder = function (folderName, parentIdentifier, options) {
    var self = this;
    parentIdentifier = resolveFolderIdentifier(parentIdentifier);
    
    return self._getClient().then(function (client) {
        var deferred = q.defer();
        client.post(
            {
                headers: {
                    'Authorization': 'Bearer ' + self.credentials.access_token,
                    'content-type': 'application/json'
                },
                url: onedriveAPI + '/drive/' + parentIdentifier + '/children',
                body: JSON.stringify({
                    name: folderName,
                    folder: {}
                })
            },
            function (err, r, body) {
                err = errorHandler(r, body, err);
                if (err) return deferred.reject(err);
                return deferred.resolve(JSON.parse(body));
            }
        );
        return deferred.promise;
    });
};

Client.prototype.retrieveFolderItems = function (identifier,options) {
    identifier = resolveFolderIdentifier(identifier);
    return this._getClient().then(function (client) {
        var deferred = q.defer();
        client.get(
            {
                url: onedriveAPI + '/drive/' + identifier + '/children'
            },
            function (err, r, body) {
                err = errorHandler(r, body, err);
                if (err) return deferred.reject(err);
                return deferred.resolve(JSON.parse(body));
            }
        );
        return deferred.promise;
    });
};

///////////////////////////////////////////////////////////////////////////////
// Helper Methods
Client.prototype._getClient = function(){
    if (this._onedriveClientPromise) return this._onedriveClientPromise;
    var options = {
        headers: {
            'Authorization': 'Bearer ' + this.credentials.access_token
        }
    };
    this._onedriveClientPromise = q.when(request.defaults(options));
    return this._onedriveClientPromise;
};

//custom error detection method.
function errorHandler(response, body, err){
    if(err) return err;
    if(response.statusCode != 200 && body.error){

        return body.error;
        //if(response.statusCode == 401 && response.body.error) return  new FFTokenRejected(err_message);
        //if(response.statusCode == 403) return new FFAdditionalAuthorizationRequired(err_message);
    }

    return false;
}
module.exports = Client;