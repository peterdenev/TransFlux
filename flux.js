var TransactStore = function(store_prefix, data_object) {
    for(var i in data_object){
        this[i] = data_object[i]; // or copy? or deep?
    }

    var __changes = {};


}
 
TransactStore.prototype = {
 
    hydrate: function() {
        var memento = JSON.stringify(this);
        return memento;
    },
 
    dehydrate: function(memento) {
        var m = JSON.parse(memento);
        for(var i in m){
            this[i] = m[i]; // or copy? or deep?
        }      
    },

    //only state must have this
    getState: function(){
        return JSON.parse(JSON.stringify(this))
        //return this; // FIXME
    },

    commit: function(){

    },

    rollback: function(reason){

    }

}

// state manager
var StateManager = function(store_prefix, onlyData){
    var data = $.extend({},onlyData);
    data._stateVersion = 0; 

    var getLastVersionNum = function(){
        return data._stateVersion;
    }

    //var _locked = false;

     //readonly last state export 
    var _lastStabileState = null;
    var _lastStabileState_readOnly = null; 
    

    var getReadOnlyState = function(){        
        return _lastStabileState_readOnly;
    }

    var getLastStabileState = function(){
        //return $.extend(true,{},_lastStabileState); // copy the snapshot to prevent edit local var (multi call same var)
        return _lastStabileState;
    }
    var _makeState = function(){
        this._stateVersion++;
        _lastStabileState = $.extend(true,{},this.data); //snapshot of current data
        _lastStabileState_readOnly = ObjectHelper.deepFreeze($.extend(true,{},this.data));
    }

    //FUTURE: in queue
    FunFire.on(store_prefix+'commit',function(event){
        //TODO: set changes to this

        //
        //remake states
        _makeState()
    },window)

    //init load
    _makeState()

    return {
        getReadOnlyState : getReadOnlyState,
        getLastStabileState : getLastStabileState,
        getLastVersionNum: getLastVersionNum,

    }

}


function injectData(data){
    var m = JSON.parse(JSON.stringify(data))
    for(var i in m){
        this[i] = m[i]; // or copy? or deep?
    }    
    return this;
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
    var _locked = false;
    var _execQueue = [];

    var splitData = extractFuncAndData(data_object);

    //statemanager
    var stateMngr = StateManager(store_prefix, splitData.data);    
    //TODO: subscribe lastState to commit/rollback of transact instances


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
        //make an instance with last stabile data and all functions
        var transData = $.extend(true,{}, stateMngr.getLastStabileState(), splitData.funcs) 
        var transactState = new TransactStore(store_prefix, transData);        
        try{
            transactState[func_name].apply(transactState,args);
        }catch(err){
            console.error('FunFlux','Action exception for event "'+event_name+'"',err);
            transactState.rollback(err);
        } 
    }

    //subscribe store actions (wait for transaction trigger)
    if(data_object.hasOwnProperty('actions')){
        for(var event_name in data_object.actions){
            var func_name = data_object.actions[event_name];
            if(data_object.hasOwnProperty(func_name)){                
                _mapOn(store_prefix+event_name,func_name);
            }  
        }
    }  
   
    //listen for ons and other settings

    return {
        getState: stateMngr.getReadOnlyState,
        getLastVersionNum: getLastVersionNum,
    };
}


 
var CareTaker = function() {
    this.mementos = {};
 
    this.add = function(key, memento) {
        this.mementos[key] = memento;
    },
 
    this.get = function(key) {
        return this.mementos[key];
    }
}
 
// log helper
var log = (function () {
    var log = "";
 
    return {
        add: function (msg) { log += msg + "\n"; },
        show: function () { alert(log); log = ""; }
    }
})();
 





