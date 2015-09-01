var Store = function(cfg_obj){
	var cfg_data = cfg_obj.data;
	var cfg_logic = cfg_obj.logic;
	
	var state_data = cfg_data;
	//var mod_data = $.extend(true,{},state_data);
	var mod_data = JSON.parse(JSON.stringify(state_data));

	this.publicState = null;



}

Store.prototype.set = function(first_argument) {
	
};

Store.prototype.get = function(first_argument) {
	
};

Store.prototype.getState = function () {
	if(!this.publicState){
		this.publicState = ObjectHelper.deepFreeze($.extend({},state_data));
	}
	return this.publicState;
}




var StoreCreator = function(cfg_obj){

	//init
	var newStore = new Store(cfg_obj);
	//add listeners
	for(var event_name in cfg_obj.listeners){
		var l_methods = Array.isArray(cfg_obj.listeners[i]) ? cfg_obj.listeners[i] : [cfg_obj.listeners[i]];
		FunFire.on(event_name,l_methods){

		}
	}

	return {
		getState: newStore.getState
	}

}

