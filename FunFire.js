(function (root, factory) { // UMD from https://github.com/umdjs/umd/blob/master/returnExports.js
    if(typeof define === 'function' && define.amd) {
        define([], factory);
    }else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        // Browser globals
        root.FunFire = factory();
    }
}(this, function () {

    var FF='FunFire',
        _l='_listeners';

    var fireEvent = function(el,ev){
        if (document.createEventObject){
            // dispatch for IE
            var evt = document.createEventObject();
            return el.fireEvent('on'+ev,evt)
        }
        else{
            // dispatch for firefox + others
            var evt = document.createEvent("HTMLEvents");
            evt.initEvent(event, true, true ); // event type,bubbling,cancelable
            return !el.dispatchEvent(evt);
        }
    };

    var saveHandlers = function(evName, cb, el){
        if(!el.hasOwnProperty(FF)) 
            el[FF] = { _listeners : {} };        
        if(!el[FF][_l].hasOwnProperty[evName]) 
            el[FF][_l][evName] = [];        
        el[FF][_l][evName].push(cb);
    }

    var getHandlers = function(evName, el){
        if(el.hasOwnProperty(FF) && 
            el[FF].hasOwnProperty(_l) && 
            el[FF][_l].hasOwnProperty(evName)){
                return el[FF][_l][evName];
        }
        return [];
    }

    var clearHandlers = function(el, evName ){
        if(el.hasOwnProperty(FF) && el[FF].hasOwnProperty(_l)){
           (typeof evName == 'undefined') ? el[FF][_l] = {} : el[FF][_l][evName] = {};            
        }
    }

    var FunFire = {
       on : function on(evName, cb, el){
            if(arguments.length<3) el = document; 
            var exec_cb = function(e){
                var hasFF = e.hasOwnProperty(FF);                 
                var rez = cb(e, hasFF ? e[FF].data : null, hasFF ? e[FF].callback : null);           
                if(rez===false){
                    var hlrs = getHandlers(evName,el);
                    FunFire.off(evName,el);
                    for(var h_key in hlrs){
                        FunFire.on(evName,hlrs[h_key],el);
                    }                    
                }
                return rez;
            }
            if("addEventListener" in el){
                el.addEventListener(evName,exec_cb,false);
            }else{
                document.attachEvent("on"+evName, exec_cb);
            }
            saveHandlers(evName, exec_cb, el);
       },
       emit: function emit(evName, el, data, cb){
            if(arguments.length<2) el = document;
            var ff_d = { data:data, callback:cb };
            if (document.createEventObject){ // dispatch for IE
                var evt = document.createEventObject();
                evt[FF] = ff_d;
                return el.fireEvent('on'+evName,evt)
            }else{// dispatch for firefox + others
                var evt = document.createEvent("HTMLEvents");
                evt[FF] = ff_d;
                evt.initEvent(evName, true, true ); // event type,bubbling,cancelable
                return !el.dispatchEvent(evt);
            }
        },
        once : function once(evName, cb, el){ 
            if(arguments.length<3) el = document;
            FunFire.on(evName, function(e, data, f_cb){                               
                e.target.removeEventListener(e.type, arguments.callee.caller); // remove event 
                return cb(e, data, f_cb); // call handler
            }, el);           
        },
        off : function off(evName, el){
            if(arguments.length<2) el = document;
            var handlers = getHandlers(evName, el);
            for(var h_key in handlers){
                el.removeEventListener(evName, handlers[h_key]);
            }
            clearHandlers(el, evName );
        }        
    };

    return FunFire;

}));