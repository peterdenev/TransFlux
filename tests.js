
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
        addProjectGetSet: function(proj){
        	//debugger;
        	var projects = this.get('projects');
        	projects.push(proj);
        	this.set('projects',projects);
        	this.emitCommit();        	
        },
        addProjectUse: function(proj){
        	this.use('projects',function(projects){
        		projects.push(proj);
        		return projects;
        	})
        	his.emitCommit();
        },
        addProjectChain: function(proj){
        	this.addProjectGetSet(data);
        },
        addProjectRollback: function(proj){
        	var projects = this.get('projects');
        	projects.push(proj);
        	this.set('projects',projects);
        	this.emitRollback(); 
        },

        actionsMap: {
        	addProject_get_set: 'addProjectGetSet',
        	addProject_use: 'addProjectUse',
        	addProject_chain: 'addProjectChain',
        	addProject_rollback: 'addProjectRollback',
        }
    }


	return {
		obj_data_1: obj_data_1,
		//mikeStore: mikeStore
	}

}

function removeFuncs(obj){
	for(var i in obj){
		if(typeof obj[i] == 'function'){
			delete obj[i];
		}
	}
	return obj;
}

QUnit.test( "STORE init", function( assert ) {
	var init = startUp();	

  	var mikeStore = StoreCreator('Mike.',init.obj_data_1);

  	assert.ok(typeof mikeStore == 'object','Store is an object')
  	//assert.ok(mikeStore,'Store is instqance of Store')
  	assert.ok(typeof mikeStore.getState == 'function', 'Store have a getState function');

  	//assert.equal(mikeStore.getState(), removeFuncs($.extend(true,{},init.obj_data_1)), 'State is equal to all non func data from store');
  	assert.deepEqual(
  		mikeStore.getState(), 
  		removeFuncs($.extend(true,{_stateVersion:0},init.obj_data_1)), 
  		'State is deep equal to all non func data from store + the version num'
  	);

})


QUnit.test('Store modifications',function(assert){
	assert.expect( 2);
	var done1 = assert.async()
	var done2 = assert.async()

	var init = startUp();
	//debugger;
  	var mikeStore = StoreCreator('Mike2.',init.obj_data_1);
 	
    FunFire.once('Mike2.updated',function(event){    	
	  	assert.deepEqual(
	  		mikeStore.getState(),
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
		        actionsMap: {
		        	addProject_get_set: 'addProjectGetSet',
		        	addProject_use: 'addProjectUse',
		        	addProject_chain: 'addProjectChain',
		        	addProject_rollback: 'addProjectRollback',
		        }
		    },
		    'addProject with Get and Set - commit'
	  	)
	  	done1()
	},window)

	//debugger;
	FunFire.emit('Mike2.addProject_get_set',window,{   
            name: 'TransFlux',
            lang: ['js']
    })

	//test 2

    FunFire.once('Mike2.updated',function(event){    	
	  	assert.deepEqual(
	  		mikeStore.getState(),
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
		        ],
		        actionsMap: {
		        	addProject_get_set: 'addProjectGetSet',
		        	addProject_use: 'addProjectUse',
		        	addProject_chain: 'addProjectChain',
		        	addProject_rollback: 'addProjectRollback',
		        }
		    },
		    'addProject with Get and Set again to version 2'
	  	)
	  	done2()
	},window)

	//debugger;
	FunFire.emit('Mike2.addProject_get_set',window,{   
            name: 'SuperCoolProj',
            lang: ['brainfuck']
    })


});