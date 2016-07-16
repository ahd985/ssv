var num_format = require("./ssv_utilities.es6");

// Inheritable parent class of every element type
class Element {
    constructor(uuid, element_ids, element_description, element_conditions, report_id) {
        this.uuid = uuid;
        this.svg_selector = '#' + this.uuid + ' #ssv-svg';
        this.ids = element_ids;
        // -- Build list of selectors from ids
        this.selectors = [];
        for (var i in this.ids) {
            this.selectors.push('#' + this.uuid + ' #' + this.ids[i])
        };
        // -- Report id represents id of placement element for element report - Optional property
        this.report_id = report_id;
        this.report_selector = '#' + this.uuid + ' #' +  this.report_id;
        // -- Element description is printed at top of optional report
        this.description = element_description;
        // -- Array of element conditions - data types that describe simulation characteristics such as
        //    temperature and water levels
        this.conditions = element_conditions;

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

    // Report initialization function - called if report_id provided and report_initialized == false
    initialize_report() {
        var sel = d3.select(this.report_selector);
        var parent = d3.select(sel.node().parentNode);

        if (!sel.empty()) {
            // Get bounding box of placement element
            // Placement element height is not used - height of legend is ultimately determined by user specified
            // font size
            var bbox = sel.node().getBBox();
            var width = bbox.width;
            var x = bbox.x;
            var y = bbox.y;

            var header_em = 1.2;
            var report_em = 1;
            var margin = 0.1;

            // Set text and background fill colors
            var header_color = '#FFC107';
            var description_color = '#00BFA5';
            var zone_color = '#FFFFFF';
            var unit_color = '#FFFFFF';
            var val_color = '#FFEB3B';
            var report_fill = '#616161';
            var sizing_text = 'Sizing...';

            // Hide placement element
            sel.style('visibility', 'hidden');

            // Reference font scale from svg attr
            var font_scale = d3.select(this.svg_selector).attr('font-scale');

            // Append new parent element for report
            var report = parent.append('g')
                .attr('transform', 'translate(' + x + ',' + y + ')')
                .append('g')
                .attr('id', 'ssv-report')
                .attr('font-size', font_scale.toString() + 'em');

            // Create report title outline
            var title_outline = report.append('rect')
                .attr('width', width)
                .attr('fill', report_fill)
                .attr('fill-opacity', '1')
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'after-edge');

            // Create report title text
            var title_text = report.append('text')
                .attr('width', width)
                .attr('fill-opacity', '1')
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'after-edge')
                .attr('x', width / 2)
                .attr('fill', header_color)
                .style('font-size', header_em.toString() + 'em')
                .text(sizing_text);

            // Resize header and outline based on text height
            var title_text_height = title_text.node().getBBox().height;
            title_text.attr('y', title_text_height * (1 + margin));
            var report_text_height = title_text_height * report_em / header_em;
            var y_count = title_text_height * (1 + 2*margin);
            title_outline.attr('height', y_count);
            var y_text = report_text_height * (1 + 1*margin);
            var y_row = y_text + report_text_height * margin;
            title_text.text(this.description);

            // Create value output box outlines (backgrounds) and add text boxes
            // This code adds the condition description, value, and unit (if applicable) in a row by row fashion
            for (var i = 0; i < this.conditions.length; i++) {
                var condition = this.conditions[i];

                if ("report" in condition && condition.report) {
                    var condition_data=condition.data;
                    var data_j_len = 1;
                    if (condition_data[0].constructor === Array) {
                        data_j_len = condition_data[0].length
                    }

                    // Box outline (background)
                    report.append('rect')
                        .attr('width', width)
                        .attr('fill', report_fill)
                        .attr('fill-opacity', '1')
                        .attr('text-anchor', 'middle')
                        .attr('alignment-baseline', 'after-edge')
                        .attr('y', y_count)
                        .attr('height', ((data_j_len + 1)*y_row));

                    // Condition description text
                    report.append('text')
                        .attr('width', width)
                        .attr('fill-opacity', '1')
                        .attr('text-anchor', 'middle')
                        .attr('alignment-baseline', 'after-edge')
                        .attr('x', width / 2)
                        .attr('y', y_count + y_text)
                        .attr('fill', description_color)
                        .style('font-size', report_em.toString() + 'em')
                        .attr('font-style', 'oblique')
                        .text(condition.description);

                    // Check if we have a section label property in the condition.  If not, default to 'Section'.
                    var section_label;
                    'section_label' in condition && condition.section_label != '' ?
                        section_label = condition.section_label: section_label = 'Section';

                    y_count += y_row;

                    // Loop through condition data axis #2 and add row for each entry
                    for (var j = 0; j < data_j_len; j++) {
                        // Do we have a defined second access in the data?  If not, we only need 2 boxes for the section
                        // (value and unit) else we need 3 (section_label, value, and unit)
                        var num_sections;
                        data_j_len > 1 ? num_sections = 3 : num_sections = 2;

                        // Add Zone # if data_j_len > 1
                        if (data_j_len > 1) {
                            report.append('text')
                                .attr('width', width)
                                .attr('fill-opacity', '1')
                                .attr('text-anchor', 'middle')
                                .attr('alignment-baseline', 'after-edge')
                                .attr('x', width / (num_sections * 2))
                                .attr('y', y_count + y_text)
                                .attr('fill', zone_color)
                                .style('font-size', report_em.toString() + 'em')
                                .text(section_label + ' #' + (j + 1).toString());
                        }

                        // Value text
                        var datum;
                        data_j_len > 1 ? datum = condition_data.map(function(i) {return num_format(i[j])}) :
                            datum = condition_data.map(function(i) {return num_format(i)});
                        report.append('text')
                            .attr('width', width)
                            .attr('fill-opacity', '1')
                            .attr('text-anchor', 'middle')
                            .attr('alignment-baseline', 'after-edge')
                            .attr('class', 'value-text')
                            .datum(datum)
                            .attr('x', width / (2 * (4 - num_sections)))
                            .attr('y', y_count + y_text)
                            .attr('fill', val_color)
                            .style('font-size', report_em.toString() + 'em');

                        // Unit text
                        report.append('text')
                            .attr('width', width)
                            .attr('fill-opacity', '1')
                            .attr('text-anchor', 'middle')
                            .attr('alignment-baseline', 'after-edge')
                            .attr('x', (num_sections * 2 - 1) * width / (2 * num_sections))
                            .attr('y', y_count + y_text)
                            .attr('fill', unit_color)
                            .style('font-size', report_em.toString() + 'em')
                            .text(condition.unit);

                        // Increment em_count by ems used per row
                        y_count += y_row;
                    }
                }
            }
        }

