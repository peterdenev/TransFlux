function startUp(){
	//throw 'Here or not';

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
        },
        updateInfo: function(info){
        	this.set('info',info);
        	this.emitCommit();
        },
        updateInfoAge: function(age){
        	this.set('info.age',age);
        	this.emitCommit();
        },
        updateInfoMonth: function(month){
        	this.set('info.month',month);
        	this.emitCommit();
        },
        updateName: function(name){
        	this.set('name',name);
        	this.emitCommit();
        },
        updateInfoAgeMonth_each: function(age, month){
        	this.set('info.age',age);
        	this.set('info.month',month);
        	this.emitCommit();
        },
        updateInfoAgeMonth_group: function(age, month){
        	var t_info = this.get('info');
        	t_info.age = age;
        	t_info.month = month;
        	this.set('info',t_info);        	
        	this.emitCommit();
        }        

    }

    var obj_map_1 = {
    	actionsMap : {
	    	addProject_get_set: 'addProjectGetSet',
	    	addProject_use: 'addProjectUse',
	    	addProject_setChanged: 'addProjectSetChanged',	    	
	    	addProject_rollback: 'addProjectRollback',
	    	addProject_multi_params: 'addProjectMultiParams',
	    	updateInfo_lock_info: {
	    		func: 'updateInfo',
	    		locks: ['info']
	    	},
	    	updateInfoAge_lock_age:{
	    		func: 'updateInfoAge',
	    		locks: ['info.age']
	    	},
	    	updateInfoMonth_lock_month:{
	    		func: 'updateInfoMonth',
	    		locks: ['info.month']
	    	},
	    	updateName_lock_name:{
	    		func: 'updateName',
	    		locks: ['name']
	    	},
	    	updateInfoAgeMonth_each_lock_age_month:{
	    		func: 'updateInfoAgeMonth_each',
	    		locks: ['info.age','info.month']
	    	},
	    	updateInfoAgeMonth_group_lock_age_month:{
	    		func: 'updateInfoAgeMonth_group',
	    		locks: ['info.age','info.month']
	    	},	    	
	    	updateInfoAgeMonth_each_lock_age:{
	    		func: 'updateInfoAgeMonth_each',
	    		locks: ['info.age']
	    	},
	    	updateInfoAgeMonth_each_lock_age:{
	    		func: 'updateInfoAgeMonth_group',
	    		locks: ['info.age']
	    	},

	    },	    
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

  	var mikeStore = TransFlux.createStore('Mike',init.obj_1);

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


QUnit.test('Store single modifications',function(assert){	

	var asynchCount = 1;
	//prepare async
	var dones = [];	
	assert.expect(asynchCount);
	for(var d=1; d<=asynchCount; d++){
		dones[d] = assert.async()
	}

	var init = startUp();
	//debugger;
  	var mikeStore = TransFlux.createStore('Mike0',init.obj_1);
 	
    emitterImpl.once('Mike0.updated',function(){   
    	//console.log('finish: addProject_get_set 1'); 	
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
	emitterImpl.emit('Mike0.addProject_get_set',{   
            name: 'TransFlux',
            lang: ['js']
    })

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
  	var mikeStore = TransFlux.createStore('Mike2',init.obj_1);

  	var passed = 0;

	var expects = []
 	
   /* emitterImpl.once('Mike2.updated',function(){   */
   	expects.push(function(res){
    	//console.log('finish: addProject_get_set 1'); 	
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

	

	//test 2

    /*emitterImpl.once('Mike2.updated',function(){     */
   	expects.push(function(res){
    	//console.log('finish: addProject_get_set 2'); 	
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


    //test 3

  /*  emitterImpl.once('Mike2.updated',function(){  
  	 */
   	expects.push(function(res){
    	//console.log('finish: addProject_use')  	
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
			        	name: 'SinglePageApp',
            			lang: ['javascript']
				    }
		        ]		       
		    },init.obj_map_1),
		    'addProject with "use"'
	  	)
	  	dones[3]()
	})

	

	

	//test 5+

	//wait last to end to start new test
	
	
	   /* emitterImpl.once('Mike2.updated',function(res){ */
   		expects.push(function(res){ 
	    	//console.log('finish: addProject with get set - multi params pass - chained',res); 
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
				        	name: 'SinglePageApp',
	            			lang: ['javascript']
				        },	
				        {
				        	name: 'Nacepin',
	            			lang: ['none']
				        }				        
			        ]		       
			    },init.obj_map_1),
			    'addProject with get set - multi params pass - chained'
		  	)
		  	dones[5]()
		})



		//test 6-7

		//console.warn('FIXME:','I think next code must be working but it fails. Hint check what event triggers the Mike2.updated') 
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


	//})	
	
	emitterImpl.on('Mike2.updated',function(res){ 
    	//console.log('finish: addProject with get set - multi params pass - chained - ',res); 
    	var current_in = passed;
    	passed++;
   		expects[current_in](res);
	  	/*assert.deepEqual(
	  		mikeStore.getState(),
	  		expects[current_in],
	  		'multiple tests - index '+current_in
		    //'addProject with get set - multi params pass - chained - '+current_in+' - if two normal emit after emit (same func) -> updated event comes FIFO  and "on" can be defined after emits'
	  	)*/
	  	//dones[current_in+1]()
	})

	//debugger;
	emitterImpl.emit('Mike2.addProject_get_set',{   
            name: 'TransFlux',
            lang: ['js']
    })

	//debugger;
	emitterImpl.emit('Mike2.addProject_get_set',{   
            name: 'SuperCoolProj',
            lang: ['brainfuck']
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

	//debugger;
	emitterImpl.emit('Mike2.addProject_multi_params','SinglePageApp',['javascript'])


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
  	var mikeStore = TransFlux.createStore('Mike3',init.obj_1);

  	var passed = 0;

	var expects = []
 	
   

  	//emitterImpl.once('Mike3.updated',function(res){ 
  	expects.push(function(res){
    	//console.log('finish: addProject with get set - multi params pass - chained',res); 
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

	

  	//emitterImpl.once('Mike3.done',function(result){ 
  	expects.push(function(result){
		//console.log('finish: addProject with get set - rollbacked',result); 
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



	//test 8-9

	//emitterImpl.once('Mike3.addProject_setChanged.done',function(result){
	expects.push(function(result){
		//console.log('finish: addProject_setChanged',result) 
		assert.equal(result.status,'updated','Catched Emited updated on specific event - FIXME the event must be "Mike3.addProject_setChanged.done", but it is Mike3.updated');
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

	

	emitterImpl.on('Mike3.done',function(res){ 
    	//console.log('finish: addProject with get set - multi params pass - chained - ',res); 
    	var current_in = passed;
    	passed++;
   		expects[current_in](res);	  	
	})


	//debugger;
	emitterImpl.emit('Mike3.addProject_multi_params','SinglePageApp',['javascript'])

	//debugger;
	emitterImpl.emit('Mike3.addProject_rollback',{   
        name: 'MyDeepSecret',
        lang: ['human','unspeakable']
    })

	//debugger;
	emitterImpl.emit('Mike3.addProject_setChanged',{   
        name: 'YetAnotherUnfinishedProject',
        lang: ['js','php']
	})



})


QUnit.test('Store parallel modifications',function(assert){	

	var asynchCount = 2;
	//prepare async
	var dones = [];	
	assert.expect(asynchCount);
	for(var d=1; d<=asynchCount; d++){
		dones[d] = assert.async()
	}


	var init = startUp();
	//debugger;
  	var mikeStore = TransFlux.createStore('Mike4',init.obj_1);
  	

	//debugger;
	setTimeout(function(){
		emitterImpl.emit('Mike4.addProject_multi_params','App1',['js'])
	},0);

	setTimeout(function(){
		emitterImpl.emit('Mike4.addProject_multi_params','App2',['php'])
	},0);

	var passed = 0;

	var expects = [
		$.extend({
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
		        	name: 'App1',
        			lang: ['js']
		        }
	        ]		       
		},init.obj_map_1),


		$.extend({
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
		        	name: 'App1',
        			lang: ['js']
		        },	           
		        {
		        	name: 'App2',
        			lang: ['php']
		        }
	        ]		       
		},init.obj_map_1),
	]

	

	emitterImpl.on('Mike4.updated',function(res){		 
    	//console.log('finish: addProject with get set - multi params pass - chained - ',res); 
    	var current_in = passed;
    	passed++;
	  	assert.deepEqual(
	  		mikeStore.getState(),
	  		expects[current_in],
		    'addProject with get set - multi params pass - chained - '+current_in+' - if both emits are with delay -> the result will be FIFO and "on" can be define after emits'
	  	)
	  	dones[current_in+1]()
	})



})

QUnit.test('Store parallel 2 modifications',function(assert){	

	var asynchCount = 2;
	//prepare async
	var dones = [];	
	assert.expect(asynchCount);
	for(var d=1; d<=asynchCount; d++){
		dones[d] = assert.async()
	}


	var init = startUp();
	//debugger;
  	var mikeStore = TransFlux.createStore('Mike5',init.obj_1);

  	var passed = 0;

	var expects = [
		$.extend({
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
		        	name: 'App2',
        			lang: ['php']
		        }
	        ]		       
		},init.obj_map_1),


		$.extend({
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
		        	name: 'App2',
        			lang: ['php']
		        },
		        {
		        	name: 'App1',
        			lang: ['js']
		        }
	        ]		       
		},init.obj_map_1),
	]
	

	emitterImpl.on('Mike5.updated',function(res){ 
    	//console.log('finish: addProject with get set - multi params pass - chained - ',res); 
    	var current_in = passed;
    	passed++;
	  	assert.deepEqual(
	  		mikeStore.getState(),
	  		expects[current_in],
		    'addProject with get set - multi params pass - chained - '+current_in+' - if first emit was after delay -> second emit will be finished first'
	  	)
	  	dones[current_in+1]()
	})
  	

	//debugger;
	setTimeout(function(){
		emitterImpl.emit('Mike5.addProject_multi_params','App1',['js'])
	},0);

	//setTimeout(function(){
		emitterImpl.emit('Mike5.addProject_multi_params','App2',['php'])
	//},0);

})


