/*
 *  home.js
 *
 *  David Janes
 *  IOTDB
 *  2014-06-10
 *
 *  Present a home interface
 */

"use strict"

var iotdb = require("iotdb")
var _ = iotdb.helpers
var express = require('express');
var path = require("path")
var swig = require("swig")
var node_fs = require("fs")
var mqtt = require("mqtt")

var home_mqtt = require("./home_mqtt")

/*
 *  Do processing on things to make
 *  the HTML / Swig part simpler
 */
var precook_things = function(all_things) {
    for (var ti = 0; ti < all_things.length; ti++) {
        var thing = all_things[ti];
        if (thing.__precooked) {
            continue
        }
        // thing.__precooked = true

        var meta_thing = thing.meta_thing()
        // console.log("HERE:A", meta_thing)
        var meta_thing = meta_thing.dictionary()
        for (var key in meta_thing) {
            var value = meta_thing[key]
            var key_slug = iotdb.helpers.slugify(key)
            thing[key_slug] = value
        }

        precook_attributes(thing);

    }
}

/*
 *  Turn
 */
var precook_attributes = function(thing) {
    thing.atds = []

    var _scrub = function(v) {
        if (!v) {
            return ""
        } else {
            return v.replace(/.*#/, '')
        }
    }


    /*
     *  Preprocess attributes
     *  - compact everything
     *  - find out if control or reading attibute
     */
    var catd = []
    var tats = thing.attributes()
    for (var tax in tats) {
        var tat = tats[tax]
        var cat = _.compact(tat)
        var cid = _scrub(_.ld_get_first(cat, "@id", ""))

        if (_.ld_get_list(cat, 'iot:role') === undefined) {
            cat._control = cid
            cat._reading = cid
        } 
        if (_.ld_contains(cat, 'iot:role', 'iot:role-control')) {
            cat._control = cid
        }
        if (_.ld_contains(cat, 'iot:role', 'iot:role-reading')) {
            cat._reading = cid
        }

        cat._code = tat.get_code()

        var name = _.ld_get_first(cat, 'iot:name')
        cat._name = name ? name : tat.get_code()

        catd[cid] = cat
    }

    /**
     *  Group related control/reading attributes together
     */
    for (var cid in catd) {
        var cat = catd[cid]
        if (cat._use === undefined) {
            cat._use = true
        }

        var rids = _.ld_get_list(cat, "iot:related-role", [])
        for (var rix in rids) {
            var rid = _scrub(rids[rix])
            var rat = catd[rid]
            if (rat === undefined) {
                continue
            }

            if (rat._use === undefined) {
                rat._use = false
            }
            if (cat._control && !rat._control) {
                rat._control = cat._control
            }
            if (cat._reading && !rat._reading) {
                rat._reading = cat._reading
            }
        }
    }

    /**
     *  Make those attributes more friendly for JavaScript
     */
    for (var cid in catd) {
        var cat = catd[cid]
        if (cat._use === false) {
            continue
        } else {
            delete cat['_use']
        }

        var atd = {}
        atd._thing_id = thing.thing_id()

        for (var key in cat) {
            var value = cat[key]
            if (key.match(/^_/)) {
                atd[key] = value
            }
        }

        var minimum = _.ld_get_first(cat, 'iot-js:minimum', null)
        if (minimum != null) {
            atd._minimum = minimum
        }

        var maximum = _.ld_get_first(cat, 'iot-js:maximum', null)
        if (maximum != null) {
            atd._maximum = maximum
        }

        var unit = _.ld_get_first(cat, 'iot:unit')
        if (maximum) {
            atd._unit = unit
        }

        var purpose = _.ld_get_first(cat, 'iot:purpose')
        if (purpose) {
            atd._purpose = purpose
        }

        atd._type = null
        if (!atd._type) {
            var jformats = _.ld_get_list(cat, 'iot-js:format', [])
            if (jformats.length) {
                atd._type = jformats[0]
            }
        }
        if (!atd._type) {
            var jtypes = _.ld_get_list(cat, 'iot-js:type', [])
            if (jtypes.length) {
                var ptypes = [
                    "iot-js:boolean",
                    "iot-js:integer",
                    "iot-js:number",
                    "iot-js:string"
                ]
                for (var pi in ptypes) {
                    var ptype = ptypes[pi]
                    if (jtypes.indexOf(ptype) > -1) {
                        atd._type = ptype
                        break
                    }
                }
            }
        }
        if (!atd._type) {
            atd._type = "iot-js:null"
        }

        thing.atds.push(atd)
    }
}

/*
 *  Group Things by their place_iri
 *
 *  <pre>
 *  {
 *      place_iri_1 : [ thing1, thing2 ],
 *      place_iri_2 : [ thing3 ],
 *      "" : [ thing_without_place ]
 *  }
 *  </pre>
 */
var things_by_place_iri = function(all_things) {
    var pthingsd = {}
    for (var ti = 0; ti < all_things.length; ti++) {
        var thing = all_things[ti];

        var place_iri = thing.iot_place ? thing.iot_place : ""
        var pthings = pthingsd[place_iri]
        if (pthings === undefined) {
            pthings = []
            pthingsd[place_iri] = pthings
        }

        pthings.push(thing)
    }

    return pthingsd
}

var make_api_room = function(paramd) {
    if (paramd.root) {
        return "/api/rooms"
    }
    if (paramd.thing) {
        paramd.place_iri = paramd.thing.place_iri()
    }
    if (paramd.place_iri) {
        return "/api/rooms/" + path.basename(paramd.place_iri)
    }

    return null
}

var make_api_thing = function(paramd) {
    if (paramd.root) {
        return "/api/things"
    }
    if (paramd.thing) {
        paramd.thing_id = paramd.thing.thing_id()
    }
    if (paramd.thing_id) {
        var api_thing = "/api/things/" + paramd.thing_id
        if (paramd.attributes) {
            return api_thing + "/attributes"
        } else if (paramd.state) {
            return api_thing + "/state"
        } else {
            return api_thing
        }
    }
}

/**
 */
var make_rooms = function() {
    var all_things = iot.things()
    precook_things(all_things)

    var grouped_thingd = things_by_place_iri(all_things)

    var all_places = iot.places()
    var grouped_placed = iotdb.helpers.places_hierarchy(all_places)

    var rooms = []

    for (var nlocation in grouped_placed)  {
        var pfloord = grouped_placed[nlocation]
        var nfloors = _.keys(pfloord)
        nfloors.sort()

        for (var nfloorx in nfloors)  {
            var nfloor = nfloors[nfloorx]
            var proomd = pfloord[nfloor]
            var nrooms = _.keys(proomd)
            nrooms.sort()

            for (var nroomx in nrooms) {
                var nroom = nrooms[nroomx]
                var place_iri = proomd[nroom]
                // console.log(nlocation, "/", nfloor, "/", nroom, ":", place_iri)

                var room_things = grouped_thingd[place_iri]
                // console.log(room_things)
                rooms.push({
                    "location": nlocation,
                    "floor": nfloor,
                    "room": nroom,
                    "things": room_things,

                    "iotdb_place": place_iri,
                    "api_room": make_api_room({ place_iri: place_iri })
                })
            }
        }
    }

    // unassigned places
    if (grouped_thingd[''] !== undefined) {
        rooms.push({
            "location": "Unassigned",
            "floor": "",
            "room": "Unassigned",
            "things": grouped_thingd['']

            // "iotdb_place": "xxx",
            // "api_room": make_api_room({ place_iri: place_iri })
        })
    }

    return rooms
}

/**
 */
var get_thing = function(thing_id) {
    var things = iot.things()
    for (var ti = 0; ti < things.length; ti++) {
        var t = things[ti];
        if (t.thing_id() == thing_id) {
            return t
        }
    }

    console.log("# get_thing: thing not found", thing_id)
    return null
}

/**
 */
var webserver_api = function(request, result) {
    console.log("+ webserver_api")
    var jd = {
        "api_rooms": make_api_room({ root: true }),
        "api_things": make_api_thing({ root: true }),
    }

    result.set('Content-Type', 'text/plain');
    result.send(JSON.stringify(jd, null, 2))
}

/**
 */
var webserver_rooms = function(request, result) {
    console.log("+ webserver_rooms")
    var rds = []

    var rooms = make_rooms()
    for (var ri in rooms) {
        var room = rooms[ri]

        var thing_iris = []
        var rd = {
            "location": room.location,
            "floor": room.floor,
            "room": room.room,

            "iotdb_place": room.iotdb_place,
            "api_room": room.api_room,
            "api_things": thing_iris
        }
        rds.push(rd)

        for (var ri in room.things) {
            var thing = room.things[ri]
            thing_iris.push("/api/things/" + thing.thing_id())
        }
    }

    var jd = {
        "rooms" : rds
    }

    result.set('Content-Type', 'text/plain');
    result.send(JSON.stringify(jd, null, 2))
}

/**
 *  Get a specific room - we don't expect this to 
 *  be called too often.
 */
var webserver_room = function(request, result) {
    console.log("+ webserver_room")
    var room_id = request.params.room_id
    var room_path = request.path

    var rooms = make_rooms()
    for (var ri in rooms) {
        var room = rooms[ri]
        if (room.api_room != room_path) {
            continue
        }

        var thing_iris = []
        var rd = {
            "location": room.location,
            "floor": room.floor,
            "room": room.room,

            "iotdb_place": room.iotdb_place,
            "api_room": room.api_room,
            "api_things": thing_iris
        }

        for (var ri in room.things) {
            var thing = room.things[ri]
            thing_iris.push(make_api_thing({ thing: thing }))
        }

        result.set('Content-Type', 'text/plain');
        result.send(JSON.stringify(rd, null, 2))
    }
}

/**
 */
var webserver_things = function(request, result) {
    console.log("+ webserver_things")
    var api_things = []
    var jd = {
        "api_things" : api_things
    }

    var things = iot.things()
    for (var ti = 0; ti < things.length; ti++) {
        var thing = things[ti];
        api_things.push(make_api_thing({ thing: thing }))
    }

    result.set('Content-Type', 'text/plain');
    result.send(JSON.stringify(jd, null, 2))
}

/**
 */
var webserver_thing = function(request, result) {
    console.log("+ webserver_thing")
    var thing = get_thing(request.params.thing_id)
    if (!thing) {
        return
    }

    var name = thing.meta_thing().get("iot:name")
    if (_.isEmpty(name)) {
        name = thing.name
    }
    var thing = {
        "name": name,

        "iotdb_thing": thing.thing_iri(),
        "iotdb_model": thing.model_iri(),
        "iotdb_place": thing.place_iri(),

        "api_thing": make_api_thing({ thing: thing }),
        "api_thing_attributes": make_api_thing({ thing: thing, attributes: true }),
        "api_thing_state": make_api_thing({ thing: thing, state: true }),
        "api_room": make_api_room({ thing: thing })
    }

    result.set('Content-Type', 'text/plain');
    result.send(JSON.stringify(thing, null, 2))
}

/**
 */
var webserver_thing_state = function(request, result) {
    console.log("+ webserver_state")
    var thing = get_thing(request.params.thing_id)
    if (!thing){
        return
    }

    thing.update(request.query)
    
    result.set('Content-Type', 'text/plain');
    result.send(JSON.stringify(thing.state(), null, 2))
}

/**
 */
var webserver_thing_attributes = function(request, result) {
    console.log("+ webserver_attributes")
    var thing = get_thing(request.params.thing_id)
    if (!thing){
        return
    }

    precook_things([ thing ])

    var jd = {
        "attributes": thing.atds,
    }

    result.set('Content-Type', 'text/plain');
    result.send(JSON.stringify(jd, null, 2))
}

/**
 */
var home_page = null

var webserver_home = function(request, result) {
    console.log("+ webserver_home")

    if (!home_page) {
        var home_template = path.join(__dirname, 'app', 'index.html')
        home_page = swig.renderFile(home_template, {
            plugind: plugind
        })
    }

    // console.log(home_page)
    result.set('Content-Type', 'text/html');
    result.send(home_page)
}

/**
 *  Collect info about all plugins
 */
var plugind = {
}

var plugins = function() {
    var dir_app = "app"
    var dir_controls = "static/controls"
    
    var path_controls = path.join(dir_app, dir_controls)
    var controls_dirs = node_fs.readdirSync(path_controls)
    for (var ci in controls_dirs) {
        var control_dir = controls_dirs[ci]
        var control_dir_path = path.join(path_controls, control_dir)

        var files = node_fs.readdirSync(control_dir_path)
        for (var fi in files) {
            var file = files[fi]
            if (file.match(/^[.]/)) {
                continue
            }

            var file_extension = path.extname(file).replace(/^[.]*/, '')
            var ps = plugind[file_extension]
            if (ps === undefined) {
                ps = []
                plugind[file_extension] = ps
            }

            var file_path = path.join(control_dir_path, file)
            if (file_extension == "html") {
                var data_raw = node_fs.readFileSync(file_path)
                ps.push(data_raw.toString('utf-8'))
            } else {
                ps.push(file_path.substring(dir_app.length + 1))
            }
        }
    }

    // console.log(plugind)
}

/**
 */
var webserver = function() {
    var app = express();

    app.get('/', webserver_home)
    app.use('/', express.static(__dirname + '/app'))
    app.get('/api', webserver_api)
    app.get('/api/things', webserver_things)
    app.get('/api/things/:thing_id', webserver_thing)
    app.get('/api/things/:thing_id/state', webserver_thing_state)
    app.get('/api/things/:thing_id/attributes', webserver_thing_attributes)
    app.get('/api/rooms', webserver_rooms)
    app.get('/api/rooms/:room_id', webserver_room)

    app.listen(3000);
}

if (1) {
    plugins()
    webserver()
}

/**
 */
var mqtt_setup = function() {
    home_mqtt.create_server()
    home_mqtt.create_bridge()
}

/**
 *  A new thing has appeared
 */
var mqtt_update_things = function(thing) {
    home_mqtt.publish('/api/things/' + thing.thing_id())
}

/**
 *  A change has been made to a thing
 */
var mqtt_update_thing = function(thing) {
    home_mqtt.publish(
        '/api/things/' + thing.thing_id() + '/state', 
        JSON.stringify(thing.state(), null, 2))
}

if (1) {
    mqtt_setup()
}

if (1) {
    var iot = new iotdb.IOT({ 
        models_path: "node_modules/iotdb-models//",
        load_models: true,
        load_drivers: true,
        load_things: true,
        iotdb_places_get: true,
        discover: true
    })
    iot.on_thing(function(iot, thing) {
        console.log("+ NEW THING", thing.thing_id())
        home_page = null
        mqtt_update_things(thing)

        thing.on_change(function() {
            console.log("+ state", thing.thing_id(), thing.state())
            mqtt_update_thing(thing)
        })

        thing.pull()
    })
    iot.on_things(function(iot) {
        iotdb.helpers.dump_things(iot, iot.things())
    })
}
