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
        evSep : '.'
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

    function isLocked(key_path, all_locks, isMyLocks){
        isMyLocks = typeof isMyLocks != 'undefined' ? isMyLocks : false        
        //future: check for parent and child; add regex
       
        if(all_locks.length==0){ //no locks
            return false;
        }else if(all_locks.indexOf(key_path)!=-1){ //exact name found
            return true;
        }else if(all_locks.indexOf('*')!=-1){ //locked all
            return true;
        }else if(key_path=='*'){ //try to lock all
            return true;
        }else{
            for(var i in all_locks){ //part of key_path contain in lock
                if(!isMyLocks && all_locks[i].indexOf(key_path)===0){
                    return true
                }
                if(key_path.indexOf(all_locks[i])===0){
                    return true
                }
            }
            return false
        }      
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

    // CLASSES

    var TransactStore = function(store_prefix, model_data, funcs, origin_event) {
        for(var i in funcs){
            this[i] = funcs[i]; 
        }

        var _changes = {};

        this.get = function(key_path){
            return ObjectHelper.getNested(model_data,key_path);
        }

        this.set = function(key_path, value){       
            //if(this.get(key_path)!==value){ // ref objects will be the same as new value, so always update
            //set only reserved lock key_paths
            if(isLocked(key_path, origin_event.func_data.locks, true)){
                if(ObjectHelper.checkNested(model_data,key_path)){               
                    if(ObjectHelper.setNested(model_data,key_path,value)){
                        _changes[key_path] = value
                    }else{
                        console.warn('TransFlux', 'Failed to set a value to key path',[key_path, value])
                    }
                }else{
                    console.warn('TransFlux', 'Someone try to set a value to not existing key path!',[key_path, value])
                }
            }else{
                throw 'TransFlux: Try to set a value to not self-locked key_path "'+key_path+'" from func "'+origin_event.func_data.func+'" ';
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

        this.emitCommit = function(){
            var emit_data = {changes: _changes, origin_event: origin_event};
            emitterImpl.emit(store_prefix+_cfg.evSep+'commit', emit_data)
            emitterImpl.emit(origin_event.full_name+_cfg.evSep+'commit', emit_data)       
            //self._changes = {};
        }       
        this.emitRollback = function(reason){      
            var emit_data = {/*changes: _changes,*/ reason: reason, origin_event: origin_event, status:'rollbacked'}
            emitterImpl.emitToMany([            
                store_prefix+_cfg.evSep+'done',
                store_prefix+_cfg.evSep+'rollbacked',
                origin_event.full_name+_cfg.evSep+'done',
                origin_event.full_name+_cfg.evSep+'rollbacked',
                store_prefix+_cfg.evSep+'_readyForNext',
            ],emit_data)
            //self._changes = {};
        }   
    }


    var StateManager = function(store_prefix, onlyData){
        var _data = deepCopyImpl(onlyData);
        _data._stateVersion = -1; 

        var _getLastVersionNum = function(){
            return _data._stateVersion;
        }

        //readonly last state export 
        var _lastStableState = null;
        var _lastStableState_readOnly = null; 
        

        var _getReadOnlyState = function(){        
            return _lastStableState_readOnly;
        }

        var _getLastStableState = function(){
            return deepCopyImpl(_lastStableState); // copy the snapshot to prevent edit local var (multi call same var)
            //return _lastStableState;
        }
        var _makeState = function(){
            _data._stateVersion++;
            _lastStableState = deepCopyImpl(_data); //snapshot of current data
            _lastStableState_readOnly = ObjectHelper.deepFreeze(deepCopyImpl(_data));
        }

        var _commitQueue = [];
       
        emitterImpl.on(store_prefix+_cfg.evSep+'commit',function(data){    
            _commitQueue.push({
                data: data,
                event: {
                    name: store_prefix+_cfg.evSep+'commit',
                    store_prefix: store_prefix
                }
            })
            _tryEnqueue();
        })

        var _tryEnqueue = _tryEnqueueShell(function(){
            for(var j=0; j<_commitQueue.length; j++){            
                _onCommit(_commitQueue[j].data);  
                //enqueue
                _commitQueue.splice(j, 1);
                j--; //fix to get correct next             
            }
        })

        function _onCommit(data){       
            //set changes to this
            for(var key_path in data.changes){
                ObjectHelper.setNested(_data, key_path, data.changes[key_path])//is it enought or it is a ref?                             
            }       
            //remake states
            _makeState();
            //notify others for finished update (for unlock and enqueue)
            var emit_data = {
                state: _getReadOnlyState(), 
                changes: data.changes, 
                status:'updated', 
                origin_event: data.origin_event
            }; 
            emitterImpl.emitToMany([
                //store_prefix+'_readyForNext',
                store_prefix+_cfg.evSep+'done',
                store_prefix+_cfg.evSep+'updated',
                data.origin_event.full_name+_cfg.evSep+'done',
                data.origin_event.full_name+_cfg.evSep+'updated',
                store_prefix+_cfg.evSep+'_readyForNext',
            ],emit_data)
        }

        //init load
        _makeState()

        return {
            getReadOnlyState : _getReadOnlyState,
            getLastStableState : _getLastStableState,
            getLastVersionNum: _getLastVersionNum,

        }
    }

    var createStore = function(store_prefix, data_object){   
        var _locked = [];
        var _execQueue = [];   

        var _splitData = extractFuncAndData(data_object);

        var _stateMngr = StateManager(store_prefix, _splitData.data);   

        function _getActionData(event_name){
            var found_func_data = _splitData.data.actionsMap[event_name];
            if(typeof found_func_data == 'string'){
                found_func_data = {func: found_func_data}
            }
            var def_func_data = {           
                func : '_NOT_DEFINED_',
                locks : ['*'],
                onMultiCall : 'queue',
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
                //check if all needed resources are not locked (free)
                var isAllAvailable = true;
                for(var i in job.event.func_data.locks){
                    if(isLocked(job.event.func_data.locks[i], _locked)){
                        isAllAvailable = false;
                        break;
                    }
                }
                if(isAllAvailable){                   
                    //find all event with same name like available job
                    var same_jobs_indexes = [];
                    for(var _i in _execQueue) {
                        if(_execQueue[_i].event.name === job.event.name) {
                            same_jobs_indexes.push(_i);   
                        }
                    }

                    if(job.event.func_data.onMultiCall=='last'){
                        //change job to last found
                        job = _execQueue[ same_jobs_indexes[same_jobs_indexes.length-1] ];
                    }

                    //lock resources
                    _locked = _locked.concat(job.event.func_data.locks)

                    if(['first','last'].indexOf(job.event.func_data.onMultiCall)!=-1){
                        //todo: //remove all
                        for(var ji=same_jobs_indexes.length-1; ji>=0; ji--){
                            _execQueue.splice(same_jobs_indexes[ji], 1);
                        }
                    }else{ //remove only current
                        //remove from queue         
                        _execQueue.splice(j, 1);                        
                    }
                    j--; //fix to get correct next
                   
                    
                    //exec in parallel
                    _asyncExec(job);              
                    //check for next waiting
                }
            }
        })

        function _asyncExec(job){
            setTimeout(function(){                
                _execTransact(job);
            },0);
        }
              
        function _execTransact(job){        
            //begin new trnsaction
            //make an instance with last stable data and all functions       
            var transactState = new TransactStore(store_prefix, _stateMngr.getLastStableState(), _splitData.funcs, job.event);        
            try{
                transactState[job.event.func_data.func].apply(transactState, job.args);
            }catch(err){
                console.error('TransFlux','Action exception in function "'+job.event.func_data.func+'"',err);
                transactState.emitRollback(err);
            } 
        }

        function _enqueue(emit_data){     
            //console.log('_Enqueue');         
            //remove locks            
            for(var i in emit_data.origin_event.func_data.locks){
                var lock_index = _locked.indexOf(emit_data.origin_event.func_data.locks[i])
                if(lock_index!=-1){
                    _locked.splice(lock_index,1);
                }
            }
            _tryEnqueue();
            //console.error('_enqueue force - need to be implemented')
        }

        emitterImpl.on(store_prefix+_cfg.evSep+'_readyForNext', _enqueue);       

        //subscribe store actions (wait for transaction trigger)
        if(_splitData.data.hasOwnProperty('actionsMap')){
            for(var event_name in _splitData.data.actionsMap){
                var func_data = _getActionData(event_name);            
                if(_splitData.funcs.hasOwnProperty(func_data.func)){                
                    _mapOn(event_name, func_data);
                }else{
                    console.warn('TransFlux', 'Action method "'+func_data.func+'" not found for store "'+store_prefix+'"')
                }  
            }
        }else{
            console.warn('TransFlux','No actionsMap for store with prefix "'+store_prefix+'"')
        } 

        return {
            getState: _stateMngr.getReadOnlyState,
            getLastVersionNum: _stateMngr.getLastVersionNum,
            emitter: emitterImpl,
            prefix: store_prefix,
            options: _cfg,
        };
    }


    return {
        options: _cfg,
        createStore: createStore,
        emitter: emitterImpl
    }


}))
