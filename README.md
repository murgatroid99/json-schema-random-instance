# JSON Schema Random Instance
This is a node library for generating random valid instances of JSON Schemas (draft 04).

## Usage

```js
var Generator = require('json-schema-random-instance');
var generator = new Generator(schema);
var instance = generator.generate();
```

## Not Yet Supported

 - `uniqueItems`
 - `$ref`
 - `patternProperties`
 - `additionalProperties`
 - `dependencies`
 - `anyOf`
 - `not`