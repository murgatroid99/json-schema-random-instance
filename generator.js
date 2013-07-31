(function(){
  "use strict";
  
  var _ = require("underscore");
  var RandExp = require("randexp")
  var randexp = RandExp.randexp;

  RandExp.prototype.anyRandChar = function(){
    return String.fromCharCode(_.random(48, 90));
  };

  var defaultMax = 20;

  // All of these functions assume that the schema is valid and consistent
  var gen = {};

  // Generates an instance of a schema that has an enum property.
  var gen_enum = function(schema){
    return schema["enum"][_.random(schema["enum"].length)];
  };

  var genFormat = function(format){
    switch(format){
      case "date-time" : return new Date(_.random(100000000000000)).toISOString();
      case "email" : return randexp(/\w+@example\.com/);
      case "hostname" : return randexp(/\w+\.example\.com/);
      case "ipv4" : return _.map([1,2,3,4], function(){return _.random(255).toString();}).join('.');
      case "ipv6" : return randexp(/[abcdef\d]{4}(:[abcdef\d]{4}){7}/);
      case "uri" : return randexp(/\w+\.example\.com\/\w+/);
      default : return randexp(/.*/);
    }
  };

  // Generates an instance of a schema of type array
  gen["array"] = function(schema){
    var maxItems = _.has(schema, "maxItems") ? schema.maxItems : Infinity;
    var minItems = _.has(schema, "minItems") ? schema.minItems : 0;
    var intance = [];
    var amount;
    var items;
    var i;
    var newITem;
    if(_.has(schema, "items")){
      items = schema.items;
      if(_.isArray(items)){
        amount = _.random(minItems+1, Math.min(maxItems, items.length));
        instance = _.map(items.slice(0, amount), function(subschema){
          return generate(subschema);
        });
        while(instance.length < minItems){
          if(_.isObject(schema.additionalItems)){
            newItem = generate(schema.additionalItems);
          } else {
            newItem = null;
          }
          instance = instance.concat(newItem);
        }
      } else {
        // typeof(items) === "object"
        amount = _.random(minItems+1, maxItems === Infinity ? defaultMax : maxItems);
        for(i=0; i<amount; i++){
          instance[i] = generate(items);
        }
      }
      
    }
    return instance;
  };

  gen["boolean"] = function(schema){
    return _.random(1) > 0;
  };

  gen["integer"] = function(schema){
    var min;
    var max;
    var multipleOf = 1;
    if(_.has(schema, "minimum")){
      min = schema.minimum;
    } else {
      min = -defaultMax;
    }
    if(_.has(schema, "maximum")){
      max = schema.maximum;
    } else {
      max = defaultMax;
    }
    if(_.has(schema, "multipleOf")){
      multipleOf = schema.multipleOf;
    }
    return multipleOf * _.random(min, max);
  };

  gen["number"] = function(schema){
    var value = gen["integer"](schema);
    if(_.has(schema, "maximum") && value>=schema.maximum){
      value = schema.maximum - 1;
    }
    return value + Math.random();
  };

  gen["null"] = function(schema){
    return null;
  };

  gen["object"] = function(schema){
    var remaining = _.keys(schema.properties);
    var instance = {};
    var min = _.has(schema, "minProperties") ? schema.minProperties : 0;
    var max = _.has(schema, "maxProperties") ? schema.maxProperties : Infinity;
    if(_.has(schema, "required")){
      _.each(schema.required, function(subschema, name){
        instance[name] = generate(subschema);
      });
      remaining = _.difference(remaining, schema.required);
    }
    
  };

  gen["string"] = function(schema){
    var min;
    var max;
    if(_.has(schema, "pattern")){
      return randexp(schema.pattern);
    }
    min = Math.max(0, schema.minLength);
    if(_.has(schema, "maxLength")){
      max = schema.maxLength;
    } else {
      max = defaultMax;
    }
    return randexp('.{'+min+','+max+'}');
  };

  function choose(schema){
    if(_.has(schema, "oneOf")){
      return mergeSchemas(schema, schema.oneOf[_.random(schema.oneOf.length-1)]);
    } else {
      return schema;
    }
  }

  function generate(schema){
    var choice = choose(schema);
    if(_.isEmpty(choice.type)){
      return null;
    } else {
      return gen[choice.type[_.random(choice.type.length-1)]](schema);
    }
  };

  function deepEqual(A, B){
    if(_.isArray(A) && _.isArray(B)){
      return _.every(_.zip(A, B), function(pair){
        return deepEqual(pair[0], pair[1]);
      });
    } else if(_.isObject(A) && _.isObject(B)){
      return deepEqual(_.pairs(A), _.pairs(B));
    } else {
      return A === B;
    }
  };

  function combineProperties(source, dest, prop, combiner){
    if(_.has(source, prop)){
      if(_.has(dest, prop)){
        return combiner(source[prop], dest[prop]);
      } else {
        return source[prop];
      }
    } else {
      if(_.has(dest, prop)){
        return dest[prop];
      }
    }
  };

  function mergeSchemas(dest, source){
    var result = {};
    result.multipleOf = dest.multipleOf * source.multipleOf;
    result.maximum = Math.min(dest.maximum, source.maximum);
    result.minimum = Math.max(dest.minimum, source.minimum);
    result.maxLength = Math.min(dest.maxLength, source.maxLength);
    result.minLength = Math.max(dest.minLength, source.minLength);
    if(_.has(source, "pattern")){
      if(_.has(dest, "pattern")){
        result.pattern = source.pattern + dest.pattern;
      } else {
        result.pattern = source.pattern;
      }
    } else if(_.has(dest, "pattern")){
      result.pattern = dest.pattern;
    }
    if(_.has(source, "format")){
      if(_.has(dest, "format")){
        if(source.format === dest.format){
          result.format = source.format;
        }
      } else {
        result.format = source.format;
      }
    } else {
      if(_.has(dest, "format")){
        result.format = dest.format;
      }
    }
    result.maxItems = Math.min(dest.maxItems, source.maxItems);
    result.minItems = Math.max(dest.minItems, source.maxItems);
    if(_.has(source, "items")){
      if(_.has(dest, "items")){
        if(_.isArray(source.items)){
          if(_.isArray(dest.items)){
            while(dest.items.length < source.items.length){
              if(_.isObject(dest.additionalItems)){
                dest.items = dest.items.concat(dest.additionalItems);
              } else {
                dest.items = dest.items.concat({});
              }
            }
            while(source.items.length < dest.items.length){
              if(_.isObject(source.additionalItems)){
                source.items = source.items.concat(dest.additionalItems);
              } else {
                source.items = source.items.concat({});
              }
            }
            result.items = _.map(_.zip(source.items, dest.items), function(pair){
              result.items = mergeSchemas(pair[0], pair[1]);
            });
          } else {
            result.items = _.map(source.items, function(item){
              return mergeSchemas(item, dest.items);
            });
          }
        } else {
          if(_.isArray(dest.items)){
            result.items = _.map(dest.items, function(item){
              return mergeSchemas(source.items, item);
            });
          } else {
            result.items = mergeSchemas(dest.items, source.items);
          }
        }
      } else {
        result.items = source.items;
      }
    } else {
      if(_.has(dest, "items")){
        result.items = dest.items;
      }
    }
    if(souce.additionalItems && dest.additionalItems){
      if(_.isObject(source.additionalItems)){
        if(_.isObject(dest.additionalItems)){
          result.additionalItems = mergeSchemas(source.additionalItems, dest.additionalItems);
        } else {
          result.additionalItems = source.additionalItems;
        }
      } else {
        result = source.additionalItems && dest.additionalItems;
      }
    }
    result.uniqueItems = source.uniqueItems || dest.uniqueItems;
    result.properties = {};
    _.each(_.intersection(_.keys(source.properties), _.keys(dest.properties)), function(name){
      result.properties[name] = mergeSchemas(source.properties[name], dest.properties[name]);
    });
    _.each(_.difference(_.keys(source.properties), _.keys(dest.properties)), function(name){
      result.properties[name] = mergeSchemas(source.properties[name], dest.additionalProperties);
    });
    _.each(_.difference(_.keys(dest.properties), _.keys(source.properties)), function(name){
      result.properties[name] = mergeSchemas(dest.properties[name], source.additionalProperties);
    });
    result.maxProperties = Math.min(source.maxProperties, dest.maxProperties);
    result.minProperties = Math.max(source.minProperties, dest.minProperties);
    result.required = _.union(source.required, dest.required);
    if(_.has(source, "enum")){
      if(_.has(dest, "enum")){
        result["enum"] = _.filter(source["enum"], function(item){
          return _.some(dest["enum"], _.partial(deepEqual, item));
        });
      } else {
        result["enum"] = source["enum"];
      }
    } else {
      if(_.has(dest, "enum")){
        result["enum"] = dest["enum"];
      }
    }

    //allOf
    if(_.has(source, "allOf")){
      if(_.has(dest, "allOf")){
        result.allOf = _.union(source.allOf, dest.allOf);
      } else {
        result.allOf = source.allOf;
      }
    } else {
      if(_.has(dest, "allOf")){
        result.allOf = dest.allOf;
      }
    }

    //oneOf
    //naive, doesn't take intersection into account
    if(_.has(source, "oneOf")){
      if(_.has(dest, "oneOf")){
        result.oneOf = _.flatten(_.map(source.oneOf, function(subschema){
          return _.map(dest.oneOf, _.partial(mergeSchemas, subschema));
        }));
      } else {
        result.oneOf = source.oneOf;
      }
    } else {
      result.oneOf = dest.oneOf;
    }

    return result;
  }

  function normalize(schema){
    var allOf;
    var defaultSchema = {
      multipleOf : 1,
      maximum : defaultMax,
      minimum : 0,
      exclusiveMaximum : false,
      exclusiveMinimum : false,
      maxLength : defaultMax,
      minLength : 0,
      items : [],
      additionalItems : true,
      maxItems : defaultMax,
      minItems : 0,
      uniqueItems : false,
      properties : {},
      patternProperties : {},
      additionalProperties : {},
      maxProperties : Infinity,
      minProperties : 0,
      required : []
    };
    if(_.isString(schema.type)){
      schema.type = [schema.type];
    }
    if(_.contains(schema.type, "number")){
      schema.type = _.union(schema.type, ["integer"]);
    }
    if(schema.exclusiveMaximum){
      schema.exclusiveMaximum = false;
      schema.maximum -= 1;
    }
    if(schema.exclusiveMinimum){
      schema.exclusiveMinimum = false;
      schema.minimum += 1;
    }
    if(schema.additionalProperties === true){
      schema.additionalProperties = {};
    }
    schema = _.defaults(schema, defaultSchema);
    allOf = schema.allOf;
    delete schema.allOf;
    if(_.has(schema, "oneOf")){
      schema.oneOf = _.map(schema.oneOf, normalize);
    }
    _.each(allOf, function(subschema){
      schema = mergeSchemas(schema, normalize(subschema));
    });
    return schema;
  };

  module.exports = function(schema){
    var norm = normalize(schema);

    this.generate = _.partial(generate, schema);
  };
}());
