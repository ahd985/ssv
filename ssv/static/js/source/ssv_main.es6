var add_controls = require("./ssv_controls.es6");
var create_element = require("./ssv_elements.es6");
var utilities = require("./ssv_utilities.es6");

// Main class to generate contextual information of ssv setup
class ElementContext {
    constructor(uuid, x_series, element_data, svg_overlays) {
        // Initialize properties
        this.uuid = uuid;
        this.svg_sel = d3.select(`#${this.uuid} #ssv-svg`);
        this.info_layer_sel = d3.select(`#${this.uuid} #info-layer`);
        this.svg_container_sel = d3.select(`#${this.uuid} .ssv-visual`);
        this.x_val_sel = d3.select(`#${this.uuid} #x-series-val`);

        // -- Element_data is the 'y' data representing svg elements that corresponds to the x_series data
        this.x_series = x_series;
        this.elements = [];
        
        // -- Pattern overlay (e.g., water) data provided by Python
        // AHD see https://jsfiddle.net/96txdmnf/1/
        this.svg_overlays = svg_overlays;

        // Call all initialization functions
        this.initialize_overlays();
        this.set_font_scale();
        this.initialize_elements(element_data);
        add_controls(uuid, x_series.length, this.update_elements, this);
    }

    // Initializer of svg pattern overlays (e.g., water pattern overlays).  These are inserted into
    // the svg 'defs' child for reference by svg elements.
    initialize_overlays() {
        if (this.svg_sel.select('defs').empty()) {
            this.svg_sel.append('defs')
        }

        for (var k in this.svg_overlays) {
            this.svg_sel.select('defs').html(this.svg_sel.select('defs').html() + this.svg_overlays[k])
        }
    };

    // Function to calculate scale of svg view box to parent svg div
    // This is required to scale user input font size correctly
    set_font_scale() {
        var font_scale = parseFloat(this.svg_sel.attr('viewBox').split(' ')[3]) /
            this.svg_container_sel.node().getBoundingClientRect().height;
        this.font_scale = font_scale;
        this.svg_sel.attr('font-scale', font_scale)
    };

    initialize_elements(element_data) {
        var uuid = this.uuid;
        var font_scale = this.font_scale;
        this.elements = element_data.map(function(d) {return create_element(uuid, d, font_scale)});

        // Draw elements at x index of 0
        this.update_elements(0);
    };

    // Function to tell all manipulated element classes to update rendering given index of this.x_series
    update_elements(x) {
        this.x_val_sel.html(utilities.num_format(this.x_series[x]));
        this.elements.map(function(d) {d.update(x)});
    };
}

// Error catching
window.onerror=function(msg){
    d3.select("body").attr("JSError",msg);
};

var element_contexts = {};

module.exports = {
    add_element_context: function(uuid, x_series, element_data, svg_overlays) {
        element_contexts[uuid] = new ElementContext(uuid, x_series, element_data, svg_overlays);
    }
};