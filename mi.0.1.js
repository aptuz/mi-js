
var mi = (function () {
    'use strict';
    var resources = {
        'filters' : { },
        'constants' : { },
        'factory' : { },
        '$me' : { },
        'mode' : null,
        'root' : '/',
        'routes' : [],
        'controller' : { },
        'controller_dependancy':{ },
        'config': function(options) {
            resources.mode = options && options.mode && options.mode == 'history' 
                        && !!(history.pushState) ? 'history' : 'hash';
            resources.root = options && options.root ? '/' + resources.clearSlashes(options.root) + '/' : '/';
        },
        'getFragment': function() {
            var fragment = '';
            if(resources.mode === 'history') {
                fragment = resources.clearSlashes(decodeURI(location.pathname + location.search));
                fragment = fragment.replace(/\?(.*)$/, '');
                fragment = resources.root != '/' ? fragment.replace(resources.root, '') : fragment;
            } else {
                var match = window.location.href.match(/#(.*)$/);
                fragment = match ? match[1] : '';
            }
            return resources.clearSlashes(fragment);
        },
        'clearSlashes': function(path) {
            return path.toString().replace(/\/$/, '').replace(/^\//, '');
        },
        'check': function (hash) {
            var reg, keys, match, routeParams;
            for (var i = 0, max = resources.routes.length; i < max; i++ ) {
                routeParams = {}
                keys = resources.clearSlashes(resources.routes[i].path).match(/:([^\/]+)/g);
                match = hash.match(new RegExp(resources.clearSlashes(resources.routes[i].path).replace(/:([^\/]+)/g, "([^\/]*)")));
                console.log(resources.routes[i].path);
                if (match) {
                    match.shift();
                    match.forEach(function (value, i) {
                        routeParams[keys[i].replace(":", "")] = value;
                    });
                    var LDependancy = api.loadDependancies(resources.controller_dependancy[resources.routes[i].handler]);
                        LDependancy.push(routeParams);
                        resources.controller[resources.routes[i].handler].apply(this, LDependancy);
                        break;
                }
                else{
                    if(resources.clearSlashes(resources.routes[i].path) == hash){
                        //load dependency and call
                        var LDependancy = api.loadDependancies(resources.controller_dependancy[resources.routes[i].handler]);
                        resources.controller[resources.routes[i].handler].apply(this, LDependancy);
                        break;
                    }
                }
            }
        },
        
        'listen': function() {
            var current = "/";
            var fn = function() {
                // console.log("..");
                if(current !== resources.getFragment()) {
                    current = resources.getFragment();
                    resources.check(current);
                }
            }
            if(resources.mode == 'hash'){
                clearInterval(this.interval);
                this.interval = setInterval(fn, 50);
            }
            if(resources.mode == 'history'){
                this.interval = setTimeout(fn, 50);    
            }
        },
    }, api = {
        'filters': function (key, val) {
            resources.filters[key] = val;
        },
        'factory': function (key, arrayArg) {
            var last_index = arrayArg.length-1;
            var dependancies = arrayArg.slice(0, -1);
            if (typeof arrayArg[last_index] === "function") {
                console.log("-"+api.loadDependancies(dependancies));
                resources.factory[key] = arrayArg[last_index].apply(this, api.loadDependancies(dependancies)); // arrayArg[last_index];
            } else {
                console.log("Nan");
            }
        },
        'routes' :  function(route, controller){
            var temp = {'path':route, 'handler':controller };
            resources.routes.push(temp);
        },
        'controller' : function(controller, handler){
            var last_index = handler.length-1;
            var dependancies = handler.slice(0, -1);
            if (typeof handler[last_index] === "function") {
                resources.controller[controller] = handler[last_index];
                resources.controller_dependancy[controller] =  dependancies;
            } else {
                console.log("Nan");
            }
        },
        'loadDependancies' : function(arrayArg){
            var dependancy = [], iter;
            for (iter = 0; iter < arrayArg.length; iter += 1) {
                if (typeof arrayArg[iter] === "string") {
                    //look in modules
                    if (resources.hasOwnProperty(arrayArg[iter])){
                        dependancy.push(api.loadModule(arrayArg[iter]));
                    } else {
                    //look in factory
                    if (resources.factory.hasOwnProperty(arrayArg[iter])) {
                        dependancy.push(api.loadDependancy(arrayArg[iter]));
                    } else {
                            //look in constants
                            if (resources.constants.hasOwnProperty(arrayArg[iter])) {
                                dependancy.push(api.loadConstant(arrayArg[iter]));
                            } else {
                                //if it is $me scope
                                if (arrayArg[iter] === "$mi") {
                                    dependancy.push({});
                                } else {
                                    console.log("Error: " + arrayArg[iter] + " is not Found in constants and Factories");
                                }
                            }
                        }
                    }
                } 
            }
            return dependancy;
        },
        
        'loadModule': function (key) {
            return resources[key];
        },

        'loadDependancy': function (key) {
            return resources.factory[key];
        },

        'loadConstant': function (key) {
            return resources.constants[key];
        },

        'constants': function (key, val) {
            resources.constants[key] = val(); 
        },

        'module': function(key, arrayArg){
            if(key.startsWith('mi')){
                var last_index = arrayArg.length-1;
                var dependancies = arrayArg.slice(0, -1);
                if (typeof arrayArg[last_index] === "function") {
                    console.log("-"+api.loadDependancies(dependancies));
                    resources[key.substring(3, key.length)] = arrayArg[last_index].apply(this, api.loadDependancies(dependancies)); // arrayArg[last_index];
                } else {
                    console.log("Nan");
                }
            }
            else{
                console.log("Error in module "+key+": should starts with mi");
            }
        }
    };

        
    function filters() {
        api.filters(arguments[0], arguments[1]);
    }

    function factory() {
        api.factory(arguments[0], arguments[1]);
    }

    function constants() {
        api.constants(arguments[0], arguments[1]);
    }

    function routes(){
        api.routes(arguments[0], arguments[1]);
    }

    function controller(){
        api.controller(arguments[0], arguments[1]);
    }

    function module(){
        api.module(arguments[0], arguments[1]);
    }

    function initiate(){
        resources.config({mode :'history'});
        resources.listen();

        if (typeof String.prototype.startsWith != 'function') {
          // see below for better implementation!
          String.prototype.startsWith = function (str){
            return this.indexOf(str) == 0;
          };
        }
    }

    initiate();

    return {
        'filters': filters,
        'factory': factory,
        'routes': routes,
        'controller': controller,
        'constants': constants,
        'module': module
    }
});



