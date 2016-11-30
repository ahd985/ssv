var d3 = require("d3");

var generate_sels = function(uuid) {
    var uuid_sel = d3.select(`#${uuid}`);

    var sels = {
        // Controls
        controls: {
            // --modebar components
            modebar: uuid_sel.select(`.modebar`),
            modebar_group: uuid_sel.select(`.modebar-group`),
            modebar_slider: uuid_sel.select(`.modebar-slider`),
            // --buttons
            speed_btn: uuid_sel.select(`#speed-button`),
            play_btn: uuid_sel.select(`#play-button`),
            pan_zoom_btn: uuid_sel.select(`#pan-zoom-button`),
            center_btn: uuid_sel.select(`#center-button`),
            save_btn: uuid_sel.select(`#save-button`),
            vid_btn: uuid_sel.select(`#video-button`),
            // --icons
            pause_icon: uuid_sel.select(`#pause-icon`),
            play_icon: uuid_sel.select(`#play-icon`),
            pan_zoom_enabled_icon: uuid_sel.select(`#pan-zoom-enabled-icon`),
            pan_zoom_disabled_icon: uuid_sel.select(`#pan-zoom-disabled-icon`)
        },

        // Title info
        title: {
            title: uuid_sel.select(`#title`),
            x_val: uuid_sel.select(`#x-val`),
            x_val_unit: uuid_sel.select(`#x-val-unit`)
        },

        // Containers
        containers: {
            svg_container: uuid_sel.select(`.svg-container`),
            zoom_layer: uuid_sel.select(`#zoom-layer`),
            info_layer: uuid_sel.select(`#info-layer`),
            popover_div: uuid_sel.select(`.popover-spacer`),
            svg: uuid_sel.select(`#ssv-svg`),
            img: uuid_sel.select(`#img-space`),
            render: uuid_sel.select(`#render-space`),
            progress: uuid_sel.select(`.ssv-progress`)
        }
    };

    return sels
};

module.exports = generate_sels;