        // Report is initialized - prevent further initialization
        this.report_initialized = true
    };

    // Function to update report given index in x-series
    update_report(x) {
        // Initialize report if not initialized
        if (!this.report_initialized) {this.initialize_report()}

        // Get parent of element with report_id and select all value text in report
        var parent = d3.select(d3.select(this.report_selector).node().parentNode);
        var value_texts = parent.selectAll('.value-text')
            .text(function(d) {return d[x]});
    };

    // Function to initialize patterns for element
    initialize_pattern(sel, pattern_id, prop_data, style_apply) {
        // Add svg defs section if none exist
        var svg = d3.select(this.svg_selector);
        if (svg.select('defs').empty()) {
            svg.append('defs')
        }

        // Sort prop data and denormalize order prop
        var norm_val = sel.getBBox().height;
        if (prop_data[0].length > 1) {
            prop_data = prop_data.map(function(t) {return t.sort(function(a,b) {return -(a[0] - b[0])})});
        }
        var prop_data = prop_data.map(function(t) {
            return t.map(function(d) {
                var order = Math.max(0, 1 - d[0]) * norm_val;
                return [order].concat(d.slice(1, d.length))
            })
        });

        // Build pattern and apply initial state
        var defs = d3.select('#' + this.uuid + ' svg defs');
        var pattern = defs.append('pattern')
            .attr('id', pattern_id)
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('patternContentUnits', 'userSpaceOnUse')
            .datum(prop_data);

        var pattern_data = pattern.selectAll()
            .data(function(t) {return t[0]})
            .enter();

        pattern_data.each(function() {
            // Add base pattern
            pattern.append('rect')
                .attr('id', 'base')
                .attr('x','0')
                .attr('width','100%')
                .attr('height', '100%');

            // Add transition zones
            pattern.append('rect')
                .attr('id', 'transition')
                .attr('x','0')
                .attr('width','100%')
                .attr('height','1px')
                .attr('fill', '#FFFFFF');

            // Add overlays
            pattern.append('rect')
                .attr('id', 'overlay')
                .attr('x','0')
                .attr('width', '100%')
                .attr('height', '100%');
        });

        var el = d3.select(sel);
        // Set to stroke or fill based on style_apply
        style_apply == 'fill' ? el.style('fill', 'url(#' + pattern_id + ')') :
            el.style('stroke', 'url(#' + pattern_id + ')');

        // Set initial opacities to 1
        el.style('fill-opacity', 1);
        el.style('opacity', 1);
    };

    update_pattern(x, sel, pattern_id) {
        var pattern = d3.select('#' + this.uuid + ' #' + pattern_id);

        // Update base pattern
        pattern.selectAll('#base')
            .data(function(t) {return t[x]})
            .transition()
            .attr('y', function(d) {return d[0]})
            .style('fill', function(d) {return d[1]})
            .style('opacity', function(d) {return d[2]});

        // Update transition zones
        pattern.selectAll('#transition')
            .data(function(t) {return t[x]})
            .transition()
            .attr('y', function(d) {if (d[0] > 0) {return d[0]} else {return '-1%' }})
            .style('opacity', function(d) {return d[2]});

        // Update overlays
        pattern.selectAll('#overlay')
            .data(function(t) {return t[x]})
            .transition()
            .attr('fill', function(d) {if(d[3] == null) {return 'none'} else {return 'url(#' + d[3] + ')'}})
            .attr('y', function(d) {return d[0]})
            .style('opacity', function(d) {return d[2]});
    }
}

