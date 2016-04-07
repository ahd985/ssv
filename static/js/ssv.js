// Main function to generate contextual information of ssv setup
// Called on $(document).ready()
function ElementContext() {
    // Initialize properties
    _context = this;
    // -- Element_data is the 'y' data representing svg elements that corresponds to the x_series data
    this.x_series = {{ x_series }};
    this.element_data = {{ element_data }};
    // -- This data provides for rendering graphical color scale legends within the svg
    {% if color_scales_data %}
        this.color_scales = {{ color_scales_data }};
    {% else %}
        this.color_scales = [];
    {% endif %}

    this.elements = [];
    // -- Simulation interface properties - control automatic play, play speed, etc
    this.play_enabled = false;
    this.current_x = 0;
    this.play_speed = 1.0;
    this.max_speed = 5.0;
    this.min_speed = 1.0;
    this.speed_step = 1.0;
    // -- Pattern overlay (e.g., water) data provided by Python
    this.svg_overlays = {% include 'static/data/ssv-overlays.json' %}

    // Initializer of svg pattern overlays (e.g., water pattern overlays).  These are inserted into
    // the svg 'defs' child for reference by svg elements.
    this.initialize_overlays = function() {
        if (d3.select('svg defs').empty()) {
            svg.append('defs')
        }

        for (var i in _context.svg_overlays) {
            d3.select('svg defs').html(d3.select('svg defs').html() + _context.svg_overlays[i])
        }
    }

    // Function to calculate scale of svg view box to parent svg div
    // This is required to scale user input font size correctly
    this.set_font_scale = function() {
        _context.font_scale = parseFloat(d3.select('#ssv-svg').attr('viewBox').split(' ')[3]) /
            d3.select('.sim-visual').node().getBoundingClientRect().height;

        d3.select('#ssv-svg').attr('font-scale', _context.font_scale)
    };

    this.initialize_elements = function() {
        for (var element_type in this.element_data) {
            for (var element in this.element_data[element_type]) {
                element = this.element_data[element_type][element];
                if (element_type == 'cell') {
                    this.elements.push(new Cell(element.ids, element.description,
                        element.conditions, element.report_id))
                } else if (element_type == 'line') {
                    this.elements.push(new Line(element.ids, element.description,
                        element.conditions, element.report_id))
                } else if (element_type == 'heatmap') {
                    this.elements.push(new Heatmap(element.ids, element.description,
                        element.conditions, element.report_id))
                } else if (element_type == 'toggle') {
                    this.elements.push(new Toggle(element.ids, element.description,
                        element.conditions, element.report_id))
                } else if (element_type == 'report') {
                    this.elements.push(new Report(element.ids, element.description,
                        element.conditions, element.report_id))
                } else if (element_type == 'table') {
                    this.elements.push(new Table(element.ids, element.description,
                        element.conditions, element.report_id))
                }
            }
        }

        // Delete this.element_data to reduce file size
        delete this.element_data;

        // Draw elements at x index of 0
        this.update_elements(0);
    };

    // Function to tell all manipulated element classes to update rendering given index of this.x_series
    this.update_elements = function(x) {
        $('#x-series-val').html(this.x_series[x]);
        for (var element in _context.elements) {
            _context.elements[element].update(x);
        }
    };

    // Initializer function of slider for ssv control bar using Foundation
    this.initialize_slider = function() {
        $('.range-slider').attr('data-options', 'initial: 0; start: 0; end: ' + (this.x_series.length - 1).toString());
        $(document).foundation();
        $('[data-slider]').on('change.fndtn.slider', function(){
            _context.current_x = Math.round($('.range-slider').attr('data-slider'));
            _context.update_elements(_context.current_x);
        });

        // Clicking on play button automates the forward run of the x_series
        $('#play-button').click(function() {
            if (_context.play_enabled) {
                _context.play_enabled = false;
                $('#pause-icon').attr('style', 'display:none');
                $('#play-icon').attr('style', '');
            } else {
                _context.play_enabled = true;
                $('#pause-icon').attr('style', '');
                $('#play-icon').attr('style', 'display:none');
                if (_context.current_x == _context.x_series.length - 1) {
                    _context.current_x = 0;
                    $('.range-slider').foundation('slider', 'set_value', _context.current_x);
                }
                _context.x_series_forward()
            }
        });

        // Clicking on the speed button changes the speed of play
        $('#speed-button').click(function() {
            if (_context.play_speed == _context.max_speed) {
                _context.play_speed = _context.min_speed
            } else {
                _context.play_speed += _context.speed_step
            }
            $('#speed-val').html(_context.play_speed.toString() + 'x')
        })
    };

    // Function to auto update elements based on current x_series position and selected play speed
    this.x_series_forward = function () {
        window.setTimeout(function() {
            if (_context.play_enabled && _context.current_x < _context.x_series.length) {
                _context.current_x += 1;
                $('.range-slider').foundation('slider', 'set_value', _context.current_x);
                _context.update_elements(_context.current_x);


                if (_context.current_x < _context.x_series.length - 1) {
                    _context.x_series_forward()
                } else {
                    $('#play-button').trigger('click')
                }
            }
        }, 1000 / this. play_speed);
    };

    // Initializer of pan and zoom functionality
    this.initialize_pan_zoom = function() {
        // Add border to svg to outline zoom/pan zone
        var ssv_svg = d3.select('#ssv-svg');
        ssv_svg.append('rect')
            .attr('height', '100%')
            .attr('width', '100%')
            .style('stroke', 'black')
            .style('fill', 'none')
            .style('stroke-width', '2px');

        // Get svg, svg parent div dimensions
        var viewbox = ssv_svg.attr('viewBox').split(' ');
        var svg_bbox = ssv_svg.node().getBBox();
        var x1 = parseFloat(viewbox[0]);
        var x2 = parseFloat(viewbox[2]);
        var y1 = parseFloat(viewbox[1]);
        var y2 = parseFloat(viewbox[3]);

        var div_bbox = d3.select('.sim-visual').node().getBoundingClientRect();

        var max_width = (x2 - x1);
        var max_height = (y2 - y1);

        // Apply overlay to control zoom/pan;
        var ssv_overlay = d3.select('#ssv-overlay')
            .attr('y', svg_bbox.y)
            .attr('height', svg_bbox.height)
            .attr('x', svg_bbox.x)
            .attr('width', svg_bbox.width);

        // Apply zoom/pan features and pan limit
        var zoom_container = d3.select('#zoom-container');
        var zoom = d3.behavior.zoom()
            .scale(1)
            .scaleExtent([1, 8])
            .on('zoom', function() {
                var scale = d3.event.scale;
                var tx = Math.max(d3.event.translate[0], -(x2 * scale - max_width));
                var tx = Math.min(tx, x1);
                var ty = Math.max(d3.event.translate[1], -(y2 * scale - max_height));
                var ty = Math.min(ty, y1);

                zoom.translate([tx,ty]);
                zoom_container.attr('transform', 'translate(' + [tx,ty] + ')scale(' + scale + ')')
            });

        d3.select('#ssv-overlay').call(zoom);
    };

    this.build_color_scales = function() {
        // Loop through all color scale data
        for (var i in _context.color_scales) {
            var scale = _context.color_scales[i];
            var sel = d3.select('#' + scale.id);

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
                    .append('g').attr('font-size', _context.font_scale + 'em');

                // Calculate discrete color bin scale
                var color_scale = d3.scale.quantile().domain([d3.min(scale.levels), d3.max(scale.levels)])
                    .range(scale.scale);
                var scale_len = color_scale.range().length;
                var x = d3.scale.linear()
                    .domain([0, scale_len])
                    .range([0, width]);

                // Generate legend
                // 'header_em' represents the color scale title font size
                // 'label' represents the color scale bin values font size
                var header_em = 1.5;
                var label_em = 1;
                var margin = 0.1;

                // -- Append header text
                legend_text = legend.append('text')
                    .text(scale.desc)
                    .attr('x', (width/2))
                    .attr('y', '1em')
                    .attr('text-anchor', 'middle')
                    .attr('font-size', header_em.toString() + 'em');
                legend_text_height = legend_text.node().getBBox().height;

                // -- Generate range of colors required for legend
                var keys = legend.selectAll('rect').data(color_scale.range());

                // -- Append a rect for every color on the legend
                // -- Rects are same height as header text
                keys.enter().append('rect')
                    .attr('x', function(d,i) {return x(i)})
                    .attr('y', (1 + margin) * legend_text_height)
                    .attr('width', function(d,i) {return x(i+1) - x(i)})
                    .attr('height', legend_text_height)
                    .style('fill', function(d) {return d})
                    .attr('font-size', header_em.toString() + 'em');;

                // -- Append value text immediately below the left-most area of every color rect
                keys.enter().append('text')
                    .text(function(d) {return color_scale.invertExtent(d)[0].toFixed(0)})
                    .attr('x', function(d,i) {return x(i)})
                    .attr('y', legend_text_height*(2 + margin + label_em / header_em * (1 + margin)))
                    .attr('text-anchor', 'middle')
                    .attr('font-size', label_em.toString() + 'em');
            }
        }
    };

    // Call all initialization functions
    this.initialize_overlays();
    this.set_font_scale();
    this.initialize_elements();
    this.initialize_slider();
    this.initialize_pan_zoom();
    this.build_color_scales();
}

