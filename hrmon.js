(function() {
    window.addEventListener("DOMContentLoaded", () => {
        const log = logger();
        const bt =  navigator.bluetooth;

        if (!bt) {
            log("Browser does not support Bluetooth\n");
            return;
        }

        
        const button = document.createElement("button");
        button.appendChild(document.createTextNode("Pair"));
        button.addEventListener("click", function() { pair(log, bt); });
        document.body.insertBefore(button, document.getElementById("log"));

        log("Click to start");
    });
    
    async function handleBluetooth(log, bt) {
        const button = document.createElement("button");
        const logEl = document.getElementById("log");
        let device = null;
        let state = "Pair";

        document.body.insertBefore(button, log);
    
        switch(state) {
            case "Pair":
                button.innerText = state;

                device = await listen(button, "click" function () { return pair(log, bt); });
                if (device) {
                    state = "Connect";
                }
                break;
            case "Connect":
        }
    }
    async function pair(log, bt) {
        try {
            const device = await bt.requestDevice({
                filters: [{ services: ["heart_rate"]}],
                optionalServices: ["battery_service"],
            });
            log(`Found device ${device.name}\n`);
            monitor(log, device);
        } catch(e) {
            log("Got an exception:" + e + "\n");
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