// Wrapper class for closed path elements
class Cell extends Element {
    constructor(uuid, cell_ids, cell_description, cell_conditions, cell_report_id) {
        super(uuid, cell_ids, cell_description, cell_conditions, cell_report_id)
    }

    update(x) {
        var _cell = this;
        _cell.selectors.map(function(d, i) {
            var sels = d3.selectAll(d);
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

                // Apply pattern to each in sels list
                sels.each(function() {
                    _cell.initialize_pattern(this, pattern_id, prop_data, 'fill');
                });
            }

            sels.each(function() {
                _cell.update_pattern(x, this, pattern_id);
            });
        });

        _cell.patterns_initialized = true;
        if (_cell.report_id) {_cell.update_report(x)}
    };
}

// Wrapper class for line (or open path) elements
class Line extends Element {
    constructor(uuid, line_ids, line_description, line_conditions, line_report_id) {
        super(uuid, line_ids, line_description, line_conditions, line_report_id)
    }

    update(x) {
        var _line = this;
        _line.selectors.map(function(d, i) {
            var sels = d3.selectAll(d);
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

                sels.each(function() {
                    _line.initialize_pattern(this, pattern_id, prop_data, 'stroke')
                });
            };
            sels.each(function() {
                _line.update_pattern(x, this, pattern_id);
            });
        });

        _line.patterns_initialized = true;
        if (_line.report_id) {_line.update_report(x)}
    };
}

// Wrapper class for generating heatmaps
class Heatmap extends Element {
    constructor(uuid, heatmap_ids, heatmap_description, heatmap_conditions, heatmap_report_id) {
        super(uuid, heatmap_ids, heatmap_description, heatmap_conditions, heatmap_report_id);

        this.conditions[0].data[0].constructor == Array ? this.conditions.num_sections =
            this.conditions[0].data[0].length : this.conditions[0].num_sections = 1;

        this.initialize();
    }

