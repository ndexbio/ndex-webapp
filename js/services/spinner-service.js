/**
 * Created by vrynkov on 8/24/17.
 *
 * Please see more info about this spinner at http://spin.js.org/
 *
 */

ndexServiceApp.factory('ndexSpinner', [
    function () {

        var factory = {};

        var spinnerPageId = undefined;
        var spinnerObj    = {'spinner' : undefined};

        factory.startSpinner = function (spinnerId) {

            if (!spinnerObj.spinner) {
                var opts = {
                    lines: 11 // The number of lines to draw
                    , length: 19 // The length of each line
                    , width: 13 // The line thickness
                    , radius: 26 // The radius of the inner circle
                    , scale: 0.5 // Scales overall size of the spinner
                    , corners: 1 // Corner roundness (0..1)
                    , color: '#ff0000' // #rgb or #rrggbb or array of colors
                    , opacity: 0.25 // Opacity of the lines
                    , rotate: 11 // The rotation offset
                    , direction: 1 // 1: clockwise, -1: counterclockwise
                    , speed: 0.6 // Rounds per second
                    , trail: 100 // Afterglow percentage
                    , fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
                    , zIndex: 2e9 // The z-index (defaults to 2000000000)
                    , className: 'spinner' // The CSS class to assign to the spinner
                    , top: '50%' // Top position relative to parent
                    , left: '51%' // Left position relative to parent
                    , shadow: true // Whether to render a shadow
                    , hwaccel: false // Whether to use hardware acceleration
                    , position: 'absolute' // Element positioning
                }

                var target = document.getElementById(spinnerId);
                if (target) {
                    spinnerObj.spinner = new Spinner(opts).spin(target);
                };

            } else {
                var target = document.getElementById(spinnerId);
                spinnerObj.spinner.spin(target);
            };
        };

        factory.stopSpinner = function() {
            if (spinnerObj.spinner) {
                spinnerObj.spinner.stop();
            };
        };

        return factory;
    }
]);