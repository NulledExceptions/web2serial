// options defaults
var options = {
    autoConnect: true,  // if only 1 device

    baudrate: 9600,
    onopen: function(device_hash, socket) { console.log("web2serial-widget: onopen(" + device_hash + ")"); },
    onclose: function(event) { console.log("web2serial-widget: onclose(" + event + ")"); },
    onerror: function(event) { console.log("web2serial-widget: onerror(" + event + ")"); },
    onmessage: function(data) { console.log("web2serial-widget: onmessage(" + data + ")"); },
};

var el;
var el_core_status;
var el_status;
var el_devices;
var el_actions;
var el_messages;

var devices_last;

// states
var STATE_DISCONNECTED = "disconnected";
var STATE_CONNECTING = "connecting";
var STATE_CONNECTED = "connected";
var STATE_ERROR = "error";

// current state
var state = STATE_DISCONNECTED;
var state_info = "";

var socket;

function widgetize(elementId, userOptions) {
    for (var attrname in userOptions) { options[attrname] = userOptions[attrname]; }

    el = $("#" + elementId);
    el.html("<div id='web2serial-core-status'></div><div id='web2serial-status'></div><div id='web2serial-devices'></div><div id='web2serial-actions'></div><div id='web2serial-messages'></div>");

    el_core_status = el.find("#web2serial-core-status");
    el_status = el.find("#web2serial-status");
    el_devices = el.find("#web2serial-devices");
    el_actions = el.find("#web2serial-actions");
    el_messages = el.find("#web2serial-messages");

    set_state(STATE_DISCONNECTED);
    is_alive();
}

function set_state(newState, newStateInfo) {
    state = newState;
    state_info = newStateInfo;
    el_status.html(state);
    if (state_info) el_status.append( + " " + state_info);
}

function is_alive() {
    web2serial.is_alive(function(alive) {
        if (alive) {
            el_core_status.html("web2serial is up and running");
            refresh_devices();
        } else {
            el_core_status.html("error: web2serial down");
        }
        // setTimeout(is_alive, 5000);
    });
}

function refresh_devices() {
    web2serial.get_devices(function(device_list) {
        if (JSON.stringify(device_list) == devices_last) {
            return;
        }
        devices_last = JSON.stringify(device_list);

        el_devices.html("");
        for (var i=0; i<device_list.length; i++) {
            el_devices.append('<input type="radio" name="device" value="' + device_list[i].hash + '" id="' + device_list[i].hash + '" /> <label for="' + device_list[i].hash + '">' + device_list[i].device + " (" + device_list[i].desc + ", " + device_list[i].hwinfo + ')</label><br>');
        }

        el_devices.find("input").change(function() {
            connect(this.id);
        })

        if (device_list.length == 0) {
            el_devices.html("no devices found");
        }

        if (device_list.length == 1) {
            el_devices.find("#" + device_list[0].hash).prop('checked', true);
            if (options.autoConnect) {
                connect(device_list[0].hash);
            }
        }
    }, true);
}

function connect(device_hash) {
    set_state(STATE_CONNECTING);

    // Open the WebSocket
    socket = web2serial.open_connection(device_hash, options.baudrate);

    // set WebSocket event handlers
    socket.onopen = function(event) {
        set_state(STATE_CONNECTED);
        options.onopen(device_hash, this);
    };

    socket.onclose = function(event) {
        set_state(STATE_DISCONNECTED);
        el_devices.find("input").prop('checked', false);
        options.onclose(event);
    };    

    socket.onerror = function(event) {
        set_state(STATE_ERROR);
        options.onerror(event);
    };

    socket.onmessage = function(data) {
        options.onmessage(data);
    };
}
