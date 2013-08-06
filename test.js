(function(){
  var fs = require("fs");
  var _ = require("underscore");
  var Generator = require("./generator");
  fs.readFile("./schemas.json", function(err, data){
    if(err){
      throw err;
    }
    _.each(JSON.parse(data), function(category){
      _.each(category, function(schema, name){
        console.log(name);
        console.log(JSON.stringify((new Generator(schema)).generate()));
      });
    });
  });
}());
