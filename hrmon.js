(function() {
    window.addEventListener("DOMContentLoaded", () => {
        const log = logger();
        const bt =  navigator.bluetooth;

        if (!bt) {
            log("Browser does not support Bluetooth\n");
            return;
        }

        handleBluetooth(log, bt);
    });
    
    async function handleBluetooth(log, bt) {
        const button = document.createElement("button");
        const logEl = document.getElementById("log");
        let device = null, rate = null;
        let state = "Pair";

        document.body.insertBefore(button, log);
    
        switch(state) {
            case "Pair":
                button.innerText = state;

                device = await listen(button, "click", function () { return pair(log, bt); });
                if (device) {
                    state = "Connect";
                }
                break;
            case "Connect":
                button.innerText = state;

                rate = await listen(button, "click", function() {
                    return connect(log, device);
                });
        }
    }

    async function connect(log, device) {
        let server = null, service = null;
        try {
            server = await device.gatt. connect();
        } catch(error) {
            log("Error connectting: " + error);
            return null;
        }
        
        try {
            service = await server.getPrimaryService ('heart_service');
        } catch(error) {
            log("Error getting heart rate service: " + error);
            return null;
        }

        try {
            return service.getChatecteristic('heart_rate');
        } catch(error) {
            log("Error getting HR characteristic: " + error);
        }

        return null;
    }
    async function pair(log, bt) {
        try {
            const device = await bt.requestDevice({
                filters: [{ services: ["heart_rate"]}],
                optionalServices: ["battery_service"],
            });
            log(`Found device ${device.name}\n`);
            return device;
        } catch(e) {
            log("Got an exception:" + e + "\n");
        }
        return null;
    }

    function listen(node, event, handler) {
        const { promise, resolve, reject } = Promise.withResolvers();
        async function callback(e) {
            try {
                resolve(await handler(e));
            } catch(error) {
                reject(error);
            }
        }
        node.addEventListener(event, callback, {once: true});
        return promise;
    }
    function logger () {
        let el = document.getElementById ("log");
        if (!el) {
            el = document.createElement("pre");
            el.id = "log";
            document.body.append(el);
        }
        return function (text) {
            el.appendChild(document.createTextNode(text));
        }
    }
})();