
if(!emitterImpl){
    throw 'Need to set an eventemitter implementation for - emitterImpl'
}

var TransactStore = function(store_prefix, model_data, funcs, origin_event_name) {
    for(var i in funcs){
        this[i] = funcs[i]; 
    }

    var _changes = {};

    this.get = function(key_path){
        return ObjectHelper.getNested(model_data,key_path);
    }

    this.set = function(key_path, value){
        //debugger;
        //if(this.get(key_path)!==value){ // ref objects will be the same as new value, so always update
            if(ObjectHelper.checkNested(model_data,key_path)){               
                if(ObjectHelper.setNested(model_data,key_path,value)){
                    _changes[key_path] = value
                }else{
                    console.warn('TransFlux', 'Failed to set a value to key path',[key_path, value])
                }
            }else{
                console.warn('TransFlux', 'Someone try to set a value to not existing key path!',[key_path, value])
            }               
        //}
    },

    //experimental (not tested)
    this.setChanged = function(key_path){        
        if(ObjectHelper.checkNested(model_data,key_path)){
            var updated_obj = ObjectHelper.getNested(model_data,key_path);
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

    this.emit = function(event_name, data){
        return emitterImpl.emit(store_prefix+event_name, data);
    }

    this.emitCommit = function(){
        var payload = {changes: _changes, origin_event_name: origin_event_name};
        this.emit('commit', payload)
        this.emit(origin_event_name+'.commit', payload)       
        //self._changes = {};
    }       
    this.emitRollback = function(reason){      
        var payload = {/*changes: _changes,*/ reason: reason, origin_event_name: origin_event_name, status:'rollbacked'}
        this.emit('rollbacked', payload)
        this.emit(origin_event_name+'.rollbacked', payload)
        this.emit(origin_event_name+'.done', payload)
        this.emit('done', payload)
        //self._changes = {};
    }   
}


// state manager
var StateManager = function(store_prefix, onlyData){
    var _data = $.extend(true,{},onlyData);
    _data._stateVersion = -1; 

    var getLastVersionNum = function(){
        return _data._stateVersion;
    }

    //readonly last state export 
    var _lastStableState = null;
    var _lastStableState_readOnly = null; 
    

    var getReadOnlyState = function(){        
        return _lastStableState_readOnly;
    }

    var getLastStableState = function(){
        return $.extend(true,{},_lastStableState); // copy the snapshot to prevent edit local var (multi call same var)
        //return _lastStableState;
    }
    var _makeState = function(){
        _data._stateVersion++;
        _lastStableState = $.extend(true,{},_data); //snapshot of current data
        _lastStableState_readOnly = ObjectHelper.deepFreeze($.extend(true,{},_data));
    }

    //FUTURE: in queue
    emitterImpl.on(store_prefix+'commit',function(data){      
        //debugger;  
        //set changes to this
        for(var key_path in data.changes){
            ObjectHelper.setNested(_data, key_path, data.changes[key_path])//is it enought or it is a ref?                             
        }       
        //remake states
        _makeState();
        //notify others for finished update (for unlock and enqueue)
        var peyload = {
            state: getReadOnlyState(), 
            changes: data.changes, 
            status:'updated', 
            origin_event_name: data.origin_event_name
        };        
        emitterImpl.emit(store_prefix+'updated', peyload);  
        emitterImpl.emit(store_prefix+data.origin_event_name+'.done', peyload) 
        emitterImpl.emit(store_prefix+'done', peyload)  
    },window)

    //init load
    _makeState()

    return {
        getReadOnlyState : getReadOnlyState,
        getLastStableState : getLastStableState,
        getLastVersionNum: getLastVersionNum,

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

var StoreCreator = function(store_prefix, data_object){   
    //debugger; 
    var _locked = false;
    var _execQueue = [];

    var splitData = extractFuncAndData(data_object);

    //statemanager
    var stateMngr = StateManager(store_prefix, splitData.data);   

    //add to quese
    function _mapOn(event_name, func_name){       
        emitterImpl.on(event_name,function(){             
            var args = Array.prototype.slice.call(arguments);                     
            _execQueue.push({
                func_name: func_name,
                args: args,
                event: {
                    name: event_name
                }
            })
            _tryEnqueue();               
        },window);        
    }

    function _tryEnqueue(force){            
        if(!_locked || force){                
            _locked = true;
            if(_execQueue.length>0){
                var job = _execQueue.shift();                
                _execTransact(job.func_name ,job.args, job.event.name);  
            }else{
                _locked = false;
            }
        }
    }
    function _enqueue(){        
        _tryEnqueue(true);
    }

    function _execTransact(func_name, args, origin_event_name){
        //hint may need to be in custom namespace with params //FIXME
        //begin new trnsaction
        //make an instance with last stable data and all functions       
        var transactState = new TransactStore(store_prefix, stateMngr.getLastStableState(), splitData.funcs, origin_event_name);        
        try{
            transactState[func_name].apply(transactState,args);
        }catch(err){
            console.error('TransFlux','Action exception in function "'+func_name+'"',err);
            transactState.emitRollback(err);
        } 
    }

    //emitterImpl.on(store_prefix+'updated', _enqueue);
    //emitterImpl.on(store_prefix+'rollbacked', _enqueue);
    emitterImpl.on(store_prefix+'done', _enqueue);
    /*emitterImpl.on(store_prefix+'done', function(){
        setTimeout(_enqueue,0);
    });*/

    //subscribe store actions (wait for transaction trigger)
    if(splitData.data.hasOwnProperty('actionsMap')){
        for(var event_name in splitData.data.actionsMap){
            var func_name = splitData.data.actionsMap[event_name];
            if(splitData.funcs.hasOwnProperty(func_name)){                
                _mapOn(store_prefix+event_name,func_name);
            }else{
                console.warn('TransFlux', 'Action method "'+func_name+'" not found for store "'+store_prefix+'"')
            }  
        }
    }else{
        console.warn('TransFlux','No actionsMap for store with prefix "'+store_prefix+'"')
    }  
   
    //listen for ons and other settings

    return {
        getState: stateMngr.getReadOnlyState,
        getLastVersionNum: stateMngr.getLastVersionNum,
    };
}
