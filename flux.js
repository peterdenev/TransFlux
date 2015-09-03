
if(!emitterImpl){
    throw 'Need to set an eventemitter implementation for - emitterImpl'
}

/*
if(typeof emitterImpl.emitAsync != 'function'){
    emitterImpl.emitGroupAsync = function(arr){
        for(var i in arr){
            setTimeout(function(){
                emitterImpl.emit(arr[i][0], arr[i][1]);
            },0)
        }
    }
}
*/

if(typeof emitterImpl.emitToMany != 'function'){
    emitterImpl.emitToMany = function(event_names, data){
        //console.log(event_names);
        for(var i in event_names){           
            emitterImpl.emit(event_names[i], data);           
        }
    }
}

var event_name_separator = typeof event_name_separator != 'undefined' ? event_name_separator : '.';

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
        var emit_data = {changes: _changes, origin_event_name: origin_event_name};
        emitterImpl.emit(store_prefix+'commit', emit_data)
        emitterImpl.emit(origin_event_name+event_name_separator+'commit', emit_data)       
        //self._changes = {};
    }       
    this.emitRollback = function(reason){      
        var emit_data = {/*changes: _changes,*/ reason: reason, origin_event_name: origin_event_name, status:'rollbacked'}
        emitterImpl.emitToMany([            
            store_prefix+'done',
            store_prefix+'rollbacked',
            origin_event_name+event_name_separator+'done',
            origin_event_name+event_name_separator+'rollbacked',
            store_prefix+'_readyForNext',
        ],emit_data)
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

    var _commitQueue = [];
    //var _needEnqueue = false;

    //FUTURE: in queue (ust be synch)
    emitterImpl.on(store_prefix+'commit',function(data){    
        _commitQueue.push({
            data: data,
            event: {
                name: store_prefix+'commit',
                store_prefix: store_prefix
            }
        })
        _tryEnqueue();
    })


    var _tryEnqueue = _tryEnqueueShell(function(){
        for(var j=0; j<_commitQueue.length; j++){            
            onCommit(_commitQueue[j].data);  
            //enqueue
            _commitQueue.splice(j, 1);
            j--; //fix to get correct next             
        }
    })


    /*function _tryEnqueue(force){
        if(!_isChecking || force){
            _isChecking = true; 
            for(var j=0; j<_commitQueue.length; j++){            
                onCommit(_commitQueue[j].data);                
            }
            //recheck if someone was tried to enqueue while checking
            if(_needEnqueue){
                _needEnqueue = false;
                _tryEnqueue(true);
            }
            _isChecking = false;
        }else{
            _needEnqueue = true;
        }
    }*/

    function onCommit(data){
        //debugger;  
        //set changes to this
        for(var key_path in data.changes){
            ObjectHelper.setNested(_data, key_path, data.changes[key_path])//is it enought or it is a ref?                             
        }       
        //remake states
        _makeState();
        //notify others for finished update (for unlock and enqueue)
        var emit_data = {
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
        ],emit_data)
    }

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
    var _locked = [];
    var _execQueue = [];
    //var _isChecking = false;
    //var _needEnqueue = false;

    var splitData = extractFuncAndData(data_object);

    var stateMngr = StateManager(store_prefix, splitData.data);   

    //add to queue
    function _mapOn(event_name, func_name, func_locks){       
        emitterImpl.on(event_name,function(){             
            var args = Array.prototype.slice.call(arguments);   
            _execQueue.push({
                func_name: func_name,
                func_locks: func_locks,
                args: args,
                event: {
                    name: event_name
                }
            })
            _tryEnqueue();
        });        
    }

   /* function _tryEnqueue(force){   
        //console.log('try Enqueue');
        //todo enter this function must be synch (check if is currently checking, it will try again later)
        if(!_isChecking || force){
            _isChecking = true;           
            for(var j=0; j<_execQueue.length; j++){
                var job = _execQueue[j];
                //check if all needed resources are not locked (free)
                var isAllAvailable = true;
                for(var i in job.func_locks){
                    if(isLocked(job.func_locks[i])){
                        isAllAvailable = false;
                        break;
                    }
                }
                if(isAllAvailable){   
                    //lock resources
                    _locked = _locked.concat(job.func_locks)
                    //remove from queue         
                    _execQueue.splice(j, 1);
                    j--; //fix to get correct next
                    //exec in parallel
                    setTimeout(function(){
                        _execTransact(job.func_name ,job.args, job.event.name, job.func_locks);
                    },0);
                    //check for next waiting
                }
            }
            //recheck if someone was tried to enqueue while checking
            if(_needEnqueue){
                _needEnqueue = false;
                _tryEnqueue(true);
            }
            _isChecking = false;
        }else{
            _needEnqueue = true;
        }
    }*/

    var _tryEnqueue = _tryEnqueueShell(function(){
        for(var j=0; j<_execQueue.length; j++){
            var job = _execQueue[j];
            //check if all needed resources are not locked (free)
            var isAllAvailable = true;
            for(var i in job.func_locks){
                if(isLocked(job.func_locks[i])){
                    isAllAvailable = false;
                    break;
                }
            }
            if(isAllAvailable){   
                //lock resources
                _locked = _locked.concat(job.func_locks)
                //remove from queue         
                _execQueue.splice(j, 1);
                j--; //fix to get correct next
                //exec in parallel
                _asyncExec(job);
                /*setTimeout((function(job){
                    _execTransact(job.func_name ,job.args, job.event.name, job.func_locks);
                })(job),0);*/
                //check for next waiting
            }
        }
    })

    function _asyncExec(job){
        setTimeout(function(){
            _execTransact(job.func_name ,job.args, job.event.name, job.func_locks);
        },0);
    }

    function _enqueue(emit_data){     
        //console.log('_Enqueue'); 
        
        //remove locks  
        var event_name = emit_data.origin_event_name.substr( (store_prefix+'.').length-1 )
        var func_data = getActionData(event_name)
        for(var i in func_data.func_locks){
            var lock_index = _locked.indexOf(func_data.func_locks[i])
            if(lock_index!=-1){
                _locked.splice(lock_index,1);
            }
        }
        _tryEnqueue();
        //console.error('_enqueue force - need to be implemented')
    }

    function _execTransact(func_name, args, origin_event_name, func_locks){
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
    
    function getActionData(event_name){
        var func_data = splitData.data.actionsMap[event_name];
        var func_name = func_data
        var func_locks = ['*']
        if(typeof func_data == 'object'){
            if(func_data.hasOwnProperty('func')){
                func_name = func_data.func;
            }
            if (func_data.hasOwnProperty('locks')){
                func_locks = func_data.locks
            }
        }
        return {
            func_name: func_name,
            func_locks: func_locks
        }
    }

    //subscribe store actions (wait for transaction trigger)
    if(splitData.data.hasOwnProperty('actionsMap')){
        for(var event_name in splitData.data.actionsMap){
            var func_data = getActionData(event_name);            
            if(splitData.funcs.hasOwnProperty(func_data.func_name)){                
                _mapOn(store_prefix+event_name, func_data.func_name, func_data.func_locks);
            }else{
                console.warn('TransFlux', 'Action method "'+func_data.func_name+'" not found for store "'+store_prefix+'"')
            }  
        }
    }else{
        console.warn('TransFlux','No actionsMap for store with prefix "'+store_prefix+'"')
    } 

    function isLocked(key_path){
        //future: check for parent and child; add regex

       //exact name found
        if(_locked.indexOf(key_path)!=-1){
            return true;
        }else{
            for(var i in _locked){
                if(_locked[i].indexOf(key_path)===0 || key_path.indexOf(_locked[i])===0){
                    return true
                }
            }
            return false
        }      
    } 


    return {
        getState: stateMngr.getReadOnlyState,
        getLastVersionNum: stateMngr.getLastVersionNum,
    };
}
