var add_controls = require("./ssv_controls.js");
var create_element = require("./ssv_elements.js");
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
                self.elements.push(create_element(uuid, d, font_scale));
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
        return create_element(uuid, element_data, 1)
    },
    get_type_requirements: function() {
        return {"Heatmap": {"conditions": {"Rect": {"max_conditions": 1, "validators": {"data.float.3.3&x_len": "validate_array", "color_scale&color_levels": "validate_color_scale"}, "args": {"id": {"input_type": "str", "default": null}, "color_levels": {"input_type": "validate_color_levels", "default": null}, "color_scale": {"input_type": null, "default": null}, "description": {"input_type": "str", "default": null}, "x_len": {"input_type": "int", "default": null}, "section_label": {"input_type": "str", "default": "Zone"}, "report": {"input_type": "bool", "default": true}, "data": {"input_type": null, "default": null}, "opacity": {"input_type": ["int", "float"], "default": 1.0}, "overlay": {"input_type": "str", "default": null}, "unit": {"input_type": "str", "default": null}}}}, "args": {"description": "str", "id": "str", "x_series": null}}, "Table": {"conditions": {"TabularInfo": {"max_conditions": 1, "validators": {"headers.str.1.1": "validate_array", "tabular_data.str&x_len": "validate_array_slices"}, "args": {"id": {"input_type": "str", "default": null}, "overlay": {"input_type": "str", "default": null}, "description": {"input_type": "str", "default": null}, "x_len": {"input_type": "int", "default": null}, "section_label": {"input_type": "str", "default": "Zone"}, "report": {"input_type": "bool", "default": true}, "opacity": {"input_type": ["int", "float"], "default": 1.0}, "headers": {"input_type": null, "default": null}, "unit": {"input_type": "str", "default": null}, "tabular_data": {"input_type": null, "default": null}}}}, "args": {"description": "str", "id": "str", "x_series": null}}, "Report": {"conditions": {"Info": {"max_conditions": -1, "validators": {"data.float.1.2&x_len": "validate_array"}, "args": {"id": {"input_type": "str", "default": null}, "description": {"input_type": "str", "default": null}, "x_len": {"input_type": "int", "default": null}, "section_label": {"input_type": "str", "default": "Zone"}, "report": {"input_type": "bool", "default": true}, "data": {"input_type": null, "default": null}, "opacity": {"input_type": ["int", "float"], "default": 1.0}, "overlay": {"input_type": "str", "default": null}, "unit": {"input_type": "str", "default": null}}}}, "args": {"description": "str", "id": "str", "x_series": null}}, "Cell": {"conditions": {"DynamicLevel": {"max_conditions": -1, "validators": {"color_scale&color_levels": "validate_color_scale", "min_height&max_height": "validate_heights", "data.float.1.1&x_len": "validate_array", "data_dynamic.float.1.1&x_len": "validate_array"}, "args": {"id": {"input_type": "str", "default": null}, "color_levels": {"input_type": "validate_color_levels", "default": null}, "min_height": {"input_type": ["int", "float"], "default": null}, "description": {"input_type": "str", "default": null}, "max_height": {"input_type": ["int", "float"], "default": null}, "x_len": {"input_type": "int", "default": null}, "section_label": {"input_type": "str", "default": "Zone"}, "unit_dynamic": {"input_type": "str", "default": null}, "data": {"input_type": null, "default": null}, "opacity": {"input_type": ["int", "float"], "default": 1.0}, "description_dynamic": {"input_type": "str", "default": null}, "color_scale": {"input_type": null, "default": null}, "data_dynamic": {"input_type": null, "default": null}, "report": {"input_type": "bool", "default": true}, "overlay": {"input_type": "str", "default": null}, "unit": {"input_type": "str", "default": null}}}, "Info": {"max_conditions": -1, "validators": {"data.float.1.2&x_len": "validate_array"}, "args": {"id": {"input_type": "str", "default": null}, "description": {"input_type": "str", "default": null}, "x_len": {"input_type": "int", "default": null}, "section_label": {"input_type": "str", "default": "Zone"}, "report": {"input_type": "bool", "default": true}, "data": {"input_type": null, "default": null}, "opacity": {"input_type": ["int", "float"], "default": 1.0}, "overlay": {"input_type": "str", "default": null}, "unit": {"input_type": "str", "default": null}}}, "Background": {"max_conditions": -1, "validators": {"color_scale&color_levels": "validate_color_scale", "data.float.1.1&x_len": "validate_array"}, "args": {"id": {"input_type": "str", "default": null}, "color_levels": {"input_type": "validate_color_levels", "default": null}, "color_scale": {"input_type": null, "default": null}, "description": {"input_type": "str", "default": null}, "x_len": {"input_type": "int", "default": null}, "section_label": {"input_type": "str", "default": "Zone"}, "report": {"input_type": "bool", "default": true}, "data": {"input_type": null, "default": null}, "opacity": {"input_type": ["int", "float"], "default": 1.0}, "overlay": {"input_type": "str", "default": null}, "unit": {"input_type": "str", "default": null}}}, "ZonalY": {"max_conditions": -1, "validators": {"color_scale&color_levels": "validate_color_scale", "min_height&max_height": "validate_heights", "data.float.2.2&x_len": "validate_array", "data_dynamic.float.2.2&x_len": "validate_array"}, "args": {"id": {"input_type": "str", "default": null}, "color_levels": {"input_type": "validate_color_levels", "default": null}, "min_height": {"input_type": ["int", "float"], "default": null}, "description": {"input_type": "str", "default": null}, "max_height": {"input_type": ["int", "float"], "default": null}, "x_len": {"input_type": "int", "default": null}, "section_label": {"input_type": "str", "default": "Zone"}, "unit_dynamic": {"input_type": "str", "default": null}, "data": {"input_type": null, "default": null}, "opacity": {"input_type": ["int", "float"], "default": 1.0}, "description_dynamic": {"input_type": "str", "default": null}, "color_scale": {"input_type": null, "default": null}, "data_dynamic": {"input_type": null, "default": null}, "report": {"input_type": "bool", "default": true}, "overlay": {"input_type": "str", "default": null}, "unit": {"input_type": "str", "default": null}}}, "Logical": {"max_conditions": -1, "validators": {"data.float.1.1&x_len": "validate_array"}, "args": {"id": {"input_type": "str", "default": null}, "false_color": {"input_type": "validate_color", "default": null}, "description": {"input_type": "str", "default": null}, "true_color": {"input_type": "validate_color", "default": null}, "x_len": {"input_type": "int", "default": null}, "section_label": {"input_type": "str", "default": "Zone"}, "report": {"input_type": "bool", "default": true}, "data": {"input_type": null, "default": null}, "opacity": {"input_type": ["int", "float"], "default": 1.0}, "overlay": {"input_type": "str", "default": null}, "unit": {"input_type": "str", "default": null}}}, "StaticLevel": {"max_conditions": -1, "validators": {"color_scale&color_levels": "validate_color_scale", "min_height&max_height": "validate_heights", "data.float.1.1&x_len": "validate_array"}, "args": {"id": {"input_type": "str", "default": null}, "color_levels": {"input_type": "validate_color_levels", "default": null}, "color_scale": {"input_type": null, "default": null}, "min_height": {"input_type": ["int", "float"], "default": null}, "report": {"input_type": "bool", "default": true}, "max_height": {"input_type": ["int", "float"], "default": null}, "x_len": {"input_type": "int", "default": null}, "section_label": {"input_type": "str", "default": "Zone"}, "description": {"input_type": "str", "default": null}, "data": {"input_type": null, "default": null}, "opacity": {"input_type": ["int", "float"], "default": 1.0}, "overlay": {"input_type": "str", "default": null}, "unit": {"input_type": "str", "default": null}}}}, "args": {"description": "str", "id": "str", "x_series": null}}, "Toggle": {"conditions": {"Info": {"max_conditions": 1, "validators": {"data.float.1.2&x_len": "validate_array"}, "args": {"id": {"input_type": "str", "default": null}, "description": {"input_type": "str", "default": null}, "x_len": {"input_type": "int", "default": null}, "section_label": {"input_type": "str", "default": "Zone"}, "report": {"input_type": "bool", "default": true}, "data": {"input_type": null, "default": null}, "opacity": {"input_type": ["int", "float"], "default": 1.0}, "overlay": {"input_type": "str", "default": null}, "unit": {"input_type": "str", "default": null}}}, "ShowHide": {"max_conditions": 1, "validators": {"data.float.1.1&x_len": "validate_array"}, "args": {"id": {"input_type": "str", "default": null}, "description": {"input_type": "str", "default": null}, "x_len": {"input_type": "int", "default": null}, "section_label": {"input_type": "str", "default": "Zone"}, "report": {"input_type": "bool", "default": true}, "data": {"input_type": null, "default": null}, "opacity": {"input_type": ["int", "float"], "default": 1.0}, "overlay": {"input_type": "str", "default": null}, "unit": {"input_type": "str", "default": null}}}}, "args": {"description": "str", "id": "str", "x_series": null}}, "Legend": {"conditions": {"ColorScale": {"max_conditions": 1, "validators": {"color_scale&color_levels": "validate_color_scale"}, "args": {"id": {"input_type": "str", "default": null}, "color_levels": {"input_type": "validate_color_levels", "default": null}, "color_scale": {"input_type": null, "default": null}, "description": {"input_type": "str", "default": null}, "x_len": {"input_type": "int", "default": null}, "section_label": {"input_type": "str", "default": "Zone"}, "report": {"input_type": "bool", "default": true}, "opacity": {"input_type": ["int", "float"], "default": 1.0}, "overlay": {"input_type": "str", "default": null}, "unit": {"input_type": "str", "default": null}}}}, "args": {"id": "str", "x_series": null, "desc": null}}, "Line": {"conditions": {"EqualY": {"max_conditions": 1, "validators": {"color_scale&color_levels": "validate_color_scale", "data.float.2.2&x_len": "validate_array"}, "args": {"id": {"input_type": "str", "default": null}, "color_levels": {"input_type": "validate_color_levels", "default": null}, "color_scale": {"input_type": null, "default": null}, "description": {"input_type": "str", "default": null}, "x_len": {"input_type": "int", "default": null}, "section_label": {"input_type": "str", "default": "Zone"}, "report": {"input_type": "bool", "default": true}, "data": {"input_type": null, "default": null}, "opacity": {"input_type": ["int", "float"], "default": 1.0}, "overlay": {"input_type": "str", "default": null}, "unit": {"input_type": "str", "default": null}}}}, "args": {"x_series": null, "line_description": null, "line_id": null}}}

    }
};