    initialize() {
        var initial_vals = this.conditions[0].data[0];

        var _heatmap = this;
        _heatmap.selectors.map(function(d) {
            var sel = d3.select(d);
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
        _heatmap.selectors.map(function(d) {
            var sel = d3.select(d);
            var parent = d3.select(sel.node().parentNode);

            var g = parent.select('g').select('g');

            var x_section = g.selectAll('.x_section').data(function(d) {return d[x]});
            x_section.selectAll('.bin')
                .data(function (d) { return d; })
                .transition()
                .style('fill', function(d) {return d});
        });

        if (_heatmap.report_id) {_heatmap.update_report(x)}
    };
}

// Wrapper class for state-type elements (e.g., show/hide)
class Toggle extends Element {
    constructor(uuid, toggle_ids, toggle_description, toggle_conditions, toggle_report_id) {
        super(uuid, toggle_ids, toggle_description, toggle_conditions, toggle_report_id);
        this.data_initialized = false;
    }

    update(x) {
        var _toggle = this;
        _toggle.selectors.map(function(d) {
            var sel = d3.selectAll(d);

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
        if (_toggle.report_id) {_toggle.update_report(x)}
    };
}

// Wrapper class for element reports
class Report extends Element {
    constructor(uuid, report_ids, report_description, report_conditions, report_id) {
        super(uuid, report_ids, report_description, report_conditions, report_id);
    }

    update(x) {
        if (this.report_id) {this.update_report(x)}
    };
}

// Wrapper class for tablular report
class Table extends Element {
    constructor(uuid, report_ids, report_description, report_conditions, report_id) {
        super(uuid, report_ids, report_description, report_conditions, report_id);
    }

    // If we have tabular (table-like) data overwrite base element report function
    initialize_report() {
        var sel = d3.select(this.report_selector);
        var parent = d3.select(sel.node().parentNode);

        if (!sel.empty()) {
            // Get bounding box of placement element
            // Placement element height is not used - height of legend is ultimately determined by user specified
            // font size
            var bbox = sel.node().getBBox();
            var width = bbox.width;
            var x = bbox.x;
            var y = bbox.y;
            var table_id = 'table_' + this.report_id;

            // Hide placement element
            sel.style('visibility', 'hidden');

            // Reference font scale from svg attr
            var font_scale = d3.select(this.svg_selector).attr('font-scale');

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

            // Add table header
            table.append('thead').append('tr')
                .selectAll()
                .data(this.conditions[0].headers)
                .enter()
                .append('th')
                .text(function(d) {return d})
                .style('font-size', font_scale.toString() + 'em');
            }

            // Add tbody
            table.append('tbody');

        // Report is initialized - prevent further initialization
        this.report_initialized = true
    };

    update_report(x) {
        if (!this.report_initialized) {this.initialize_report()};

        var table_id = 'table_' + this.report_id;
        var font_scale = d3.select(this.svg_selector).attr('font-scale');
        var table = d3.select('#' + this.uuid + ' #' + table_id + ' tbody');

        // Add content
        var row = table.selectAll('.content-row')
            .data(function(d) {return d[x]});
        row.exit().remove();
        row.enter()
            .append('tr')
            .merge(row)
            .attr('class', 'content-row');

        var cell = table.selectAll('.content-row').selectAll('.content-cell')
            .data(function(d) {return d});
        cell.exit().remove();
        cell.enter()
            .append('td')
            .merge(cell)
            .text(function(d) {return d})
            .style('font-size', font_scale.toString() + 'em')
            .attr('class', 'content-cell');
    };

    update(x) {
        if (this.report_id) {this.update_report(x)}
    };
}

// Wrapper class for legend
class Legend extends Element {
    constructor(uuid, legend_ids, legend_description, legend_conditions, report_id) {
        super(uuid, legend_ids, legend_description, legend_conditions, report_id)
    }

    // Overwrite base element report function to show color scale
    initialize_report() {
        var sel = d3.select(this.report_selector);
        var parent = d3.select(sel.node().parentNode);

        var font_scale = d3.select(this.svg_selector).attr('font-scale');

        // If scale selector not empty fill it in with color scale legend
        if (!sel.empty()) {
            // Hide original placement element
            sel.style('visibility', 'hidden');

            // Get bounding box of placement element
            // Placement element height is not used - height of legend is ultimately determined by user specified
            // font size
            var bbox = sel.node().getBBox();
            var width = bbox.width;
            var pos_x = bbox.x;
            var pos_y = bbox.y;

            // Append legend outline to parent of placement element
            // Set legend font size to font scale property
            var parent = d3.select(sel.node().parentNode);
            var legend = parent.append('g').attr('transform', 'translate(' + pos_x + ',' + pos_y + ')')
                .append('g')
                .attr('font-size', font_scale + 'em')
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
            var margin = 0.1

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
        if (this.report_id) {this.update_report(x)}
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

function create_element(uuid, data) {
    return new class_map[data.type](uuid, data.ids, data.description, data.conditions, data.report_id);
}

module.exports = create_element;