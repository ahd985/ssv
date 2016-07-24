var renderers = require("./ssv_renderers.es6");

// Inheritable parent class of every element type
class Element {
    constructor(uuid, element_ids, element_description, element_conditions, report_id, font_scale) {
        this.uuid = uuid;

        // -- Build list of selectors from ids
        this.selectors = [];
        if (element_ids) {
            this.ids = element_ids;
            this.selectors = element_ids.map(function(d) {
                return d3.select(`#${uuid} #${d}`)
            });
        }
        this.pattern_update_functions = [];

        // -- Report id represents id of placement element for element report - Optional property
        this.report_sel = d3.select(`#${uuid} #${report_id}`);
        // -- Element description is printed at top of optional report
        this.description = element_description;
        // -- Array of element conditions - data types that describe simulation characteristics such as
        //    temperature and water levels
        this.conditions = element_conditions;
        this.font_scale = font_scale;

        this.patterns_initialized = false;
        this.report_initialized = false;
        this.initialize_color_scales();
    }

    // Loop through conditions and check for color scale
    // If color scale exists, use d3 to generate domain and range of scale.
    initialize_color_scales() {
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

    // Function to update report given index in x-series
    update_report(x) {
        // Initialize report if not initialized
        if (!this.report_initialized) {
            this.report_update_func = renderers.get_report_update_func(this.report_sel, this.font_scale, this.conditions, this.description);
            this.report_initialized = true;
        }

        this.report_update_func(x)
    };

    update_pattern(x) {
        this.pattern_update_functions.map(function(f) {
            f(x)
        });
    }
}

// Wrapper class for closed path elements
class Cell extends Element {
    update(x) {
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

                    'overlay' in condition ? overlay = condition.overlay : overlay = null;
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
                    _cell.pattern_update_functions.push(renderers.get_pattern_update_func(this, pattern_id, prop_data, 'fill'));
                });

            }
        });
        _cell.update_pattern(x);
        _cell.patterns_initialized = true;
        if (!_cell.report_sel.empty()) {_cell.update_report(x)}
    };
}

// Wrapper class for line (or open path) elements
class Line extends Element {
    update(x) {
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
                    _line.pattern_update_functions.push(renderers.get_pattern_update_func(this, pattern_id, prop_data, 'stroke'));
                });

            };
        });
        _line.update_pattern(x);
        _line.patterns_initialized = true;
        if (!_line.report_sel.empty()) {_line.update_report(x)}
    };
}

// Wrapper class for generating heatmaps
class Heatmap extends Element {
    constructor(...args) {
        super(...args);

        this.conditions[0].data[0].constructor == Array ? this.conditions.num_sections =
            this.conditions[0].data[0].length : this.conditions[0].num_sections = 1;

        this.initialize();
    }

    initialize() {
        var initial_vals = this.conditions[0].data[0];

        var _heatmap = this;
        _heatmap.selectors.map(function(sel) {
            var parent = d3.select(sel.node().parentNode);

            var bbox = sel.node().getBBox();

            // Assume heatmap occupies entire placement element bounding box
            var x = d3.scaleLinear().domain([0, initial_vals[0].length]).range([0, bbox.width]);
            var y = d3.scaleLinear().domain([0, initial_vals.length]).range([0, bbox.height]);
            var g = parent.append('g')
                .attr('transform', 'translate(' + bbox.x + ',' + bbox.y + ')')
                .append('g');

            // go through data and apply color scale
            var scale = _heatmap.conditions[0].color_scale;
            var data = _heatmap.conditions[0].data.map(function(arr_2d) {
                return arr_2d.map(function(arr) {
                    return arr.map(function(d) {
                        return scale(d)
                    });
                });
            });
            g.data([data]);

            // Create cross-sectional slice along the x axis
            var x_section = g.selectAll()
                .data(function(d) {return d[0]})
                .enter()
                .append('g')
                .attr('class', 'x_section')
                .attr('stroke', 'black')
                .attr('stroke-width','1px');

            // Add a color bin for every y slot across the axis
            x_section.selectAll('.bin')
                .data(function (d) {return d})
                .enter().append('rect')
                .attr('class', 'bin')
                .attr('x', function (d, i) {return x(i)})
                .attr('width', function (d, i) {return  x(i + 1) - x(i)})
                .style('fill', function (d) {return d})
                .style('fill-opacity', function (d) {return _heatmap.conditions[0].opacity})
                .attr('height', bbox.height / (initial_vals.length));

            x_section.each(function (d, i) {d3.select(this).selectAll(".bin").attr("y", y(i))});
        });
    };

    update(x) {
        var _heatmap = this;
        _heatmap.selectors.map(function(sel) {
            var parent = d3.select(sel.node().parentNode);

            var g = parent.select('g').select('g');

            var x_section = g.selectAll('.x_section').data(function(d) {return d[x]});
            x_section.selectAll('.bin')
                .data(function (d) { return d; })
                .transition()
                .style('fill', function(d) {return d});
        });

        if (!_heatmap.report_sel.empty()) {_heatmap.update_report(x)}
    };
}

// Wrapper class for state-type elements (e.g., show/hide)
class Toggle extends Element {
    constructor(...args) {
        super(...args);
        this.data_initialized = false;
    }

    update(x) {
        var _toggle = this;
        _toggle.selectors.map(function(sel) {
            if (!_toggle.data_initialized) {
                if (_toggle.conditions[0].type == 'showhide') {
                    sel.datum(_toggle.conditions[0].data)
                }
            }

            var data = sel.datum();
            if (data[x] || data[x] > 0) {
                sel.transition().attr('opacity',1)
            } else {
                sel.transition().attr('opacity',0)
            }
        });

        _toggle.data_initialized = true;
        if (!_toggle.report_sel.empty()) {_toggle.update_report(x)}
    };
}

