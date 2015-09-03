(function (root, factory) { // UMD from https://github.com/umdjs/umd/blob/master/returnExports.js
    if(typeof define === 'function' && define.amd) {
        define('ObjectHelper',[], factory);
    }else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        // Browser globals
        root.ObjectHelper = factory();
    }
}(this, function () {

    function hasOwnValue(obj, val) {
	    for(var prop in obj) {
	        if(obj.hasOwnProperty(prop) && obj[prop] === val) {
	            return true;   
	        }
	    }
	    return false;
	  }

    function getKeysForValue(obj, val) {
      var props = [];
      for(var prop in obj) {
          if(obj.hasOwnProperty(prop) && obj[prop] === val) {
              props.push(prop);   
          }
      }
      return props;
    }


    //obj, ['a','b','c']
    //obj, 'a.b.c'
    //obj, ['a.b.c']
    function checkNestedCore(obj, path_arr){
      path_arr = extractPath(path_arr)

      for (var i = 0; i < path_arr.length; i++) {
        if( !( (Array.isArray(obj) && obj.indexOf(path_arr[i])!== -1) || obj.hasOwnProperty(path_arr[i]) ) ){
          return false;
        }
        obj = obj[path_arr[i]];
      }
      return true;
    }
    
    function checkNested(obj /*, level1, level2, ... levelN*/) {
      var args = Array.prototype.slice.call(arguments),
          obj = args.shift();      
      return checkNestedCore(obj, args);
    }

    //obj, ['a','b','c']
    //obj, 'a.b.c'
    //obj, ['a.b.c']
    function getNestedCore(obj, path_arr){
      path_arr = extractPath(path_arr)

      for (var i = 0; i < path_arr.length; i++) {
        if( !( (Array.isArray(obj) && obj.indexOf(path_arr[i])!== -1) || obj.hasOwnProperty(path_arr[i]) ) ){
          return undefined;
        }
        obj = obj[path_arr[i]];
      }
      return obj;
    }

    //obj, 'a', 'b', 'c'
    function getNested(obj /*, level1, level2, ... levelN*/) {
      var args = Array.prototype.slice.call(arguments),
          obj = args.shift();
      return getNestedCore(obj,args);
    }

    function mergeOptions(obj1,obj2){
        var obj3 = {};
        for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
        for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
        return obj3;
    }

    function getValue(def_val, obj /*, level1, level2, ... levelN*/){
      var args = Array.prototype.slice.call(arguments),
      def_val = args.shift();     
      var nested_val = getNested.apply(this,args);
      return typeof nested_val !== 'undefined' ? nested_val : def_val; 
    }


    function setNested(obj, path_arr, value){
      path_arr = extractPath(path_arr)
      var isFound = checkNested.apply(this,[obj,path_arr]);
      var last_path = path_arr.pop();
      var closest_el = getNested.apply(this,[obj,path_arr]);
      if(isFound){        
        closest_el[last_path] = value;
        return true
      }else{
        return false
      }
    }    

    function extractPath(path_arr){
      if(Array.isArray(path_arr) && path_arr.length==1){
        path_arr = path_arr[0];
      }
      if(typeof path_arr == 'string'){
        //extract an array from keypath //Ex: 'a.b.c' will be ['a','b','c'] 
        path_arr = path_arr.split('.');
      }
      return path_arr;
    }

    // To make obj fully immutable, freeze each object in obj.
    // To do so, we use this function.
    function deepFreeze(obj) {
      // Retrieve the property names defined on obj
      var propNames = Object.getOwnPropertyNames(obj);
      // Freeze properties before freezing self
      propNames.forEach(function(name) {
        var prop = obj[name];
        // Freeze prop if it is an object
        if (typeof prop == 'object' && !Object.isFrozen(prop))
          deepFreeze(prop);
      });
      // Freeze self
      return Object.freeze(obj);
    }
    
    return {
        hasOwnValue:hasOwnValue,
        getKeysForValue:getKeysForValue,
        checkNested:checkNested,
        getNested:getNested,
        getValue:getValue,
        mergeOptions:mergeOptions,
        setNested:setNested,
        deepFreeze:deepFreeze,
    }

}))


