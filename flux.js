var TransactStore = function(store_prefix, model_data, funcs) {
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

    this.emit = function(event_name, data, callback){
        return FunFire.emit(store_prefix+event_name,window,data,callback);
    }

    this.emitCommit = function(){
        this.emit('commit', {changes: _changes})
        //self._changes = {};
    }       
    this.emitRollback = function(reason){       
        this.emit('rollback', {/*changes: _changes,*/ reason: reason})
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
    FunFire.on(store_prefix+'commit',function(event){
        var changes = event.FunFire.data.changes
        //set changes to this
        for(var key_path in changes){
            ObjectHelper.setNested(_data, key_path, changes[key_path])//is it enought or it is a ref?                             
        }       
        //remake states
        _makeState();
        //notify others for finished update (for unlock and enqueue)
        FunFire.emit(store_prefix+'updated', window, {state: getReadOnlyState(), changes: changes});    
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
        FunFire.on(event_name,function(event){                          
            _execQueue.push({
                func_name: func_name,
                args: event.FunFire.data,
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
                _execTransact(job.func_name ,job.args);  
            }else{
                _locked = false;
            }
        }
    }
    function _enqueue(){        
        _tryEnqueue(true);
    }

    function _execTransact(func_name, args){
        //hint may need to be in custom namespace with params //FIXME
        //begin new trnsaction
        //make an instance with last stable data and all functions       
        var transactState = new TransactStore(store_prefix, stateMngr.getLastStableState(), splitData.funcs);        
        try{
            transactState[func_name].apply(transactState,[args]);
        }catch(err){
            console.error('TransFlux','Action exception in function "'+func_name+'"',err);
            transactState.emitRollback(err);
        } 
    }

    FunFire.on(store_prefix+'updated', _enqueue, window);
    FunFire.on(store_prefix+'rollback', _enqueue, window);

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
