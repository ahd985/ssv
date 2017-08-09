var add_controls = require("./ssv_controls.js");
var element_lib = require("./ssv_elements.js");
var generate_sels= require("./ssv_selectors.js");

// Main class to generate contextual information of ssv setup
class ElementContext {
    constructor(uuid, title, x_series, x_series_unit, element_data, svg_overlays, font_size) {
        // Initialize properties
        this.uuid = uuid;
        this.sels = generate_sels(uuid);

        // -- Set font size in  container and svg
        this.sels.containers.svg_container.style("font-size", font_size.toString() + "px");
        this.sels.containers.svg.style("font-size", font_size.toString() + "px");

        // -- Element_data
        this.elements = [];
        
        // -- Pattern overlay (e.g., water) data provided by Python
        // AHD see https://jsfiddle.net/96txdmnf/1/
        this.svg_overlays = svg_overlays;

        // Call all initialization functions
        this.initialize_overlays();
        this.set_font_scale();
        add_controls(title, x_series, x_series_unit, this.update_elements, this);
        this.initialize_elements(element_data);
    }

    // Initializer of svg pattern overlays (e.g., water pattern overlays).  These are inserted into
    // the svg 'defs' child for reference by svg elements.
    initialize_overlays() {
        if (this.sels.containers.svg.select('defs').empty()) {
            this.sels.containers.svg.append('defs')
        }

        for (var k in this.svg_overlays) {
            this.sels.containers.svg.select('defs')
                .html(this.sels.containers.svg.select('defs').html() + this.svg_overlays[k])
        }
    };

    // Function to calculate scale of svg view box to parent svg div
    // This is required to scale user input font size correctly
    set_font_scale() {
        var font_scale = parseFloat(this.sels.containers.svg.attr('viewBox').split(' ')[3]) /
            this.sels.containers.svg_container.node().getBoundingClientRect().height;
        this.font_scale = font_scale;
        this.sels.containers.svg.attr('font-scale', font_scale)
    };

    initialize_elements(element_data) {
        var uuid = this.uuid;
        var font_scale = this.font_scale;

        // Async element loading
        this.elements = [];
        var len = element_data.length;
        var self = this;
        element_data.forEach(function(d) {
            setTimeout(function(){
                self.elements.push(element_lib.create_element(uuid, d, font_scale));
                self.update_loading_progress(len);
            }, 0)
        });
    };
    
    update_loading_progress(len) {
        // Hide the progress screen if we are done else update the progress bar
        if (this.elements.length == len) {
            this.sels.containers.progress.select(".progress-bar").style("width", 0)
            this.sels.containers.progress.style("display", "none");
            
            // Draw elements at x index of 0
            this.update_elements(0);
        } else {
            var progress = Math.ceil(this.elements.length / len * 100).toString() + "%";
            this.sels.containers.progress.select(".progress-bar").style("width", progress)
        }
    }

    // Function to tell all manipulated element classes to update rendering given index of x-series
    update_elements(x, trans_dur) {
        this.elements.map(function(d) {d.update(x, trans_dur)});
    };
}

// Error catching
window.onerror=function(msg){
    document.body.setAttribute("JSError", msg);
};

var element_contexts = {};

