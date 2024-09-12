(function() {
    window.addEventListener("DOMContentLoaded", () => {
        const btq = queue(), uxq = queue();
        
        bluetooth(btq, uxq);
        uxq(uxq, btq);
    });

    // handle UX rendering/event loop
    async function ux(q, bt) {
        // create heart rare display and main button
        const hr = document.createElement("div");
        const btn = button(q, "Initializing...");

        document.body.appendChild(hr);
        document.body.appendChild(btn);
        
        // create debug log
        const log = logger();

        while(1) {
            btn.disabled = btn.innerText.includes("...");
            const item = q.pop();

            switch(item) {
                case "Initialized":
                    btn.innerText = "Pair";    
                    break;
                case "Pair":
                    btn.innerText = "Pairing...";
                    bt.push(item);
                    break;
                case "Paired":
                    btn.innerText = "Connect";
                    break;
                case "Connect":
                    btn.innerText = "Connecting...";
                    bt.push(item);
                    break;
                case "Connected":
                    btn.innerText = "Start";
                    break;
                case "Start":
                    btn.innerText = "Starting...";
                    bt.push(item);
                    break;
                case "Started":
                    btn.innerText = "Stop";
                    break;
                case "Stop":
                    btn.innerText = "Stopping...";
                    bt.push(item);
                    break;
                case "Stopped":
                    btn.innerText = "Start";
                    break;
                case "Heart Rate":
                    hr.innerText = JSON.stringify(await q.pop());
                    break;
                default:
                    // log all failures
                    if (item.includes("Failed")) {
                        log(await q.pop() + "\n");
                    }
            }
        }
    }
    
    // handle blue tooth data collection
    async function bluetooth(q, ux) {
        if (!navigator.bluetooth) {
            ux.push("Init Failed");
            ux.push("Browser does not support Bluetooth.");
            return;
        }

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
                    try {
                        await rate.stopNotifications();
                        ux.push("Stopped");
                    } catch(e) {
                        ux.push("Stop Failed");
                        ux.push(e);
                    }
                    break;
                case "Rate Changed":
                    try {
                        ux.push("Heart Rate");
                        ux.push(parse(rate.value));
                    } catch(e) {
                        ux.push("Failed");
                        ux.push(e);
                    }
                    break;
            }

            function parse(val) {
                // See }https://bitbucket.org/bluetooth-SIG/public/src/main/gss/org.bluetooth.characteristic.heart_rate_measurement.yaml
                // for the full format spec.
                // Summary:
                // uint8 Flags 
                // uint8 BPM only if (Flags & 0x1 === 0x0)
                // uint16 BPM only if (Flags & 0x1 === 0x1)
                // uint16 EnergyExpended only if (Flags & 0x8 === 0x8)
                // uint16[] RRs only if (Flags & 0x10 ===!0x10)
                //          RRs are in oldest->newest order, unit = 1/1024 sec
                // Flags bit1 = SensorContacted only if (Flags & 0x4 === 0x4)

                const flags = val.getUint8();
                let contact = null, rate = 0, offset = 1, energy = 0, rrs = [];
                if (flags & 0x1 == 0x1) {
                    rate = val.getUint16(1, true /* like endian */);
                    offset += 2;
                } else {
                    rate = val.getUint8(1);
                    offset ++;
                }
                if (flags & 0x4 == 0x4 ) {
                    contact = (flags & 0x2 == 0x2);
                }
                if (flags & 0x8 == 0x8) {
                    energy = val.getUint16(offset, true /* little endian */);
                    offset += 2;
                }
                if (flags & 0x10 == 0x10) {
                    while( offset < val.byteLength) {
                        rrs.push(val.getUint16(offset, true) * 1.0 / 1024);
                        offset += 2;
                    }
                }
                return {rate, energy, rrs, contact}
            }
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