// Inheritable parent class of every element type
function Element(element_ids, element_description, element_conditions, report_id) {
    this.ids = element_ids;
    // -- Build list of selectors from ids
    this.selectors = [];
    for (var i in this.ids) {
        this.selectors.push('#' + this.ids[i])
    }
    // -- Report id represents id of placement element for element report - Optional property
    this.report_id = report_id;
    // -- Element description is printed at top of optional report
    this.description = element_description;
    // -- Array of element conditions - data types that describe simulation characteristics such as
    //    temperature and water levels
    this.conditions = element_conditions;

    this.report_initialized = false;

    // Loop through conditions and check for color scale
    // If color scale exists, use d3 to generate domain and range of scale.
    for (var i in this.conditions) {
        condition = this.conditions[i];
        if ('color_scale' in condition && 'color_levels' in condition) {
            var color_scale = condition.color_scale;
            var color_levels = condition.color_levels;
            condition.color_scale = d3.scale.quantile()
                .domain([d3.min(color_levels), d3.max(color_levels)])
                .range(color_scale);
        }
    }

    // Number formatting function for report output
    this.num_format = function(val) {
        if (val >= 1000 || val < 0.01) {
            return d3.format('.1e')(val)
        } else {
            return d3.format('.2f')(val)
        }
    };

    // Report initialization function - called if report_id provided and report_initialized == false
    this.initialize_report = function() {
        var sel = d3.select('#' + this.report_id);
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

            // Create base attributes for report elements
            var base_attr = {'x':0, 'y':0, 'width':width, 'fill':report_fill, 'fill-opacity':'1',
                'text-anchor':'middle', 'alignment-baseline':'after-edge'};

            // Hide placement element
            sel.style('visibility', 'hidden');

            // Reference font scale from svg attr
            var font_scale = d3.select('#ssv-svg').attr('font-scale');

            // Append new parent element for report
            var g = parent.append('g')
                .attr('transform', 'translate(' + x + ',' + y + ')')
                .append('g')
                .attr('id', 'ssv-report')
                .attr('font-size', font_scale.toString() + 'em');

            // Create report title outline
            var title_outline = g.append('rect').attr(base_attr);

            // Create report title text
            var title_text = g.append('text').attr(base_attr)
                .attr('x', width / 2)
                .attr('fill', header_color)
                .style('font-size', header_em.toString() + 'em')
                .text(this.description);

            // Resize header and outline based on text height
            title_text_height = title_text.node().getBBox().height;
            title_text.attr('y', title_text_height * (1 + margin));
            report_text_height = title_text_height * report_em / header_em;
            var y_count = title_text_height * (1 + 2*margin);
            title_outline.attr('height', y_count);
            var y_text = report_text_height * (1 + 1*margin);
            var y_row = y_text + report_text_height * margin;

            // Create value output box outlines (backgrounds) and add text boxes
            // This code adds the condition description, value, and unit (if applicable) in a row by row fashion
            for (var i = 0; i < this.conditions.length; i++) {
                var condition = this.conditions[i];

                // Do we have 2-d data?  If not, data_j_len is 1.
                condition.data[0].length !== undefined ? data_j_len = condition.data[0].length : data_j_len = 1;

                // Box outline (background)
                g.append('rect').attr(base_attr)
                    .attr('y', y_count)
                    .attr('height', ((data_j_len + 1)*y_row))

                // Condition description text
                g.append('text').attr(base_attr)
                    .attr('x', width / 2)
                    .attr('y', y_count + y_text)
                    .attr('fill', description_color)
                    .style('font-size', report_em.toString() + 'em')
                    .attr('font-style', 'oblique')
                    .text(condition.description);

                // Check if we have a section label property in the condition.  If not, default to 'Zone'.
                var section_label;
                'section_label' in condition ? section_label = condition.section_label: section_label = 'Zone';

                y_count += y_row;

                // Loop through condition data axis #2 and add row for each entry
                for (var j = 0; j < data_j_len; j++) {
                    // Do we have a defined second access in the data?  If not, we only need 2 boxes for the section
                    // (value and unit) else we need 3 (section_label, value, and unit)
                    data_j_len > 1 ? num_sections = 3 : num_sections = 2;

                    // Add Zone # if data_j_len > 1
                    if (data_j_len > 1) {
                        g.append('text').attr(base_attr)
                            .attr('x', width / (num_sections * 2))
                            .attr('y', y_count + y_text)
                            .attr('fill', zone_color)
                            .style('font-size', report_em.toString() + 'em')
                            .text('Zone #' + (j + 1));
                    }

                    // Value text
                    g.append('text').attr(base_attr)
                        .attr('class', 'value-text')
                        .attr('x', width / (2 * (4 - num_sections)))
                        .attr('y', y_count + y_text)
                        .attr('fill', val_color)
                        .style('font-size', report_em.toString() + 'em');

                    // Unit text
                    g.append('text').attr(base_attr)
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

        // Report is initialized - prevent further initialization
        this.report_initialized = true
    };

    // Function to update report given index in x-series
    this.update_report = function(x) {
        // Initialize report if not initialized
        if (!this.report_initialized) {this.initialize_report()}

        // Get parent of element with report_id and select all value text in report
        var parent = d3.select(d3.select('#' + this.report_id).node().parentNode);
        var value_texts = parent.selectAll('.value-text');

        // Update value text
        var val_count = 0;
        for (var i=0; i<this.conditions.length; i++) {
            var condition = this.conditions[i];

            // If axis 2 is defined in data loop over axis 2 values at index x of axis 1
            // Else get value at index x of axis 1
            if (condition.data[0].length !== undefined) {
                for (var j in condition.data[x]) {
                    value_texts[0][val_count].innerHTML = this.num_format(condition.data[x][j]);
                    val_count += 1
                }
            } else {
                value_texts[0][val_count].innerHTML = this.num_format(condition.data[x]);
                    val_count += 1
            }
        }
    };

    // Function to apply pattern updates to elements
    this.update_pattern = function(sel, pattern_id, props, prop_data, style_apply) {
        var pattern = d3.select('#' + pattern_id);

        // Initialize pattern reference if pattern_id not found
        if (pattern.empty()) {
            // Add svg defs section if none exist
            if (d3.select('svg defs').empty()) {
                svg.append('defs')
            }

            // Build pattern and apply initial state
            var defs = d3.select('svg defs');
            defs.append('pattern').attr('id', pattern_id)
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', '100%')
                .attr('height', '100%')
                .attr('patternContentUnits', 'userSpaceOnUse');

            // Set to stroke or fill based on style_apply
            style_apply == 'fill' ? sel.style('fill', 'url(#' + pattern_id + ')') :
                sel.style('stroke', 'url(#' + pattern_id + ')');

            // Set initial opacities to 1
            sel.style('fill-opacity', 1);
            sel.style('opacity',1);
        }

        // Descending sort props based on first property (order prop)
        prop_data = prop_data.sort(function(a,b) {return -(a[0] - b[0])});

        var bbox = sel.node().getBBox();
        var overlay_i = props.indexOf('overlay');
        var color_i = props.indexOf('color');
        var opacity_i = props.indexOf('opacity');

        for (var i in prop_data) {
            var rect_id = 'rect_' + i.toString();
            var pattern_rect = pattern.select('#' + rect_id);

            if (pattern_rect.empty()) {
                pattern.append('rect').attr('id', rect_id);

                // Add transition rect
                pattern.append('rect').attr('id', rect_id + '_trans')
                    .attr('fill', '#FFFFFF')
                    .attr('x',0)
                    .attr('height','1px')
                    .attr('width','100%');

                // Check for pattern overlays
                if (overlay_i > 0 && prop_data[i][overlay_i] in _context.svg_overlays) {
                    pattern.append('rect').attr('id', rect_id + '_' + prop_data[i][overlay_i])
                        .attr('fill', 'url(#' + prop_data[i][overlay_i] + ')')
                        .attr('x',0)
                        .attr('height','100%')
                        .attr('width','100%');
                }
            }
            var pattern_rect = pattern.select('#' + rect_id);

            // Update levels
            pattern_rect.transition()
                .attr('x','0')
                .attr('y', Math.max(0, 1 - prop_data[i][0]) * bbox.height)
                .attr('width','100%')
                .attr('height', '100%')
                .style('fill', prop_data[i][color_i])
                .style('opacity', prop_data[i][opacity_i]);

            // Update transitions
            if (prop_data[i][0] < 1.0) {
                pattern.select('#' + rect_id + '_trans').transition()
                    .attr('y',Math.max(0, 1 - prop_data[i][0]) * bbox.height);
            } else {
                pattern.select('#' + rect_id + '_trans').transition()
                    .attr('y', '-1%');
            }

            // Update pattern overlays
            if (overlay_i > 0 && prop_data[i][overlay_i] in _context.svg_overlays) {
                var pattern_overlay = pattern.select('#' + rect_id + '_' + prop_data[i][overlay_i]);
                pattern_overlay.transition().attr('y', Math.max(0, 1 - prop_data[i][0]) * bbox.height);
            }
        }
    }
}

// Wrapper class for closed path elements
function Cell(cell_ids, cell_description, cell_conditions, cell_report_id) {
    var cell = new Element(cell_ids, cell_description, cell_conditions, cell_report_id);

    cell.update = function(x) {
        for (var isel in this.selectors) {
            var sel = d3.select(this.selectors[isel]);
            var pattern_id = 'pattern_' + this.ids[isel];

            var order_prop = 'y';
            var props = [order_prop, 'color', 'opacity', 'overlay'];
            var prop_data = [];

            for (var i in this.conditions) {
                var condition = this.conditions[i];

                var order_val, color, opacity, overlay;
                var max_order = 1.01;
                opacity = condition.opacity;
                'overlay' in condition ? overlay = condition.overlay : overlay = null;
                if (condition.type == 'background') {
                    // background represents a changing cell background color only
                    // always 100% of the element height
                    order_val = max_order;
                    color = condition.color_scale(condition.data[x]);
                    prop_data.push([order_val, color, opacity, overlay])
                } else if (condition.type == 'level_static') {
                    // level_static represents a changing level in a cell that does not change color
                    order_val = Math.min((condition.data[x] - condition.min_height) /
                        (condition.max_height - condition.min_height), 1);
                    color = condition.color;
                    prop_data.push([order_val, color, opacity, overlay])
                } else if (condition.type == 'level_dynamic') {
                    // level_dynamic represents a changing level in a cell that changes color
                    order_val = Math.min((condition.data[x] - condition.min_height) /
                        (condition.max_height - condition.min_height), 1);
                    color = condition.color_scale(condition.data_dynamic[x]);
                    prop_data.push([order_val, color, opacity, overlay])
                } else if (condition.type == 'logical') {
                    // logical represents a filled cell that alternates between two colors
                    // always 100% of element height
                    order_val = max_order;

                    condition.data[x] ? color = condition.true_color : color = condition.false_color;
                    prop_data.push([order_val, color, opacity, overlay])
                } else if (condition.type == 'zonal_y') {
                    // zonal_y represents a zonal model in the y direction
                    // number of zones dictated by len of 2nd axis
                    for (var j in condition.data[x]) {
                        order_val = Math.min((condition.data[x][j] - condition.min_height) /
                            (condition.max_height - condition.min_height), 1);
                        color = condition.color_scale(condition.data_dynamic[x][j]);
                        prop_data.push([order_val, color, opacity, overlay])
                    }
                }
            }

            this.update_pattern(sel, pattern_id, props, prop_data, 'fill');
        };

        if (this.report_id) {this.update_report(x)}
    };

    return cell
}

// Wrapper class for line (or open path) elements
function Line(line_ids, line_description, line_conditions, line_report_id) {
    var line = new Element(line_ids, line_description, line_conditions, line_report_id);

    for (var i in line.conditions) {
        condition = line.conditions[i];
        condition.data[0].constructor == Array ? condition.num_sections = condition.data[0].length :
            condition.num_sections = 1;
    }

    line.update = function(x) {
        for (var isel in this.selectors) {
            var sel = d3.select(this.selectors[isel]);
            var pattern_id = 'pattern_' + this.ids[isel];

            var order_prop = 'y';
            var props = [order_prop, 'color', 'opacity', 'overlay'];
            var prop_data = [];

            for (var i in this.conditions) {
                var condition = this.conditions[i];

                var order_val, color, opacity, overlay;
                var max_order = 1.01;
                opacity = condition.opacity;
                overlay = null;

                if (condition.type == 'equal_y') {
                    // equal_y represents an open path element with equally sized patterns along the y axis
                    // number of y regions dictated by len of 2nd axis
                    for (var j=1; j<=condition.num_sections; j++) {
                        order_val = j / condition.num_sections;
                        var color_level;
                        condition.data[0].constructor == Array ? color_level = condition.data[x][j-1] :
                            color_level = condition.data[x];
                        color = condition.color_scale(color_level);
                        prop_data.push([order_val, color, opacity, overlay])
                    }
                }
            }

            this.update_pattern(sel, pattern_id, props, prop_data, 'stroke');
        };

        if (this.report_id) {this.update_report(x)}
    };

    return line
}

// Wrapper class for generating heatmaps
function Heatmap(heatmap_ids, heatmap_description, heatmap_conditions, heatmap_report_id) {
    var heatmap = new Element(heatmap_ids, heatmap_description, heatmap_conditions, heatmap_report_id);

    heatmap.conditions[0].data[0].constructor == Array ? heatmap.conditions.num_sections =
        heatmap.conditions[0].data[0].length : heatmap.conditions[0].num_sections = 1;

    heatmap.initialize = function() {
        var initial_vals = this.conditions[0].data[0];
        for (var isel in this.selectors) {
            var sel = d3.select(this.selectors[isel]);
            var parent = d3.select(sel.node().parentNode);

            var bbox = sel.node().getBBox();

            // Assume heatmap occupies entire placement element bounding box
            var x = d3.scale.linear().domain([0, initial_vals[0].length]).range([0, bbox.width]);
            var y = d3.scale.linear().domain([0, initial_vals.length]).range([0, bbox.height]);
            var g = parent.append('g')
                .attr('transform', 'translate(' + bbox.x + ',' + bbox.y + ')')
                .append('g');
            g.data([this.conditions[0].data]);

            // Create cross-sectional slice along the x axis
            var x_section = g.selectAll()
                .data(function(d) {return d[0]})
                .enter()
                .append('g')
                .attr('class', 'x_section');

            // Add a color bin for every y slot across the axis
            x_section.selectAll('.bin')
                .data(function (d) {return d})
                .enter().append('rect')
                .attr('class', 'bin')
                .attr('x', function (d, i) {return x(i)})
                .attr('width', function (d, i) {return  x(i + 1) - x(i)})
                .style('fill', function (d) {return heatmap.conditions[0].color_scale(d)})
                .style('fill-opacity', function (d) {return heatmap.conditions[0].opacity})
                .attr('height', bbox.height / (initial_vals.length));

            x_section.each(function (d, i) {d3.select(this).selectAll(".bin").attr("y", y(i))});
        }
    };

    heatmap.update = function(x) {
        for (var isel in this.selectors) {
            var sel = d3.select(this.selectors[isel]);
            var parent = d3.select(sel.node().parentNode);

            var g = parent.select('g').select('g');

            var x_section = g.selectAll('.x_section').data(function(d) {return d[x]});
            x_section.selectAll('.bin')
                .data(function (d) { return d; })
                .transition()
                .style('fill', function(d) { return heatmap.conditions[0].color_scale(d); });
        }

        if (this.report_id) {this.update_report(x)}
    };

    heatmap.initialize();

    return heatmap
}

// Wrapper class for state-type elements (e.g., show/hide)
function Toggle(toggle_ids, toggle_description, toggle_conditions, toggle_report_id) {
    var toggle = new Element(toggle_ids, toggle_description, toggle_conditions, toggle_report_id);

    toggle.update = function(x) {
        for (var isel in this.selectors) {
            var sel = d3.selectAll(this.selectors[isel]);

            for (var i in this.conditions) {
                var condition = this.conditions[i];

                if (condition.type == 'show_hide') {
                    if (condition.data[x] == true || condition.data[x] > 0) {
                        sel.transition().attr('opacity',1)
                    } else {
                        sel.transition().attr('opacity',0)
                    }
                }
            }
        };

        if (this.report_id) {this.update_report(x)}
    };

    return toggle
}

// Wrapper class for element reports
function Report(report_ids, report_description, report_conditions, report_id) {
    var report = new Element(report_ids, report_description, report_conditions, report_id);

    report.update = function(x) {
        if (this.report_id) {this.update_report(x)}
    };

    return report
}

// Wrapper class for tables
function Table(report_ids, report_description, report_conditions, report_id) {
    var table = new Element(report_ids, report_description, report_conditions, report_id);

    // If we have tabular (table-like) data overwrite base element report function
    table.initialize_report = function () {
        var sel = d3.select('#' + this.report_id);
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
            var font_scale = d3.select('#ssv-svg').attr('font-scale');

            // Append new parent element for table
            var table = parent.append('g')
                .attr('transform', 'translate(' + x + ',' + y + ')')
                .append('foreignObject')
                .attr('id', 'ssv-table')
                .attr("width", width)
                .attr("height", 500)
                .append('xhtml:table')
                .attr('id', table_id);

            // Add table header
            table.append('tr')
                .selectAll()
                .data(this.conditions[0].headers)
                .enter()
                .append('th')
                .text(function(d) {return d})
                .style('font-size', font_scale.toString() + 'em');
            }

        // Report is initialized - prevent further initialization
        this.report_initialized = true
    };

    table.update_report = function(x) {
        if (!this.report_initialized) {this.initialize_report()}

        var table_id = 'table_' + this.report_id;
        var font_scale = d3.select('#ssv-svg').attr('font-scale');

        table = d3.select('#' + table_id);

        // Add content
        row = table.selectAll('.content-row')
            .data(this.conditions[0].data[x]);
        row.enter()
            .append('tr')
            .attr('class', 'content-row');
        row.exit().remove();

        cell = row.selectAll('.content-cell')
            .data(function(d) {return d})
            .text(function(d) {return d});
        cell.enter()
            .append('td')
            .text(function(d) {return d})
            .style('font-size', font_scale.toString() + 'em')
            .attr('class', 'content-cell');
    };

    table.update = function(x) {
        if (this.report_id) {this.update_report(x)}
    };

    return table
}

// Error catching
window.onerror=function(msg){
    d3.select("body").attr("JSError",msg);
};

// Initialize document
$(document).ready(function() {element_context = new ElementContext()});


