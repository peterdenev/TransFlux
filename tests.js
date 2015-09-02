
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
        	//debugger;
        	var projs = this.get('projects');
        	projs.push(proj);
        	this.setChanged('projects');
        	this.emitCommit(); 
        },        
        addProjectRollback: function(proj){
        	//debugger;
        	var projs = this.get('projects');
        	projs.push(proj);
        	this.set('projects',projs);
        	this.emitRollback(); 
        },
        addProjectMultiParams: function(name, langs){
        	var proj = {
        		name: name,
        		lang: langs
        	}
        	this.addProjectGetSet(proj);
        }
    }

    var obj_map_1 = {
    	actionsMap : {
	    	addProject_get_set: 'addProjectGetSet',
	    	addProject_use: 'addProjectUse',
	    	addProject_setChanged: 'addProjectSetChanged',	    	
	    	addProject_rollback: 'addProjectRollback',
	    	addProject_multi_params: 'addProjectMultiParams',
	    }
	}


	return {
		obj_1: $.extend({},obj_data_1,obj_funcs_1,obj_map_1),
		obj_data_1: obj_data_1,
		obj_funcs_1: obj_funcs_1,
		obj_map_1: obj_map_1,
	
	}

}

function runAsync(func){
	setTimeout(func,0);
}


QUnit.test( "Store init", function( assert ) {
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

	var asynchCount = 5;
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
    	console.log('finish: addProject_get_set 1'); 	
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
    	console.log('finish: addProject_get_set 2'); 	
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
    	console.log('finish: addProject_use')  	
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
	setTimeout(function(){
		emitterImpl.emit('Mike2.addProject_use',{   
	            name: 'Nacepin',
	            lang: ['none']
	    })
	},0);

	
    assert.equal(
    	mikeStore.getState()._stateVersion,
    	2,
    	'an action was called but the last Stable state must be with old data/version'
    )
    dones[4]();
	

	//test 5+

	//wait last to end to start new test
	emitterImpl.once('Mike2.updated',function(res){
		console.log('finish: upper',res); 
	
	    emitterImpl.once('Mike2.updated',function(res){ 
	    	console.log('finish: addProject with get set - multi params pass - chained',res); 
		  	assert.deepEqual(
		  		mikeStore.getState(),
		  		$.extend(
		  		{
		  			_stateVersion: 4,
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
				        },
				        {
				        	name: 'SinglePageApp',
	            			lang: ['javascript']
				        }
			        ]		       
			    },init.obj_map_1),
			    'addProject with get set - multi params pass - chained'
		  	)
		  	dones[5]()
		})

		//debugger;
		emitterImpl.emit('Mike2.addProject_multi_params','SinglePageApp',['javascript'])

		//test 6-7

		console.warn('FIXME:','I think next code must be working but it fails. Hint check what event triggers the Mike2.updated') 
		/*emitterImpl.once('Mike2.done',function(result){ 
			console.log('finish: addProject with get set - rollbacked',result); 
			assert.equal(result.status,'rollbacked','Catched Emited rollbacked');
			dones[6]();

		  	assert.deepEqual(
		  		mikeStore.getState(),
		  		$.extend(
		  		{
		  			_stateVersion: 4,
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
				        },
				        {
				        	name: 'SinglePageApp',
	            			lang: ['javascript']
				        }
			        ]		       
			    },init.obj_map_1),
			    'addProject with get set - rollbacked'
		  	)
		  	dones[7]()
		})

		//debugger;
		emitterImpl.emit('Mike2.addProject_rollback',{   
            name: 'MyDeepSecret',
            lang: ['human','unspeakable']
	    })


		//test 8-9

		emitterImpl.once('Mike2.addProject_setChanged.done',function(result){
			console.log('finish: addProject_setChanged',result) 
			assert.equal(result.status,'updated','Catched Emited updated on specific event');
			dones[8]();

		  	assert.deepEqual(
		  		mikeStore.getState(),
		  		$.extend(
		  		{
		  			_stateVersion: 5,
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
				        },
				        {
				        	name: 'SinglePageApp',
	            			lang: ['javascript']
				        },
				        {
				        	name: 'YetAnotherUnfinishedProject',
            				lang: ['js','php']
				        }
			        ]		       
			    },init.obj_map_1),
			    'addProject with setChanged'
		  	)
		  	dones[9]()
		})

		//debugger;
		emitterImpl.emit('Mike2.addProject_setChanged',{   
            name: 'YetAnotherUnfinishedProject',
            lang: ['js','php']
	    })
*/


	})	


});


QUnit.test('Store more modifications',function(assert){	

	var asynchCount = 5;
	//prepare async
	var dones = [];	
	assert.expect(asynchCount);
	for(var d=1; d<=asynchCount; d++){
		dones[d] = assert.async()
	}


	var init = startUp();
	//debugger;
  	var mikeStore = StoreCreator('Mike3.',init.obj_1);

  	emitterImpl.once('Mike3.updated',function(res){ 
    	console.log('finish: addProject with get set - multi params pass - chained',res); 
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
			        	name: 'SinglePageApp',
            			lang: ['javascript']
			        }
		        ]		       
		    },init.obj_map_1),
		    'addProject with get set - multi params pass - chained - success update before rollback test'
	  	)
	  	dones[1]()
	})

	//debugger;
	emitterImpl.emit('Mike3.addProject_multi_params','SinglePageApp',['javascript'])



  	emitterImpl.once('Mike3.done',function(result){ 
		console.log('finish: addProject with get set - rollbacked',result); 
		assert.equal(result.status,'rollbacked','Catched Emited rollbacked');
		dones[2]();

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
			        	name: 'SinglePageApp',
            			lang: ['javascript']
			        }
		        ]		       
		    },init.obj_map_1),
		    'addProject with get set - rollbacked'
	  	)
	  	dones[3]()
	})

	//debugger;
	emitterImpl.emit('Mike3.addProject_rollback',{   
        name: 'MyDeepSecret',
        lang: ['human','unspeakable']
    })


	//test 8-9

	emitterImpl.once('Mike3.addProject_setChanged.done',function(result){
		console.log('finish: addProject_setChanged',result) 
		assert.equal(result.status,'updated','Catched Emited updated on specific event');
		dones[4]();

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
			        	name: 'SinglePageApp',
            			lang: ['javascript']
			        },
			        {
			        	name: 'YetAnotherUnfinishedProject',
        				lang: ['js','php']
			        }
		        ]		       
		    },init.obj_map_1),
		    'addProject with setChanged'
	  	)
	  	dones[5]()
	})

	//debugger;
	emitterImpl.emit('Mike3.addProject_setChanged',{   
        name: 'YetAnotherUnfinishedProject',
        lang: ['js','php']
	})




})