(function() {
    window.addEventListener("DOMContentLoaded", () => {
        const log = logger();
        const bt =  navigator.bluetooth;

        if (!bt) {
            log("Browser does not support Bluetooth\n");
            return;
        }

        try {
        const button = document.createElement("button");
        button.appendChild(document.createTextNode("monitor"));
        button.addEventListener("click", function() { monitor(log, bt); });
        document.body.insertBefore(button, document.getElementById("log"));
        } catch(e) {
            log("wat" + e);
        }

        log("Click to start");
    });
    
    async function monitor(log, bt) {
        try {
            const device = await bt.requestDevice({
                filters: [{ services: ["heart_rate"]}],
                optionalServices: ["battery_service"],
            });
            log(`Found device ${device.name}\n`);
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