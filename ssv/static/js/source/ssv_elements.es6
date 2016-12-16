var renderers = require("./ssv_renderers.js");
var d3 = require("d3");

// Inheritable parent class of every element type
class Element {
    constructor(uuid, element_ids, element_description, element_conditions, report_id, popover, font_scale) {
        this.uuid = uuid;

        // -- Build list of selectors from ids
        this.selectors = [];
        if (element_ids) {
            this.ids = element_ids;
            this.selectors = element_ids.map(function(d) {
                return d3.select(`#${uuid} #${d}`)
            });
        }
        this.update_functions = [];

        // -- Report id represents id of placement element for element report - Optional property
        report_id == "" ? this.report_sel = false : this.report_sel = d3.select(`#${uuid} #${report_id}`);
        this.popover_div_sel = d3.select(`#${uuid} .popover-spacer`);
        // -- Element description is printed at top of optional report
        this.description = element_description;
        // -- Array of element conditions - data types that describe simulation characteristics such as
        //    temperature and water levels
        this.conditions = element_conditions;
        this.popover = popover;
        this.font_scale = font_scale;

        this.patterns_initialized = false;
        this.gen_color_scales();
        this.initialize();
    }

    // Loop through conditions and check for color scale
    // If color scale exists, use d3 to generate domain and range of scale.
    gen_color_scales() {
        this.conditions.map(function(condition) {
            if ('color_scale' in condition && 'color_levels' in condition) {
                var color_scale = condition.color_scale;
                var color_levels = condition.color_levels;
                condition.color_scale = d3.scaleQuantile()
                    .domain([d3.min(color_levels), d3.max(color_levels)])
                    .range(color_scale);
            };
        });
    };

    // General initialze function
    initialize() {
        if (this.report_sel && !this.report_sel.empty()) {
            console.log(this.report_sel.node(), this.font_scale, this.conditions, this.description)
            this.update_functions.push(
                renderers.render_report(this.report_sel.node(), this.font_scale, this.conditions, this.description));
        }

        if (this.popover) {
            this.update_functions.push(renderers.render_popover(this.popover_div_sel, this.selectors,
                this.popover, this.font_scale));
        };

        this.initialize_hook();

        // Delete conditions since data is now bound to DOM
        delete this.conditions;
    }

    // General hook function for initialization
    initialize_hook() {};

    // Update function called at every time step
    update(x, trans_dur) {
        if (this.update_functions) {this.update_functions.map(function(f) {
            if (typeof f === "function"){f(x, trans_dur)}})
        };
    }
}

// Wrapper class for closed path elements
class Cell extends Element {
    initialize_hook() {
        var _cell = this;
        _cell.selectors.map(function(sel, i) {
            var pattern_id = 'pattern_' + _cell.ids[i];

            if (!_cell.patterns_initialized) {
                var prop_data = [];
                var order_prop = 'y';
                var props = [order_prop, 'color', 'opacity', 'overlay'];

                _cell.conditions.map(function(condition) {
                    var order_val, color, opacity, overlay;
                    var max_order = 1.01;

                    'overlay' in condition && condition.overlay ? overlay = condition.overlay : overlay = null;
                    if (condition.type == 'background') {
                        // background represents a changing cell background color only
                        // always 100% of the element height
                        prop_data.push(condition.data.map(function(d) {
                            return [max_order, condition.color_scale(d), condition.opacity, overlay]
                        }));
                    } else if (condition.type == 'levelstatic') {
                        // level_static represents a changing level in a cell that does not change color
                        prop_data.push(condition.data.map(function(d) {
                            var order_val = (Math.min((d - condition.min_height) /
                                (condition.max_height - condition.min_height)), 1);
                            return [order_val, condition.color, condition.opacity, overlay]
                        }));
                    } else if (condition.type == 'dynamiclevel') {
                        // level_dynamic represents a changing level in a cell that changes color
                        prop_data.push(condition.data.map(function(d, j) {
                            var order_val = Math.min((d - condition.min_height) /
                                (condition.max_height - condition.min_height), 1);
                            var color = condition.color_scale(condition.data_dynamic[j]);
                            return [order_val, color, condition.opacity, overlay]
                        }));
                    } else if (condition.type == 'logical') {
                        // logical represents a filled cell that alternates between two colors
                        // always 100% of element height
                        prop_data.push(condition.data.map(function(d) {
                            var color;
                            d ? color = condition.true_color : color = condition.false_color;
                            return [max_order, color, condition.opacity, overlay]
                        }));
                    } else if (condition.type == 'zonaly') {
                        // zonal_y represents a zonal model in the y direction
                        // number of zones dictated by len of 2nd axis
                        var prop_data_slice = [];
                        prop_data_slice = prop_data_slice.concat(condition.data.map(function(arr, j) {
                            return arr.map(function(d, k) {
                                var order_val = Math.min((d - condition.min_height) /
                                    (condition.max_height - condition.min_height), 1);
                                var color = condition.color_scale(condition.data_dynamic[j][k]);
                                return [order_val, color, condition.opacity, overlay]
                            })
                        }));
                        prop_data = prop_data.concat(d3.zip.apply(this, prop_data_slice));
                    }
                });

                // Zip data
                prop_data = d3.zip.apply(this, prop_data);

                // Apply pattern to each in sel list
                sel.each(function() {
                    _cell.update_functions.push(renderers.render_pattern(this, pattern_id, prop_data, 'fill'));
                });

            }
        });
    };
}

