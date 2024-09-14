(function () {
    window.addEventListener("DOMContentLoaded", () => {
        const btq = queue(), uxq = queue();

        bluetooth(btq, uxq);
        ux(uxq, btq);
    });

    // handle UX rendering/event loop.
    async function ux(q, bt) {
        // create heart rate display, main button + logging area.
        const hr = document.createElement("div");
        const btn = document.createElement("button");
        const pre = document.createElement("pre");
        document.body.appendChild(hr);
        document.body.appendChild(btn);
        document.body.appendChild(pre);

        // listen for button clicks.
        btn.addEventListener("click", () => q.push(btn.innerText));
        btn.innerText = "Initializing...";

        while (1) {
            //  disable button if an action is in progress.
            btn.disabled = btn.innerText.includes("...");

            // process next request - can be a click or BT state change.
            const item = await q.pop();
            switch (item) {
                case "Initialized": // BT initialized.
                    btn.innerText = "Pair";
                    break;
                case "Pair": // button clicked.
                    btn.innerText = "Pairing...";
                    bt.push(item);
                    break;
                case "Paired":
                case "Disconnected":
                    btn.innerText = "Connect";
                    break;
                case "Connect": // button clicked.
                    btn.innerText = "Connecting...";
                    bt.push(item);
                    break;
                case "Connected":
                    btn.innerText = "Start";
                    break;
                case "Start": // button clicked.
                    btn.innerText = "Starting...";
                    bt.push(item);
                    break;
                case "Started":
                    btn.innerText = "Stop";
                    break;
                case "Stop": // button clicked.
                    btn.innerText = "Stopping...";
                    bt.push(item);
                    break;
                case "Stopped":
                    btn.innerText = "Start";
                    break;
                case "Heart Rate":
                    // just log measurement sample.
                    hr.innerText = JSON.stringify(await q.pop());
                    break;
                default:
                    // log all failures.
                    if (item.includes("Failed")) {
                        pre.prepend(document.createTextNode((await q.pop()) + "\n"));
                    }
            }
        }
    }

    // handle bluetooth data collection.
    async function bluetooth(q, ux) {
        if (!navigator.bluetooth) {
            ux.push("Init Failed", "Browser does not support Bluetooth.");
            return;
        }

        let device = null, rate = null;

        ux.push("Initialized");
        while (1) {
            switch (await q.pop()) {
                case "Pair":
                    try {
                        device = await navigator.bluetooth.requestDevice({
                            filters: [{ services: ["heart_rate"] }],
                            optionalServices: ["battery_service"],
                        });
                        const on = () => q.push("Disconnected");
                        device.addEventListener("gattserverdisconnected", on);
                        ux.push("Paired");
                    } catch (e) {
                        ux.push("Pairing Failed", e);
                    }
                    break;
                case "Disconnected":
                    rate = null;
                    ux.push("Disconnected");
                    break;
                case "Connect":
                    try {
                        const server = await device.gatt.connect();
                        const service = await server.getPrimaryService("heart_rate");
                        rate = await service.getCharacteristic("heart_rate_measurement");

                        const onchange = () => q.push("Rate Changed");
                        rate.addEventListener("characteristicvaluechanged", onchange);
                        ux.push("Connected");
                    } catch (e) {
                        ux.push("Connect Failed", e);
                    }
                    break;
                case "Start":
                    try {
                        await rate.startNotifications();
                        ux.push("Started");
                    } catch (e) {
                        ux.push("Start Failed", e);
                    }
                    break;
                case "Stop":
                    try {
                        await rate.stopNotifications();
                        ux.push("Stopped");
                    } catch (e) {
                        ux.push("Stop Failed", e);
                    }
                    break;
                case "Rate Changed":
                    try {
                        ux.push("Heart Rate", parse(rate.value));
                    } catch (e) {
                        ux.push("Failed", e);
                    }
                    break;
            }
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
            let contact = null, rate = 0, offset = 1, energy = null, rrs = [];
            if ((flags & 0x1) == 0x1) {
                rate = val.getUint16(1, true /* like endian */);
                offset += 2;
            } else {
                rate = val.getUint8(1);
                offset++;
            }
            if ((flags & 0x4) == 0x4) {
                contact = (flags & 0x2) == 0x2;
            }
            if ((flags & 0x8) == 0x8) {
                energy = val.getUint16(offset, true /* little endian */);
                offset += 2;
            }
            if ((flags & 0x10) == 0x10) {
                while (offset < val.byteLength) {
                    rrs.push(val.getUint16(offset, true) * 1.0 / 1024);
                    offset += 2;
                }
            }
            return { rate, energy, rrs, contact };
        }
    }

    function queue() {
        const items = [];
        let r = Promise.withResolvers();

        return { push, pop };

        function push(...item) {
            if (items.push(...item) == item.length && item.length > 0) {
                const { resolve } = r;
                r = Promise.withResolvers();

                resolve(null);
            }
        }

        async function pop() {
            if (items.length == 0) {
                await r.promise;
            }
            return items.shift();
        }
    }
})();