QUnit.test('Store parallel 3 modifications',function(assert){	

	var asynchCount = 2;
	//prepare async
	var dones = [];	
	assert.expect(asynchCount);
	for(var d=1; d<=asynchCount; d++){
		dones[d] = assert.async()
	}


	var init = startUp();
	//debugger;
  	var mikeStore = TransFlux.createStore('Mike6',init.obj_1);

  	var passed = 0;

	var expects = [
		$.extend({
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
		        	name: 'App1',
        			lang: ['js']
		        }
	        ]		       
		},init.obj_map_1),


		$.extend({
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
		        	name: 'App1',
        			lang: ['js']
		        },
		        {
		        	name: 'App2',
        			lang: ['php']
		        }
	        ]		       
		},init.obj_map_1),
	]
	

	emitterImpl.on('Mike6.updated',function(res){ 
    	//console.log('finish: addProject with get set - multi params pass - chained - ',res); 
    	var current_in = passed;
    	passed++;
	  	assert.deepEqual(
	  		mikeStore.getState(),
	  		expects[current_in],
		    'addProject with get set - multi params pass - chained - '+current_in+' - no mather if a second emit was after delay -> still FIFO'
	  	)
	  	dones[current_in+1]()
	})
  	

	//debugger;
	//setTimeout(function(){
		emitterImpl.emit('Mike6.addProject_multi_params','App1',['js'])
	//},0);

	setTimeout(function(){
		emitterImpl.emit('Mike6.addProject_multi_params','App2',['php'])
	},0);




})


