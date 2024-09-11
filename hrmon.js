(function() {
    window.addEventListener("DOMContentLoaded", () => {
        const log = logger();
        const bt =  navigator.bluetooth;

        if (!bt) {
            log("Browser does not support Bluetooth\n");
            return;
        }

        monitor(log, bt);
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
            document.body.append(el);
        }
        return function (text) {
            el.appendChild(document.createTextNode(text));
        }
    }
})();