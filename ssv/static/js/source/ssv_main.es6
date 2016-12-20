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
        recreate_element(uuid, element_data, 1)
    },
    get_type_requirements: function() {
        return {"element_max_conditions": {"Toggle": 1, "Heatmap": 1, "Cell": -1, "Legend": 1, "Report": -1, "Line": 1, "Table": 1}, "element_args": {"Toggle": ["toggle_id", "x_series", "toggle_description"], "Heatmap": ["x_series", "heatmap_id", "heatmap_description"], "Cell": ["x_series", "cell_id", "cell_description"], "Legend": ["x_series", "color_scale_id", "color_scale_desc"], "Report": ["report_id", "x_series", "report_description"], "Line": ["line_id", "line_description", "x_series"], "Table": ["x_series", "table_description", "table_id"]}, "input_types": {"color_levels": "validate_color_levels", "false_color": "validate_color", "min_height": ["int", "float"], "report": "bool", "data.float.1.1&x_len": "validate_array", "data.float.3.3&x_len": "validate_array", "data.float.1.2&x_len": "validate_array", "overlay": "str", "opacity": ["int", "float"], "tabular_data.str&x_len": "validate_array_slices", "color_scale&color_levels": "validate_color_scale", "section_label": "str", "headers.str.1.1": "validate_array", "element_description": "str", "description": "str", "description_dynamic": "str", "x_len": "int", "data_dynamic.float.2.2&x_len": "validate_array", "min_height&max_height": "validate_heights", "id": "str", "data_dynamic.float.1.1&x_len": "validate_array", "unit": "str", "unit_dynamic": "str", "data.float.2.2&x_len": "validate_array", "true_color": "validate_color", "element_report_id": "str", "max_height": ["int", "float"]}, "condition_args": {"Background": ["x_len", "data", "color_scale", "color_levels", "kwargs", "data.float.1.1&x_len", "color_scale&color_levels"], "ZonalY": ["x_len", "data", "data_dynamic", "color_scale", "color_levels", "min_height", "max_height", "description_dynamic", "unit_dynamic", "kwargs", "data.float.2.2&x_len", "data_dynamic.float.2.2&x_len", "color_scale&color_levels", "min_height&max_height"], "EqualY": ["x_len", "data", "color_scale", "color_levels", "kwargs", "data.float.2.2&x_len", "color_scale&color_levels"], "Rect": ["x_len", "data", "color_scale", "color_levels", "kwargs", "data.float.3.3&x_len", "color_scale&color_levels"], "ColorScale": ["x_len", "color_scale", "color_levels", "kwargs", "color_scale&color_levels"], "Info": ["x_len", "data", "kwargs", "data.float.1.2&x_len"], "TabularInfo": ["x_len", "tabular_data", "headers", "kwargs", "tabular_data.str&x_len", "headers.str.1.1"], "DynamicLevel": ["x_len", "data", "data_dynamic", "color_scale", "color_levels", "min_height", "max_height", "description_dynamic", "unit_dynamic", "kwargs", "data.float.1.1&x_len", "data_dynamic.float.1.1&x_len", "color_scale&color_levels", "min_height&max_height"], "ShowHide": ["x_len", "data", "kwargs", "data.float.1.1&x_len"], "Logical": ["x_len", "data", "true_color", "false_color", "kwargs", "data.float.1.1&x_len"], "StaticLevel": ["x_len", "data", "color_scale", "color_levels", "min_height", "max_height", "kwargs", "data.float.1.1&x_len", "color_scale&color_levels", "min_height&max_height"]}, "element_conditions": {"Toggle": ["Info", "ShowHide"], "Heatmap": ["Rect"], "Cell": ["Info", "Background", "StaticLevel", "DynamicLevel", "Logical", "ZonalY"], "Legend": ["ColorScale"], "Report": ["Info"], "Line": ["EqualY"], "Table": ["TabularInfo"]}}

    }
};