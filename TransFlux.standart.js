(function (root, factory) { // UMD from https://github.com/umdjs/umd/blob/master/returnExports.js
    if(typeof define === 'function' && define.amd) {
        define('TransFlux',['ObjectHelper', 'emitterImpl','deepCopyImpl'], factory);
    }else if (typeof exports === 'object') {
        module.exports = factory(ObjectHelper, emitterImpl, deepCopyImpl);
    } else {
        // Browser globals
        root.TransFlux = factory(ObjectHelper, emitterImpl, deepCopyImpl);
    }
}(this, function (ObjectHelper, emitterImpl, deepCopyImpl) {

    //HELPERS

    if(!ObjectHelper){
        throw 'TransFlux hard depends on ObjectHelper, but not found!'
    }

    if(!emitterImpl){
        throw 'TransFlux: Need to set an eventemitter implementation for - emitterImpl (Ex. new EventEmitter2())'
    }

    if(!deepCopyImpl){
        throw 'TransFlux: Need to set a deep copy implementation for - deepCopyImpl (Ex. function(origin_obj){ return $.extend(true,{},origin_obj) } )'
    }

    setEmitToMany();    

    var _cfg = {
        evSep : '.',       
    }
   
    function setEmitToMany(){
        if(typeof emitterImpl.emitToMany != 'function'){
            emitterImpl.emitToMany = function(event_names, data){
                //console.log(event_names);
                for(var i in event_names){           
                    emitterImpl.emit(event_names[i], data);           
                }
            }
        }
    }

    function extractFuncAndData(obj){
        var result = {
            data: {},
            funcs: {}
        }
        for(var i in obj){
            if(typeof obj[i] == 'function'){
                result.funcs[i] = obj[i];
            }else{
                result.data[i] = obj[i];
            }
        }
        return result;
    }    

    function _tryEnqueueShell(cb){
        var _isChecking = false;
        var _needEnqueue = false;

        var _tryEnQ = function(force){
            if(!_isChecking || force){
                _isChecking = true; 
                cb();            
                //recheck if someone was tried to enqueue while checking
                if(_needEnqueue){
                    _needEnqueue = false;
                    _tryEnQ(true);
                }
                _isChecking = false;
            }else{
                _needEnqueue = true;
            }
        }
        return _tryEnQ;
    }

    function reverseForIn(obj, f) {
        var arr = [];
        for (var key in obj) {
            // add hasOwnPropertyCheck if needed
            arr.push(key);
        }
        for (var i=arr.length-1; i>=0; i--) {
            f.call(obj, arr[i]);
        }
    }

    // CLASSES

    var TransactStore = function(store_prefix, splitModel) {

        for(var i in splitModel.funcs){
            this[i] = splitModel.funcs[i]; 
        }

        splitModel.data._stateVersion = 0;

        var _publicStateData = splitModel.data
        var _transactStateData = deepCopyImpl(splitModel.data)

        var _changes = {};

        this.get = function(key_path){
            return ObjectHelper.getNested(_transactStateData,key_path);
        }

        this.set = function(key_path, value){
            if(ObjectHelper.checkNested(_transactStateData,key_path)){
                if(ObjectHelper.setNested(_transactStateData,key_path,value)){
                    _changes[key_path] = value
                }else{
                    console.warn('TransFlux', 'Failed to set a value to key path',[key_path, value])
                }
            }else{
                console.warn('TransFlux', 'Someone try to set a value to not existing key path!',[key_path, value])
            }     
        },

        //experimental (not tested)
        this.setChanged = function(key_path){
            if(ObjectHelper.checkNested(_transactStateData,key_path)){
                var updated_obj = ObjectHelper.getNested(_transactStateData,key_path);
                if(typeof updated_obj != 'object'){
                    console.warn('TransFlux', 'Use setChanged only for array or object, or use "set" insted!')
                }
                _changes[key_path] = updated_obj;
            }else{
                console.warn('TransFlux', 'Someone try to setChange to not existing key path!',key_path)
            }  
        }

        //experimental (not tested)
        this.use = function(key_path, func){
            this.set(key_path, func.apply(this,[this.get(key_path)]) )
        }

        this._run = function(func_name, args, origin_event){
            var result = null;
            //exec
            try{
                result = this[func_name].apply(this, args);
            }catch(err){
                result = ['TransFlux: Action exception in function "'+func_name+'"', err];
                console.error(result);
            } 
            //dispatch
            if(result===true){
                _emitUpdated.apply(this,[origin_event]);
            }else{
                if(typeof result == 'undefined'){
                    result = 'TransFlux: No return value from action function "'+func_name+'" - act as Rollback!'
                    console.warn(result)
                }
                _emitRollbacked(result, origin_event);
            }
            //reset
            _changes = {};
        }

        var _emitUpdated = function(origin_event){   
            //increase version
            this.set('_stateVersion', this.get('_stateVersion')+1);
            //set changes to publicState
            for(var key_path in _changes){
                if(typeof _changes[key_path] == 'object'){
                    ObjectHelper.setNested( _publicStateData, key_path, deepCopyImpl(_changes[key_path]) ) 
                }else{
                    ObjectHelper.setNested( _publicStateData, key_path, _changes[key_path] )
                }                           
            }
            //notify others for finished update (for unlock and enqueue)
            var emit_data = {
                state: _publicStateData, 
                changes: _changes, 
                status:'updated', 
                origin_event: origin_event
            }; 
            emitterImpl.emitToMany([                
                store_prefix+_cfg.evSep+'done',
                store_prefix+_cfg.evSep+'updated',
                origin_event.full_name+_cfg.evSep+'done',
                origin_event.full_name+_cfg.evSep+'updated',
                store_prefix+_cfg.evSep+'_readyForNext',
            ],emit_data)            
        }       

        var _emitRollbacked = function(reason, origin_event){            
            //revert changes from publicState
            reverseForIn(_changes, function(key_path){
                var original_val = ObjectHelper.getNested( _publicStateData, key_path);
                if(typeof original_val == 'object'){
                    ObjectHelper.setNested( _transactStateData, key_path, deepCopyImpl(original_val) )
                }else{
                    ObjectHelper.setNested( _transactStateData, key_path, original_val )
                }
            })
            
            //notify others for finished (for unlock and enqueue)
            var emit_data = {
                state: _publicStateData, 
                changes: {}, 
                status:'rollbacked', 
                origin_event: origin_event,
                reason: reason
            };            
            emitterImpl.emitToMany([
                store_prefix+_cfg.evSep+'done',
                store_prefix+_cfg.evSep+'rollbacked',
                origin_event.full_name+_cfg.evSep+'done',
                origin_event.full_name+_cfg.evSep+'rollbacked',
                store_prefix+_cfg.evSep+'_readyForNext',
            ],emit_data)
        }

        this.getPublicState = function(){
            return _publicStateData;
        }        
    }


    var createStore = function(store_prefix, data_object){
        var _execQueue = [];          

        var _splitModel = extractFuncAndData(data_object);

        var _transactStore = new TransactStore(store_prefix, _splitModel);

        function _getActionData(event_name){
            var found_func_data = _splitModel.data.actionsMap[event_name];
            if(typeof found_func_data == 'string'){
                found_func_data = {func: found_func_data}
            }
            var def_func_data = { 
                func : '_NOT_DEFINED_'
            }
            return ObjectHelper.mergeOptions(def_func_data, found_func_data)
        }

        //add to queue
        function _mapOn(event_name, func_data){  
            var full_event_name = store_prefix+_cfg.evSep+event_name;
            emitterImpl.on(full_event_name,function(){
                var args = Array.prototype.slice.call(arguments);               
                _execQueue.push({
                    args: args,
                    event: { //origin_event init
                        name: event_name,
                        full_name: full_event_name,
                        func_data: func_data,
                    }
                })                
                _tryEnqueue();
            });
        }   

        var _tryEnqueue = _tryEnqueueShell(function(){
            for(var j=0; j<_execQueue.length; j++){
                var job = _execQueue[j];                
                //remove from queue
                _execQueue.splice(j, 1);
                j--; //fix to get correct next

                emitterImpl.emit(job.event.full_name+_cfg.evSep+'started', job);
                _transactStore._run(job.event.func_data.func, job.args, job.event);
                //check for next waiting                
            }
        })              
        

        function _enqueue(emit_data){ 
            _tryEnqueue();
            //emitterImpl.emit(emit_data.origin_event.full_name+_cfg.evSep+'finished', job);
        }

        emitterImpl.on(store_prefix+_cfg.evSep+'_readyForNext', _enqueue);

        //subscribe store actions (wait for transaction trigger)
        if(_splitModel.data.hasOwnProperty('actionsMap')){
            for(var event_name in _splitModel.data.actionsMap){
                var func_data = _getActionData(event_name);
                if(_splitModel.funcs.hasOwnProperty(func_data.func)){
                    _mapOn(event_name, func_data);
                }else{
                    console.warn('TransFlux', 'Action method "'+func_data.func+'" not found for store "'+store_prefix+'"')
                }  
            }
        }else{
            console.warn('TransFlux','No actionsMap for store with prefix "'+store_prefix+'"')
        } 

        return {
            getState: _transactStore.getPublicState,          
            emitter: emitterImpl,
            prefix: store_prefix,
            options: _cfg,
        };
    }

    // ACTION HELPER
    
    function createAction(storeInst, event_name, exec_func){
        if(typeof exec_func != 'function'){
            return _createSimpleAction(storeInst, event_name)
        }
        return {
            on: function(status, cb){
                return _emitterWrap('on', storeInst, event_name, status, cb)
            },
            once: function(status, cb){
                return _emitterWrap('once', storeInst, event_name, status, cb)
            },
            exec: exec_func
        }
    }

    function _createSimpleAction(storeInst, event_name){
        var exec = function(){          
            var args = Array.prototype.slice.call(arguments);
            storeInst.emitter.emit.apply(storeInst.emitter.emit, [
                storeInst.prefix+ storeInst.options.evSep+ event_name
            ].concat(args));
        }
        return createAction(storeInst, event_name, exec)
    }

    function _emitterWrap(type, storeInst, event_name, status, cb){
        storeInst.emitter[type](storeInst.prefix + storeInst.options.evSep + event_name + storeInst.options.evSep + status, cb)
        return {
            on: _emitterWrap.bind(this,'on', storeInst, event_name),
            once: _emitterWrap.bind(this,'once', storeInst, event_name)
        }
    }

    function createActions(storeInst, mapping){
        var actionsArr = {};
        for(var action in mapping){
            var aMap = mapping[action];
            if(typeof aMap != 'function'){
                if(typeof aMap == 'string'){
                    aMap = [aMap]
                } 
                actionsArr[action] = createAction.apply(createAction, [storeInst].concat(aMap))
            }else{
                actionsArr[action] = {exec: aMap.bind(actionsArr)};
            }
        }
        return actionsArr;
    }


    return {
        options: _cfg,
        createStore: createStore,
        emitter: emitterImpl,
        createAction: createAction,
        createActions: createActions,

    }


}))