// Wrapper class for line (or open path) elements
class Line extends Element {
    initialize_hook() {
        var _line = this;
        _line.selectors.map(function(sel, i) {
            var pattern_id = 'pattern_' + _line.ids[i];
            var prop_data = [];

            if (!_line.patterns_initialized) {
                _line.conditions.map(function(condition) {
                    var order_val, color, opacity, overlay;
                    var max_order = 1.01;
                    var order_prop = 'y';
                    var props = [order_prop, 'color', 'opacity', 'overlay'];

                    var opacity = condition.opacity;
                    var overlay = null;

                    if (condition.type == 'equaly') {
                        // equal_y represents an open path element with equally sized patterns along the y axis
                        // number of y regions dictated by len of 2nd axis
                        var prop_data_slice = [];
                        var prop_data_slice = prop_data_slice.concat(condition.data.map(function(arr) {
                            return arr.map(function(d, k) {
                                var order_val = k / arr.length;
                                var color = condition.color_scale(d);
                                return [order_val, color, condition.opacity, overlay]
                            })
                        }));

                        prop_data = prop_data.concat(d3.zip.apply(this, prop_data_slice));
                    }
                });

                // Zip data
                prop_data = d3.zip.apply(this, prop_data);

                sel.each(function() {
                    _line.update_functions.push(renderers.render_pattern(this, pattern_id, prop_data, 'stroke'));
                });

            };
        });
    };
}

// Wrapper class for generating heatmaps
class Heatmap extends Element {
    initialize_hook() {
        var data = this.conditions[0].data;
        var color_scale = this.conditions[0].color_scale;
        var opacity = this.opacity;

        var _heatmap = this;
        _heatmap.selectors.map(function(sel) {
            sel.each(function() {
                _heatmap.update_functions.push(renderers.render_rect_heatmap(this, data, color_scale, opacity));
            });
        })
    }
}

// Wrapper class for state-type elements (e.g., show/hide)
class Toggle extends Element {
    initialize_hook() {
        var _toggle = this;
        _toggle.selectors.map(function(sel) {
            if (_toggle.conditions[0].type == 'showhide') {
                var data = _toggle.conditions[0].data;
                sel.datum(data);

                var update_func = function(x) {
                    data[x] || data[x] > 0 ? sel.transition().attr('opacity',1) : sel.transition().attr('opacity',0);
                };

                _toggle.update_functions.push(update_func)
            }
        });
    };
}

// Wrapper class for element reports
class Report extends Element {

}

// Wrapper class for tablular report
class Table extends Element {
    // Override the initialize function to render a table
    initialize() {
        var node = this.report_sel.node();
        var table_id = 'table_' + this.report_id;
        var tabular_data = this.conditions[0].tabular_data;
        var headers = this.conditions[0].headers;
        this.update_functions.push(renderers.render_table(node, table_id, tabular_data, headers, this.font_scale));
    }
}

// Wrapper class for legend
class Legend extends Element {
    // Override the initialize function to only render the legend
    initialize() {
        var color_scale = this.conditions[0].color_scale;
        var node = this.report_sel.node();
        var opacity = this.conditions[0].opacity;
        renderers.render_color_scale(node, color_scale, this.description, opacity, this.font_scale);
    }
}

var class_map = {
    "cell": Cell,
    "line": Line,
    "heatmap": Heatmap,
    "toggle": Toggle,
    "report": Report,
    "table": Table,
    "legend": Legend
};

function create_element(uuid, data, font_scale) {
    return new class_map[data.type](uuid, data.ids, data.description, data.conditions, data.report_id, 
        data.popover, font_scale)
}

module.exports = create_element;