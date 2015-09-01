var Store = function(data) {
    for(var i in data){
        this[i] = data[i]; // or copy? or deep?
    }   
}
 
Store.prototype = {
 
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
        return this; // FIXME
    }

}

var StoreCreator = function(data_object){
    var newStore = new Store(data_object);
    //var state = 
    //listen for ons and other settings
    return newStore;
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
 
 
function run() {
    var mike = new Store(["Mike Foley", "1112 Main", "Dallas", "TX"]);
    var john = new Store(["John Wang", "48th Street", "San Jose", "CA"]);
    var caretaker = new CareTaker();
 
    // save state
 
    caretaker.add('mikeState', mike.hydrate());
    caretaker.add('johnState', john.hydrate());
 
    // mess up their names
 
    mike[0] = "King Kong";
    john[0] = "Superman";
 
    // restore original state
 
    mike.dehydrate(caretaker.get('mikeState'));
    john.dehydrate(caretaker.get('johnState'));
 
    log.add(mike[0]);
    log.add(john[0]);
 
    //log.show();

    var mikeStore = StoreCreator({
        name: 'pe6o',
        info: {
            age: 27,
            month: 'january',
            address: {
                city: 'varna',
                street: 'Hadji Dimitar',
                number: 51
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
        ]
    })

    console.log(mikeStore);

    mikeStore


}




