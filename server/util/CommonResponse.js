function CommonResponse(status,description,data){
    this.status = status,
    this.description = description,
    this.data = data
}

CommonResponse.prototype.setStatus = function(status){
    this.status = status;
}

CommonResponse.prototype.setDescription = function(description){
    this.description = description;
}

CommonResponse.prototype.setData = function(data){
    this.data = data;
}

module.exports = CommonResponse;