// Wrapper class for element reports
class Report extends Element {
    update(x) {
        if (!this.report_sel.empty()) {this.update_report(x)}
    };
}

// Wrapper class for tablular report
class Table extends Element {
    // If we have tabular (table-like) data overwrite base element report function
    initialize_report() {
        var parent = d3.select(this.report_sel.node().parentNode);

        if (!this.report_sel.empty()) {
            // Get bounding box of placement element
            // Placement element height is not used - height of legend is ultimately determined by user specified
            // font size
            var bbox = this.report_sel.node().getBBox();
            var width = bbox.width;
            var x = bbox.x;
            var y = bbox.y;
            var table_id = 'table_' + this.report_id;

            // Hide placement element
            this.report_sel.style('visibility', 'hidden');

            // Append new parent element for table
            var table = parent.append('g')
                .attr('transform', 'translate(' + x + ',' + y + ')')
                .append('foreignObject')
                .attr('id', 'ssv-table')
                .attr("width", width)
                .attr("height", 500)
                .append('xhtml:table')
                .attr('class', 'table')
                .attr('id', table_id)
                .datum(this.conditions[0].data);

            var self = this;
            // Add table header
            table.append('thead').append('tr')
                .selectAll()
                .data(this.conditions[0].headers)
                .enter()
                .append('th')
                .text(function(d) {return d})
                .style('font-size', self.font_scale.toString() + 'em');
            }

            // Add tbody
            table.append('tbody');

        // Report is initialized - prevent further initialization
        this.report_initialized = true
    };

    update_report(x) {
        if (!this.report_initialized) {this.initialize_report()};

        var table_id = 'table_' + this.report_id;
        var table = d3.select('#' + this.uuid + ' #' + table_id + ' tbody');

        // Add content
        var row = table.selectAll('.content-row')
            .data(function(d) {return d[x]});
        row.exit().remove();
        row.enter()
            .append('tr')
            .merge(row)
            .attr('class', 'content-row');

        var self = this;
        var cell = table.selectAll('.content-row').selectAll('.content-cell')
            .data(function(d) {return d});
        cell.exit().remove();
        cell.enter()
            .append('td')
            .merge(cell)
            .text(function(d) {return d})
            .style('font-size', self.font_scale.toString() + 'em')
            .attr('class', 'content-cell');
    };

    update(x) {
        if (!this.report_sel.empty()) {this.update_report(x)}
    };
}

// Wrapper class for legend
class Legend extends Element {
    // Overwrite base element report function to show color scale
    initialize_report() {
        var parent = d3.select(this.report_sel.node().parentNode);

        // If scale selector not empty fill it in with color scale legend
        if (!this.report_sel.empty()) {
            // Hide original placement element
            this.report_sel.style('visibility', 'hidden');

            // Get bounding box of placement element
            // Placement element height is not used - height of legend is ultimately determined by user specified
            // font size
            var bbox = this.report_sel.node().getBBox();
            var width = bbox.width;
            var pos_x = bbox.x;
            var pos_y = bbox.y;

            // Append legend outline to parent of placement element
            // Set legend font size to font scale property
            var self = this;
            var parent = d3.select(this.report_sel.node().parentNode);
            var legend = parent.append('g').attr('transform', 'translate(' + pos_x + ',' + pos_y + ')')
                .append('g')
                .attr('font-size', self.font_scale + 'em')
                .attr('stroke', 'black')
                .attr('stroke-width','0.01em');

            // Calculate discrete color bin scale
            var color_scale = this.conditions[0].color_scale;
            var scale_len = color_scale.range().length;
            var x = d3.scaleLinear()
                .domain([0, scale_len])
                .range([0, width]);

            // Generate legend
            // 'header_em' represents the color scale title font size
            // 'label' represents the color scale bin values font size
            var header_em = 1.5;
            var label_em = 1;
            var margin = 0.1;

            // -- Append header text
            var legend_text = legend.append('text')
                .text(this.description)
                .attr('x', (width/2))
                .attr('y', '1em')
                .attr('text-anchor', 'middle')
                .attr('font-size', header_em.toString() + 'em');
            var legend_text_height = legend_text.node().getBBox().height;

            // -- Generate range of colors required for legend
            var keys = legend.selectAll('rect').data(color_scale.range());

            // -- Append a rect for every color on the legend
            // -- Rects are same height as header text
            keys.enter().append('rect')
                .attr('x', function(d,i) {return x(i)})
                .attr('y', (1 + margin) * legend_text_height)
                .attr('width', function(d,i) {return x(i+1) - x(i)})
                .attr('height', legend_text_height)
                .attr('fill', function(d) {return d})
                .style('fill-opacity', this.conditions[0].opacity)
                .attr('font-size', header_em.toString() + 'em');

            // -- Append value text immediately below the left-most area of every color rect
            keys.enter().append('text')
                .text(function(d) {return color_scale.invertExtent(d)[0].toFixed(0)})
                .attr('x', function(d,i) {return x(i)})
                .attr('y', legend_text_height*(2 + margin + label_em / header_em * (1 + margin)))
                .attr('text-anchor', 'middle')
                .attr('font-size', label_em.toString() + 'em');
        }

        // Report is initialized - prevent further initialization
        this.report_initialized = true
    };

    update_report(x) {
        if (!this.report_initialized) {this.initialize_report()}
    };

    update(x) {
        if (!this.report_sel.empty()) {this.update_report(x)}
    };
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
    return new class_map[data.type](uuid, data.ids, data.description, data.conditions, data.report_id, font_scale);
}

module.exports = create_element;