
function startUp(){

	var obj_data_1 = {
        name: 'mike',
        info: {
            age: 27,
            month: 'january',
            address: {
                city: 'Varna',
                street: 'slivnica',
                number: 1
            }
        },
        projects: [
            {   
                name: 'DataFlow',
                lang: ['php','js']
            },
            {
                name: 'Poll',
                lang: ['cake', 'php', 'js']
            }
        ],          
    }

    var obj_funcs_1 = {
    	addProjectGetSet: function(proj){
        	//debugger;
        	var projs = this.get('projects');
        	projs.push(proj);
        	this.set('projects',projs);
        	this.emitCommit();        	
        },
        addProjectUse: function(proj){
        	this.use('projects',function(projs){
        		projs.push(proj);
        		return projs;
        	})
        	this.emitCommit();
        },
        addProjectSetChanged: function(proj){
        	var projs = this.get('projects');
        	projs.push(proj);
        	this.setChanged('projects');
        	this.emitCommit(); 
        },
        addProjectChain: function(proj){
        	this.addProjectGetSet(data);
        },
        addProjectRollback: function(proj){
        	var projs = this.get('projects');
        	projs.push(proj);
        	this.set('projects',projs);
        	this.emitRollback(); 
        },
    }

    var obj_map_1 = {
    	actionsMap : {
	    	addProject_get_set: 'addProjectGetSet',
	    	addProject_use: 'addProjectUse',
	    	addProject_setChanged: 'addProjectSetChanged',
	    	addProject_chain: 'addProjectChain',
	    	addProject_rollback: 'addProjectRollback',
	    }
	}


	return {
		obj_1: $.extend({},obj_data_1,obj_funcs_1,obj_map_1),
		obj_data_1: obj_data_1,
		obj_funcs_1: obj_funcs_1,
		obj_map_1: obj_map_1,
	
	}

}


QUnit.test( "STORE init", function( assert ) {
	var init = startUp();	

  	var mikeStore = StoreCreator('Mike.',init.obj_1);

  	assert.ok(typeof mikeStore == 'object','Store is an object')
  	//assert.ok(mikeStore,'Store is instqance of Store')
  	assert.ok(typeof mikeStore.getState == 'function', 'Store have a getState function');

  	//assert.equal(mikeStore.getState(), removeFuncs($.extend(true,{},init.obj_data_1)), 'State is equal to all non func data from store');
  	assert.deepEqual(
  		mikeStore.getState(), 
  		$.extend(true,{_stateVersion:0},init.obj_data_1,init.obj_map_1), 
  		'State is deep equal to all non func data from store + the version num'
  	);

})


QUnit.test('Store modifications',function(assert){	

	var asynchCount = 3;
	//prepare async
	var dones = [];	
	assert.expect(asynchCount);
	for(var d=1; d<=asynchCount; d++){
		dones[d] = assert.async()
	}


	var init = startUp();
	//debugger;
  	var mikeStore = StoreCreator('Mike2.',init.obj_1);
 	
    emitterImpl.once('Mike2.updated',function(){    	
	  	assert.deepEqual(
	  		mikeStore.getState(),
	  		$.extend(
	  		{
	  			_stateVersion: 1,
	  			name: 'mike',
		        info: {
		            age: 27,
		            month: 'january',
		            address: {
		                city: 'Varna',
		                street: 'slivnica',
		                number: 1
		            }
		        },
		        projects: [
		            {   
		                name: 'DataFlow',
		                lang: ['php','js']
		            },
		            {
		                name: 'Poll',
		                lang: ['cake', 'php', 'js']
		            },
		            {   
			            name: 'TransFlux',
			            lang: ['js']
			        }
		        ],		        
		    },init.obj_map_1),
		    'addProject with Get and Set - commit'
	  	)
	  	dones[1]()
	})

	//debugger;
	emitterImpl.emit('Mike2.addProject_get_set',{   
            name: 'TransFlux',
            lang: ['js']
    })

	//test 2

    emitterImpl.once('Mike2.updated',function(){    	
	  	assert.deepEqual(
	  		mikeStore.getState(),
	  		$.extend(
	  		{
	  			_stateVersion: 2,
	  			name: 'mike',
		        info: {
		            age: 27,
		            month: 'january',
		            address: {
		                city: 'Varna',
		                street: 'slivnica',
		                number: 1
		            }
		        },
		        projects: [
		            {   
		                name: 'DataFlow',
		                lang: ['php','js']
		            },
		            {
		                name: 'Poll',
		                lang: ['cake', 'php', 'js']
		            },
		            {   
			            name: 'TransFlux',
			            lang: ['js']
			        },
			        {
			        	name: 'SuperCoolProj',
            			lang: ['brainfuck']
			        }
		        ]		       
		    },init.obj_map_1),
		    'addProject with Get and Set again to version 2'
	  	)
	  	dones[2]()
	})

	//debugger;
	emitterImpl.emit('Mike2.addProject_get_set',{   
            name: 'SuperCoolProj',
            lang: ['brainfuck']
    })


    //test 3

    emitterImpl.once('Mike2.updated',function(){    	
	  	assert.deepEqual(
	  		mikeStore.getState(),
	  		$.extend(
	  		{
	  			_stateVersion: 3,
	  			name: 'mike',
		        info: {
		            age: 27,
		            month: 'january',
		            address: {
		                city: 'Varna',
		                street: 'slivnica',
		                number: 1
		            }
		        },
		        projects: [
		            {   
		                name: 'DataFlow',
		                lang: ['php','js']
		            },
		            {
		                name: 'Poll',
		                lang: ['cake', 'php', 'js']
		            },
		            {   
			            name: 'TransFlux',
			            lang: ['js']
			        },
			        {
			        	name: 'SuperCoolProj',
            			lang: ['brainfuck']
			        },
			        {
			        	name: 'Nacepin',
            			lang: ['none']
			        }
		        ]		       
		    },init.obj_map_1),
		    'addProject with "use"'
	  	)
	  	dones[3]()
	})

	//debugger;
	emitterImpl.emit('Mike2.addProject_use',{   
            name: 'Nacepin',
            lang: ['none']
    })

    /*assert.equal(
    	mikeStore.getState()._stateVersion,
    	2,
    	'an action was called but the last Stable state must be with old data/version'
    )*/


});