module.exports = {
    add_element_context: function(uuid, ...args) {
        element_contexts[uuid] = new ElementContext(uuid, ...args);
    },
    create_demo_element: function(uuid, element_data, font_size) {
        return element_lib.create_element(uuid, element_data, 1)
    },
    remove_demo_element: function(uuid) {
        element_lib.remove_element(uuid)
    },
    get_type_requirements: function() {
        return {"table": {"args": {"description": "str", "id": "str", "x_series": null}, "conditions": {"tabularinfo": {"args": {"id": {"default": null, "input_type": "str"}, "opacity": {"default": 1.0, "input_type": ["int", "float"]}, "report": {"default": true, "input_type": "bool"}, "x_len": {"default": null, "input_type": "int"}, "tabular_data": {"default": null, "input_type": null}, "headers": {"default": null, "input_type": null}, "section_label": {"default": "zone", "input_type": "str"}, "description": {"default": null, "input_type": "str"}, "overlay": {"default": null, "input_type": "str"}, "unit": {"default": null, "input_type": "str"}}, "validators": {"headers.str.1.1": "validate_array", "tabular_data.str&x_len": "validate_array_slices"}, "max_conditions": 1}}}, "cell": {"args": {"description": "str", "id": "str", "x_series": null}, "conditions": {"background": {"args": {"id": {"default": null, "input_type": "str"}, "description": {"default": null, "input_type": "str"}, "overlay": {"default": null, "input_type": "str"}, "x_len": {"default": null, "input_type": "int"}, "color_data": {"default": null, "input_type": null}, "opacity": {"default": 1.0, "input_type": ["int", "float"]}, "report": {"default": true, "input_type": "bool"}, "color_scale": {"default": null, "input_type": null}, "section_label": {"default": "zone", "input_type": "str"}, "color_levels": {"default": null, "input_type": "validate_color_levels"}, "unit_description_prepend": {"default": null, "input_type": "str"}, "unit": {"default": null, "input_type": "str"}}, "validators": {"color_data.float.1.1&x_len": "validate_array", "color_scale&color_levels": "validate_color_scale"}, "max_conditions": -1}, "zonaly": {"args": {"level_data": {"default": null, "input_type": null}, "id": {"default": null, "input_type": "str"}, "color_data_description": {"default": null, "input_type": "str"}, "color_data": {"default": null, "input_type": null}, "report": {"default": true, "input_type": "bool"}, "color_scale": {"default": null, "input_type": null}, "section_label": {"default": "zone", "input_type": "str"}, "color_levels": {"default": null, "input_type": "validate_color_levels"}, "unit_description_prepend": {"default": null, "input_type": "str"}, "min_height": {"default": null, "input_type": ["int", "float"]}, "overlay": {"default": null, "input_type": "str"}, "x_len": {"default": null, "input_type": "int"}, "opacity": {"default": 1.0, "input_type": ["int", "float"]}, "max_height": {"default": null, "input_type": ["int", "float"]}, "description": {"default": null, "input_type": "str"}, "color_data_unit": {"default": null, "input_type": "str"}, "unit": {"default": null, "input_type": "str"}}, "validators": {"min_height&max_height": "validate_heights", "level_data.float.2.2&x_len": "validate_array", "color_data.float.2.2&x_len": "validate_array", "color_scale&color_levels": "validate_color_scale"}, "max_conditions": -1}, "dynamiclevel": {"args": {"level_data": {"default": null, "input_type": null}, "id": {"default": null, "input_type": "str"}, "color_data_description": {"default": null, "input_type": "str"}, "color_data": {"default": null, "input_type": null}, "report": {"default": true, "input_type": "bool"}, "color_scale": {"default": null, "input_type": null}, "section_label": {"default": "zone", "input_type": "str"}, "color_levels": {"default": null, "input_type": "validate_color_levels"}, "unit_description_prepend": {"default": null, "input_type": "str"}, "min_height": {"default": null, "input_type": ["int", "float"]}, "overlay": {"default": null, "input_type": "str"}, "x_len": {"default": null, "input_type": "int"}, "opacity": {"default": 1.0, "input_type": ["int", "float"]}, "max_height": {"default": null, "input_type": ["int", "float"]}, "description": {"default": null, "input_type": "str"}, "color_data_unit": {"default": null, "input_type": "str"}, "unit": {"default": null, "input_type": "str"}}, "validators": {"min_height&max_height": "validate_heights", "color_scale&color_levels": "validate_color_scale", "color_data.float.1.1&x_len": "validate_array", "level_data.float.1.1&x_len": "validate_array"}, "max_conditions": -1}, "staticlevel": {"args": {"level_data": {"default": null, "input_type": null}, "min_height": {"default": null, "input_type": ["int", "float"]}, "id": {"default": null, "input_type": "str"}, "description": {"default": null, "input_type": "str"}, "overlay": {"default": null, "input_type": "str"}, "x_len": {"default": null, "input_type": "int"}, "opacity": {"default": 1.0, "input_type": ["int", "float"]}, "report": {"default": true, "input_type": "bool"}, "color_scale": {"default": null, "input_type": null}, "section_label": {"default": "zone", "input_type": "str"}, "color_levels": {"default": null, "input_type": "validate_color_levels"}, "max_height": {"default": null, "input_type": ["int", "float"]}, "unit_description_prepend": {"default": null, "input_type": "str"}, "unit": {"default": null, "input_type": "str"}}, "validators": {"color_scale&color_levels": "validate_color_scale", "min_height&max_height": "validate_heights", "level_data.float.1.1&x_len": "validate_array"}, "max_conditions": -1}}}, "line": {"args": {"line_description": null, "line_id": null, "x_series": null}, "conditions": {"equaly": {"args": {"id": {"default": null, "input_type": "str"}, "description": {"default": null, "input_type": "str"}, "overlay": {"default": null, "input_type": "str"}, "x_len": {"default": null, "input_type": "int"}, "color_data": {"default": null, "input_type": null}, "opacity": {"default": 1.0, "input_type": ["int", "float"]}, "report": {"default": true, "input_type": "bool"}, "color_scale": {"default": null, "input_type": null}, "section_label": {"default": "zone", "input_type": "str"}, "color_levels": {"default": null, "input_type": "validate_color_levels"}, "unit_description_prepend": {"default": null, "input_type": "str"}, "unit": {"default": null, "input_type": "str"}}, "validators": {"color_data.float.2.2&x_len": "validate_array", "color_scale&color_levels": "validate_color_scale"}, "max_conditions": 1}}}, "report": {"args": {"description": "str", "id": "str", "x_series": null}, "conditions": {"info": {"args": {"id": {"default": null, "input_type": "str"}, "opacity": {"default": 1.0, "input_type": ["int", "float"]}, "overlay": {"default": null, "input_type": "str"}, "x_len": {"default": null, "input_type": "int"}, "data": {"default": null, "input_type": null}, "report": {"default": true, "input_type": "bool"}, "section_label": {"default": "zone", "input_type": "str"}, "description": {"default": null, "input_type": "str"}, "unit": {"default": null, "input_type": "str"}}, "validators": {"data.float.1.2&x_len": "validate_array"}, "max_conditions": -1}}}, "toggle": {"args": {"description": "str", "id": "str", "x_series": null}, "conditions": {"logical": {"args": {"true_color": {"default": null, "input_type": "validate_color"}, "id": {"default": null, "input_type": "str"}, "opacity": {"default": 1.0, "input_type": ["int", "float"]}, "overlay": {"default": null, "input_type": "str"}, "x_len": {"default": null, "input_type": "int"}, "data": {"default": null, "input_type": null}, "report": {"default": true, "input_type": "bool"}, "section_label": {"default": "zone", "input_type": "str"}, "description": {"default": null, "input_type": "str"}, "false_color": {"default": null, "input_type": "validate_color"}, "unit": {"default": null, "input_type": "str"}}, "validators": {"data.float.1.1&x_len": "validate_array"}, "max_conditions": 1}, "showhide": {"args": {"id": {"default": null, "input_type": "str"}, "opacity": {"default": 1.0, "input_type": ["int", "float"]}, "overlay": {"default": null, "input_type": "str"}, "x_len": {"default": null, "input_type": "int"}, "data": {"default": null, "input_type": null}, "report": {"default": true, "input_type": "bool"}, "section_label": {"default": "zone", "input_type": "str"}, "description": {"default": null, "input_type": "str"}, "unit": {"default": null, "input_type": "str"}}, "validators": {"data.float.1.1&x_len": "validate_array"}, "max_conditions": 1}}}, "heatmap": {"args": {"description": "str", "id": "str", "x_series": null}, "conditions": {"rect": {"args": {"id": {"default": null, "input_type": "str"}, "description": {"default": null, "input_type": "str"}, "overlay": {"default": null, "input_type": "str"}, "x_len": {"default": null, "input_type": "int"}, "color_data": {"default": null, "input_type": null}, "opacity": {"default": 1.0, "input_type": ["int", "float"]}, "report": {"default": true, "input_type": "bool"}, "color_scale": {"default": null, "input_type": null}, "section_label": {"default": "zone", "input_type": "str"}, "color_levels": {"default": null, "input_type": "validate_color_levels"}, "unit_description_prepend": {"default": null, "input_type": "str"}, "unit": {"default": null, "input_type": "str"}}, "validators": {"color_data.float.3.3&x_len": "validate_array", "color_scale&color_levels": "validate_color_scale"}, "max_conditions": 1}}}, "legend": {"args": {"desc": null, "id": "str", "x_series": null}, "conditions": {"colorscale": {"args": {"id": {"default": null, "input_type": "str"}, "description": {"default": null, "input_type": "str"}, "overlay": {"default": null, "input_type": "str"}, "x_len": {"default": null, "input_type": "int"}, "opacity": {"default": 1.0, "input_type": ["int", "float"]}, "report": {"default": true, "input_type": "bool"}, "color_scale": {"default": null, "input_type": null}, "section_label": {"default": "zone", "input_type": "str"}, "color_levels": {"default": null, "input_type": "validate_color_levels"}, "unit": {"default": null, "input_type": "str"}}, "validators": {"color_scale&color_levels": "validate_color_scale"}, "max_conditions": 1}}}}

    }
};