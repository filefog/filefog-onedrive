var path = require('path');

function transformItemInfo(response) {
    var transform = {
        is_file: response.file !== undefined,
        is_folder: response.folder !== undefined,
        
        etag: response.eTag,
        identifier: response.id,
        parent_identifier: response.parentReference.id,
        created_date: new Date(response.createdDateTime),
        modified_date: new Date(response.lastModifiedDateTime),
        name: response.name,
        description: '',
        
        _raw: response
    };
    
    if (response.file !== undefined) {
        transform.file_size = response.size;
        transform.mimetype = response.file.mimeType;
        
        if (response.file.hashes && typeof response.file.hashes === 'object') {
            transform.checksum = response.file.hashes.sha1Hash || null;
        }
    }
    
    return transform;
}

exports.createFile = exports.getFileInformation =
    exports.createFolder = exports.getFolderInformation = transformItemInfo;

exports.accountInfo = function(account_response){
    return {
        name: account_response.name,
        email: '',
        avatar_url: '',
        created_date: null,
        modified_date: null,
        id: account_response.id,
        
        _raw: account_response
    };
};

exports.checkQuota = function (quota_response){
    return {
        total_bytes: quota_response.quota.total,
        used_bytes: quota_response.quota.used + quota_response.quota.deleted,
        limits: {},
        
        _raw: quota_response
    };
};

exports.downloadFile = function(download_response){
    return {
        headers: download_response.headers,
        data: download_response.data,
        
        _raw: download_response
    };
};

exports.deleteFile = exports.deleteFolder = function(deletion_response){
    return {
        success: true,
        _raw: deletion_response
    };
};

exports.retrieveFolderItems = function(items_response){
    return {
        total_items: items_response.value.length,
        content: items_response.value.map(transformItemInfo)
    };
};

///////////////////////////////////////////////////////////////////////////////
// OAuth transforms

exports.oAuthGetAccessToken = exports.oAuthRefreshAccessToken = function(token_response){
    var expirationTimestamp = +new Date() + 1000 * token_response.expires_in;
    
    return {
        access_token: token_response.access_token,
        refresh_token: token_response.refresh_token,
        expires_on: (new Date(expirationTimestamp)).toISOString()
    };
};