QUnit.test('Store parallel 4 modifications',function(assert){	

	var asynchCount = 2;
	//prepare async
	var dones = [];	
	assert.expect(asynchCount);
	for(var d=1; d<=asynchCount; d++){
		dones[d] = assert.async()
	}


	var init = startUp();
	//debugger;
  	var mikeStore = TransFlux.createStore('Mike7',init.obj_1);

  	var passed = 0;

	var expects = [
		$.extend({
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
		        	name: 'App1',
        			lang: ['js']
		        }
	        ]		       
		},init.obj_map_1),


		$.extend({
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
		        	name: 'App1',
        			lang: ['js']
		        },
		        {
		        	name: 'App2',
        			lang: ['php']
		        }
	        ]		       
		},init.obj_map_1),
	]
	

	emitterImpl.on('Mike7.updated',function(res){ 
    	//console.log('finish: addProject with get set - multi params pass - chained - ',res); 
    	var current_in = passed;
    	passed++;
	  	assert.deepEqual(
	  		mikeStore.getState(),
	  		expects[current_in],
		    'addProject with get set - multi params pass - chained - '+current_in+' - if two normal emit after emit (same func) -> updated event comes FIFO'
	  	)
	  	dones[current_in+1]()
	})
  	

	//debugger;
	//setTimeout(function(){
		emitterImpl.emit('Mike7.addProject_multi_params','App1',['js'])
	//},0);

	//setTimeout(function(){
		emitterImpl.emit('Mike7.addProject_multi_params','App2',['php'])
	//},0);

})

QUnit.test('Store parallel 5 modifications',function(assert){	

	var asynchCount = 2;
	//prepare async
	var dones = [];	
	assert.expect(asynchCount);
	for(var d=1; d<=asynchCount; d++){
		dones[d] = assert.async()
	}


	var init = startUp();
	//debugger;
  	var mikeStore = TransFlux.createStore('Mike8',init.obj_1);

  	var passed = 0;

	var expects = [
		$.extend({
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
		        	name: 'App1',
        			lang: ['js']
		        }
	        ]		       
		},init.obj_map_1),


		$.extend({
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
		        	name: 'App1',
        			lang: ['js']
		        },
		        {
		        	name: 'App2',
        			lang: ['php']
		        }
	        ]		       
		},init.obj_map_1),
	]
	

	
  	


	emitterImpl.on('Mike8.updated',function(res){ 
    	//console.log('finish: addProject with get set - multi params pass - chained - ',res); 
    	var current_in = passed;
    	passed++;
	  	assert.deepEqual(
	  		mikeStore.getState(),
	  		expects[current_in],
		    'addProject with get set - multi params pass - chained - '+current_in+' - if two normal emit after emit (same func) -> updated event comes FIFO  and "on" can be defined after emits'
	  	)
	  	dones[current_in+1]()
	})


	//debugger;
	//setTimeout(function(){
		emitterImpl.emit('Mike8.addProject_multi_params','App1',['js'])
	//},0);

	//setTimeout(function(){
		emitterImpl.emit('Mike8.addProject_multi_params','App2',['php'])
	//},0);

})

