
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
        onGetInfo: function(){
        	return this.info;
        	//return this.get('info');
        }
    }


	//var mikeStore = StoreCreator(obj_data_1);

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

QUnit.test( "STORE TESTs", function( assert ) {
	var init = startUp();
	/*var io1 = {
		name: 'ivo'
	}
	var o1 = {
		id: 1,
		data: io1
	}
	var o2 = {
		id: 2,
		data: io1
	}
	var o1e = $.extend(true,{},o1);

	console.log('before',o1.data,o1e.data);

	assert.equal(o1.data, o1e.data,'before o1.data mod');

	o1.data.name = 'john';

	console.log('after',o1.data,o1e.data);

	assert.equal(o1.data, o1e.data,'after o1.data mod');
*/
	//assert.deepEqual({v:'a'},{v:'a'},'Two dif objects');
  	//assert.deepEqual(init.obj_data_1 , init.mikeStore ,"Deep equal objects!" );


  	var mikeStore = StoreCreator(init.obj_data_1);

  	assert.ok(typeof mikeStore == 'object','Store is an object')
  	//assert.ok(mikeStore,'Store is instqance of Store')
  	assert.ok(typeof mikeStore.getState == 'function', 'Store have a getState function');

  	//assert.equal(mikeStore.getState(), removeFuncs($.extend(true,{},init.obj_data_1)), 'State is equal to all non func data from store');
  	assert.deepEqual(mikeStore.getState(), removeFuncs($.extend(true,{},init.obj_data_1)), 'State is deep equal to all non func data from store');




});