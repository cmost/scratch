(function() {
    window.addEventListener("DOMContentLoaded", ($ => {
        const log = logger();

        log("initialized!")  
    })
    
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