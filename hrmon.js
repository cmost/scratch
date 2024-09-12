(function() {
    window.addEventListener("DOMContentLoaded", () => {
        const log = logger();

        if (!navigator.bluetooth) {
            log("Browser does not support Bluetooth\n");
            return;
        }

        const btq = queue(), uxq = queue();
        const button = createButton(q, "Pair");
        
        bluetooth(btq, uxq);
        uxq(uxq, btq)()
    });

    async function ux(q, bt) {
        const btn = button(q, "Initializing...");
        btn.disabled = true;
        document.body.appendChild(btn);
        
        const log = logger();

        while(1) {
            const item = q.pop();

            switch(item) {
                case "Init Failed":
                    log(await q.pop());
                    break;
                case "Initialized":
                    btn.innerText = "Pair";
                    btn.disabled = false;
                    break;
                case "Pair":
                    btn.innerText = "Pairing...";
                    btn.disabled = true;
                    bt.push(item);
                    break;
                case "Paired":
                    btn.innerText = "Connect";
                    btn.disabled = false;
                    break;
                case "Pairing Failed":
                case "Connected":
                case "Connect Failed":
                case "Started":
                case "Start Failed":
                case "Stopped":
                case "Stop Failed":
                case "Heart Rate":
            }
        }
    }
    
    async function bluetooth(q, ux) {
        if (!navigator.bluetooth) {
            ux.push("Init Failed");
            ux.push(new Error("Browser does not support Bluetooth."));
            return;
        }


        const q = queue ();
        const btn = button(q, "Pair");

        document.body.insertBefore(btn, document.getElementById("log"));

        let device = null, rate = null;

        ux.push("Initialized");
        while (1) {
            const item = await q.pop();
            switch(item) {
                case "Pair":
                    try {
                        const opts = {
                            filters: [{ services: ["heart_rate"] }],
                            optionalServices: ["battery_service"],
                        }
                        device = await navigator.bluetooth.requestDevice(opts);
                        const push = () => q.push("Disconnected");
                        device.addEventListener("gattserverdisconnected", push);
                        ux.push("Paired");
                    } catch(error) {
                        ux.push("Pairing Failed");
                        ux.push(e);
                    }
                    break;
                case "Disconnect":
                    device.gatt.disconnect();
                    break;
                case "Disconnected":
                    rate = null;
                    ux.push("Disconnected");
                    break;
                case "Connect":
                    try {
                        const server = await device.gatt.connect();
                        const service = await server.getPrimaryService("heart_rate");
                        rate = getChatecteristic("heart_rate_measurement");
                        const changed = () => q.push("Rate Changed");
                        rate.addEventListener("characteristicvalurchanged", changed);
                        ux.push("Connected");
                    } catch(e) {
                        ux.push("Connect Failed");
                        ux.push(e);
                    }
                    break;
                case "Start":
                    try {
                        await rate.startNotifications();
                        ux.push("Started");
                    } catch(e) {
                        ux.push("Start Failed");
                        ux.push(e);
                    }
                    break;
                case "Stop":
                    break;
                case "Rate Changed":
                    ux.push("Heart Rate");
                    ux.push(heartRate(rate.value));
                    break;
            }
        }
    
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

    function button(q, text) {
        const node = document.createElement("button");
        node.innerText = text;
        node.addEventListener("click", e => q.push(node.innerText));
        return node;
    }

    function queue() {
        let items = [];
        let r = Promise.withResolvers();

        return {push, pop};

        function push (item) {
            if (items.push(item) == 1) {
                const {resolve} = r;
                r = Promise.withResolvers();

                resolve(null);
            }
        }

        async function pop() {
            if ( items.length == 0 ) {
                await r.promise;
            }
            return items.shift();
        }
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