
if(!emitterImpl){
    throw 'Need to set an eventemitter implementation for - emitterImpl'
}

if(typeof emitterImpl.emitAsync != 'function'){
    emitterImpl.emitGroupAsync = function(arr){
        for(var i in arr){
            setTimeout(function(){
                emitterImpl.emit(arr[i][0], arr[i][1]);
            },0)
        }
    }
}

if(typeof emitterImpl.emitToMany != 'function'){
    emitterImpl.emitToMany = function(event_names, data){
        //console.log(event_names);
        for(var i in event_names){           
            emitterImpl.emit(event_names[i], data);           
        }
    }
}

var event_name_separator = typeof event_name_separator != 'undefined' ? event_name_separator : '.';

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

    /*this.emit = function(event_name, data){
        return emitterImpl.emit(store_prefix+event_name, data);
    }*/

    this.emitCommit = function(){
        var payload = {changes: _changes, origin_event_name: origin_event_name};
        emitterImpl.emit(store_prefix+'commit', payload)
        emitterImpl.emit(origin_event_name+event_name_separator+'commit', payload)       
        //self._changes = {};
    }       
    this.emitRollback = function(reason){      
        var payload = {/*changes: _changes,*/ reason: reason, origin_event_name: origin_event_name, status:'rollbacked'}
        emitterImpl.emitToMany([            
            store_prefix+'done',
            store_prefix+'rollbacked',
            origin_event_name+event_name_separator+'done',
            origin_event_name+event_name_separator+'rollbacked',
            store_prefix+'_readyForNext',
        ],payload)
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
        var payload = {
            state: getReadOnlyState(), 
            changes: data.changes, 
            status:'updated', 
            origin_event_name: data.origin_event_name
        }; 
        emitterImpl.emitToMany([
            //store_prefix+'_readyForNext',
            store_prefix+'done',
            store_prefix+'updated',
            data.origin_event_name+event_name_separator+'done',
            data.origin_event_name+event_name_separator+'updated',
            store_prefix+'_readyForNext',
        ],payload)
        
    })

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
        });        
    }

    function _tryEnqueue(force){   
        //console.log('try Enqueue');         
        if(!_locked || force){                
            _locked = true;
            if(_execQueue.length>0){
                var job = _execQueue.shift(); 
                //console.log('Start job: ',job);               
                _execTransact(job.func_name ,job.args, job.event.name);  
            }else{
                _locked = false;
            }
        }
    }
    function _enqueue(){     
        //console.log('_Enqueue');   
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
    emitterImpl.on(store_prefix+'_readyForNext', _enqueue);
    /*emitterImpl.on(store_prefix+'_readyForNext', function(){
        setTimeout(_enqueue,0);
    });*/

    function normalize_actionsMap(actionMap){
        var aMap = {};


        if(splitData.data.hasOwnProperty('actionsMap')){
            for(var event_name in splitData.data.actionsMap){
                var func_name = splitData.data.actionsMap[event_name];
                if(splitData.funcs.hasOwnProperty(func_name)){

                }
            }
        }        
    }

    //subscribe store actions (wait for transaction trigger)
    if(splitData.data.hasOwnProperty('actionsMap')){
        for(var event_name in splitData.data.actionsMap){
            var func_data = splitData.data.actionsMap[event_name];
            var func_name = func_data
            var func_lock = ['*']
            if(typeof func_data == 'object'){
                if(func_data.hasOwnProperty('func')){
                    func_name = func_data.func;
                }
                if (func_data.hasOwnProperty('lock')){
                    func_lock = func_data.lock
                }
            }
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
