// Main function to generate contextual information of ssv setup
// Called on $(document).ready()
function ElementContext() {
    // Initialize properties
    // -- Context reference
    _context = this;
    // -- Bulk simulation data from Python
    //    Element_data is the "y" data representing svg elements that corresponds to the x_series data
    this.x_series = {{ x_series }};
    this.element_data = {{ element_data }};
    // -- Add in color scale data if provided by Python
    //    This data provides for rendering graphical color scale legends within the svg
    {% if color_scales_data %}
        this.color_scales = {{ color_scales_data }};
    {% else %}
        this.color_scales = [];
    {% endif %}
    // -- Storage array of svg elements being manipulated
    this.elements = [];
    // -- Simulation interface properties
    //    Control automatic play, play speed, etc
    this.play_enabled = false;
    this.current_x = 0;
    this.play_speed = 1.0;
    this.max_speed = 5.0;
    this.min_speed = 1.0;
    this.speed_step = 1.0;
    // -- Pattern overlay (e.g., water) data provided by Python
    this.svg_overlays = {% include 'svg-overlays.json' %}

    // Initializer of svg pattern overlays (e.g., water pattern overlays).  These are inserted into
    // the svg "defs" child for reference by svg elements.
    this.initialize_overlays = function() {
        if (d3.select("svg defs").empty()) {
            svg.append("defs")
        }

        for (i in _context.svg_overlays) {
            d3.select("svg defs").html(d3.select("svg defs").html() + _context.svg_overlays[i])
        }
    }

    // Function to calculate scale of svg view box to parent svg div
    // This is required to scale user input font size correctly
    this.set_font_scale = function() {
        _context.font_scale = parseFloat(d3.select("#ssv-svg").attr("viewBox").split(" ")[3]) /
            d3.select(".sim-visual").node().getBoundingClientRect().height;

        d3.select("#ssv-svg").attr("font-scale", _context.font_scale)
    };

    // Initializer function of svg elements by parsing data from this.element_data into classes by element types
    this.initialize_elements = function() {
        for (element_type in this.element_data) {
            for (element in this.element_data[element_type]) {
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
        $("#x-series-val").html(this.x_series[x]);
        for (element in this.elements) {
            this.elements[element].update(x);
        }
    };

    // Initializer function of slider for ssv control bar using Foundation
    this.initialize_slider = function() {
        $(".range-slider").attr("data-options", "initial: 0; start: 0; end: " + (this.x_series.length - 1).toString());
        $(document).foundation();
        $('[data-slider]').on('change.fndtn.slider', function(){
            _context.current_x = Math.round($('.range-slider').attr('data-slider'));
            _context.update_elements(_context.current_x);
        });

        // Clicking on play button automates the forward run of the x_series
        $("#play-button").click(function() {
            if (_context.play_enabled) {
                _context.play_enabled = false;
                $("#pause-icon").attr("style", "display:none");
                $("#play-icon").attr("style", "");
            } else {
                _context.play_enabled = true;
                $("#pause-icon").attr("style", "");
                $("#play-icon").attr("style", "display:none");
                if (_context.current_x == _context.x_series.length - 1) {
                    _context.current_x = 0;
                    $('.range-slider').foundation('slider', 'set_value', _context.current_x);
                }
                _context.x_series_forward()
            }
        });

        // Clicking on the speed button changes the speed of play
        $("#speed-button").click(function() {
            if (_context.play_speed == _context.max_speed) {
                _context.play_speed = _context.min_speed
            } else {
                _context.play_speed += _context.speed_step
            }
            $("#speed-val").html(_context.play_speed.toString() + "x")
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
                    $("#play-button").trigger("click")
                }
            }
        }, 1000 / this. play_speed);
    };

    // Initializer of pan and zoom functionality
    this.initialize_pan_zoom = function() {
        // Add border to svg to outline zoom/pan zone
        ssv_svg = d3.select("#ssv-svg");
        ssv_svg.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", "100%")
            .attr("width", "100%")
            .style("stroke", "black")
            .style("fill", "none")
            .style("stroke-width", "2px");

        // Get svg, svg parent div dimensions
        viewbox = ssv_svg.attr("viewBox").split(" ");
        svg_bbox = ssv_svg.node().getBBox();
        x1 = parseFloat(viewbox[0]);
        x2 = parseFloat(viewbox[2]);
        y1 = parseFloat(viewbox[1]);
        y2 = parseFloat(viewbox[3]);

        div_bbox = d3.select(".sim-visual").node().getBoundingClientRect();

        // Calculate max allowable svg width and height;
        max_width = (x2 - x1);
        max_height = (y2 - y1);

        // Apply overlay to control zoom/pan;
        ssv_overlay = d3.select("#ssv-overlay")
            .attr("y", svg_bbox.y)
            .attr("height", svg_bbox.height)
            .attr("x", svg_bbox.x)
            .attr("width", svg_bbox.width);

        // Apply zoom/pan features and pan limit
        zoom_container = d3.select("#zoom-container");
        zoom = d3.behavior.zoom()
            .scale(1)
            .scaleExtent([1, 8])
            .on("zoom", function() {
                scale = d3.event.scale;
                tx = Math.max(d3.event.translate[0], -(x2 * scale - max_width));
                tx = Math.min(tx, x1);
                ty = Math.max(d3.event.translate[1], -(y2 * scale - max_height));
                ty = Math.min(ty, y1);

                zoom.translate([tx,ty]);
                zoom_container.attr("transform", "translate(" + [tx,ty] + ")scale(" + scale + ")")
            });

        d3.select("#ssv-overlay").call(zoom);
    };

    // Function to generate color scale legends in ssv output
    this.build_color_scales = function() {
        // Loop through all color scale data
        for (i in _context.color_scales) {
            scale = _context.color_scales[i];
            sel = d3.select("#" + scale.id);

            // If scale selector not empty fill it in with color scale legend
            // Placement element width is only property used - height is ultimately determined by user specified
            // font size
            if (!sel.empty()) {
                // Hide original placement element
                sel.style("visibility", "hidden");

                // Get bounding box of placement element
                bbox = sel.node().getBBox();
                width = bbox.width;
                pos_x = bbox.x;
                pos_y = bbox.y;

                // Append legend outline to parent of placement element
                // Set legend font size to font scale property
                parent = d3.select(sel.node().parentNode);
                legend = parent.append('g').attr("transform", "translate(" + pos_x + "," + pos_y + ")")
                    .append("g").attr("font-size", _context.font_scale + "em");

                // Calculate discrete color bin scale
                color_scale = d3.scale.quantile().domain([d3.min(scale.levels), d3.max(scale.levels)])
                    .range(scale.scale);
                var scale_len = color_scale.range().length;
                var x = d3.scale.linear()
                    .domain([0, scale_len])
                    .range([0, width]);

                // Generate legend
                // "header_em" represents the color scale title font size
                // "label" represents the color scale bin values font size
                header_em = 1.5;
                label_em = 1;
                margin = 1.1;

                // -- Append header text
                legend.append("text")
                    .text(scale.desc)
                    .attr("x", (width/2))
                    .attr("y", "1em")
                    .attr("text-anchor", "middle")
                    .attr("font-size", header_em + "em");

                // -- Generate range of colors required for legend
                var keys = legend.selectAll('rect').data(color_scale.range());

                // -- Append a rect for every color on the legend
                // -- Rects are same height as header text
                keys.enter().append('rect')
                    .attr("x", function(d,i) {return x(i)})
                    .attr("y", margin + "em")
                    .attr("width", function(d,i) {return x(i+1) - x(i)})
                    .attr("height", "1em")
                    .style("fill", function(d) {return d})
                    .attr("font-size", header_em + "em");;

                // -- Append value text immediately below the left-most area of every color rect
                keys.enter().append("text")
                    .text(function(d) {return color_scale.invertExtent(d)[0].toFixed(0)})
                    .attr("x", function(d,i) {return x(i)})
                    .attr("y", (2 * header_em/label_em + 1)* margin  + "em")
                    .attr("text-anchor", "middle")
                    .attr("font-size", label_em + "em");
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
    // Base element properties
    // -- Store representative element ids for every element in svg represented by this class
    this.ids = element_ids;
    // -- Build list of selectors from ids
    this.selectors = [];
    for (id in this.ids) {
        this.selectors.push("#" + this.ids[id])
    }
    // -- Report id represents id of placement element for element report - Optional property
    this.report_id = report_id;
    // -- Element description is printed at top of optional report
    this.description = element_description;
    // -- Array of element conditions - data types that describe simulation characteristics such as
    //    temperature and water levels
    this.conditions = element_conditions;
    // -- Track initialization of report
    this.report_initialized = false;

    // Loop through conditions and check for color scale
    // If color scale exists, use d3 to generate domain and range of scale.
    for (condition in element.conditions) {
        condition = element.conditions[condition];
        if ('color_scale' in condition && 'color_levels' in condition) {
            color_scale = condition.color_scale;
            color_levels = condition.color_levels;
            condition.color_scale = d3.scale.quantile()
                .domain([d3.min(color_levels), d3.max(color_levels)])
                .range(color_scale);
        }
    }

    // Number formatting function for report output
    this.num_format = function(val) {
        if (val >= 1000 || val < 0.01) {
            return d3.format(".1e")(val)
        } else {
            return d3.format(".2f")(val)
        }
    };

    // Report initialization function - called if report_id provided and report_initialized == false
    this.initialize_report = function() {
        sel = d3.select("#" + this.report_id);
        parent = d3.select(sel.node().parentNode);

        bbox = sel.node().getBBox();
        width = bbox.width;
        x = sel.node().getBBox().x;
        y = sel.node().getBBox().y;
        margin = width * 0.025;

        // Hide placement element
        sel.style("visibility", "hidden");

        // Append new parent element for report
        g = parent.append("g")
                .attr("transform", "translate(" + x + "," + y + ")")
                .append("g")
                .attr("id","ssv-report");

        // Reference font scale from svg attr
        font_scale = d3.select("#ssv-svg").attr("font-scale");

        // Create title outline
        title_outline = g.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", width)
            .attr("fill", "#616161")
            .attr("fill-opacity", 1)
            .attr("stroke", "white");

        // Create title text
        title_text = g.append("text")
            .attr("x", width / 2)
            .attr("y", margin)
            .attr("text-anchor", "middle")
            .attr("fill", "#FFC107")
            .style("font-size", (1.2 * font_scale).toString() + "em")
            .text(this.description);

        title_text.text(this.description);
        text_height = title_text.node().getBBox().height;
        title_text.attr("y", text_height);

        // Now that we have height of text update title box height
        title_outline.attr("height", text_height + 2*margin);

        // Create output box outlines and add text boxes
        line_count = 0;
        for (i=0; i<this.conditions.length; i++) {
            condition = this.conditions[i];
            condition.data[0].length !== undefined ? data_j_len = condition.data[0].length : data_j_len = 1;

            // Outline
            g.append("rect")
                .attr("x", 0)
                .attr("y", (line_count+1/2)*2*(text_height + 2*margin))
                .attr("stroke", "white")
                .attr("height", (data_j_len + 1)*(text_height + 2*margin))
                .attr("width", width)
                .attr("fill", "#616161")
                .attr("fill-opacity", 1)
                .attr("stroke", "white");

            // Description text
            g.append("text")
                .attr("x", width/2)
                .attr("y", (line_count+1/2)*2*(text_height + 2*margin) + margin + text_height)
                .attr("text-anchor", "middle")
                .attr("fill", "#00BFA5")
                .style("font-size", font_scale.toString() + "em")
                .attr("font-style","oblique")
                .text(condition.description);

            for (var j=0; j<data_j_len; j++) {
                data_j_len > 1 ? num_sections = 3 : num_sections = 2;

                // Add Zone # if data_j_len > 1
                if (data_j_len > 1) {
                    g.append("text")
                        .attr("x", width/(num_sections * 2))
                        .attr("y", (line_count+1/2)*2*(text_height + 2*margin) + 2*margin + 2*text_height)
                        .attr("text-anchor", "middle")
                        .attr("fill", "#FFFFFF")
                        .style("font-size", font_scale.toString() + "em")
                        .text("Zone #" + (j+1));
                }

                // Value text
                g.append("text")
                    .attr("class", "value-text")
                    .attr("x", width/(2 * (4 - num_sections)))
                    .attr("y", (line_count+1/2)*2*(text_height + 2*margin) + 2*margin + 2*text_height)
                    .attr("text-anchor", "middle")
                    .attr("fill", "#FFEB3B")
                    .style("font-size", font_scale.toString() + "em");

                // Unit text
                g.append("text")
                    .attr("x", (num_sections*2 - 1)*width/(2 * num_sections))
                    .attr("y", (line_count+1/2)*2*(text_height + 2*margin) + 2*margin + 2*text_height)
                    .attr("text-anchor", "middle")
                    .attr("fill", "#FFFFFF")
                    .style("font-size", font_scale.toString() + "em")
                    .text(condition.unit);

                line_count += 0.5;
            }
            line_count += 0.5;
        }

        // Report is initialized - prevent further initialization
        this.report_initialized = true
    };

    this.update_report = function(x) {
        if (!this.report_initialized) {this.initialize_report()}

        parent = d3.select(d3.select("#" + this.report_id).node().parentNode);
        value_texts = parent.selectAll(".value-text");

        val_count = 0;
        for (i=0; i<this.conditions.length; i++) {
            condition = this.conditions[i];

            if (condition.data[0].length !== undefined) {
                for (j in condition.data[x]) {
                    value_texts[0][val_count].innerHTML = this.num_format(condition.data[x][j]);
                    val_count += 1
                }

            } else {
                value_texts[0][val_count].innerHTML = this.num_format(condition.data[x]);
                    val_count += 1
            }
        }
    };

    this.update_pattern = function(sel, pattern_id, pattern_props, style_apply) {
        pattern = d3.select("#" + pattern_id);

        if (pattern.empty()) {
            if (d3.select("svg defs").empty()) {
                svg.append("defs")
            }

            defs = d3.select("svg defs");
            defs.append("pattern").attr("id", pattern_id)
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("patternContentUnits", "userSpaceOnUse");

            style_apply == 'fill' ? sel.style("fill", "url(#" + pattern_id + ")") :
                sel.style("stroke", "url(#" + pattern_id + ")");

            sel.style("fill-opacity", 1);
            sel.style("opacity",1);
            pattern = d3.select("#" + pattern_id);
        }

        // Zip arrays in pattern_props, sort, and apply percent function to order property
        order_prop = 'y';
        props_zipped = pattern_props[order_prop];
        props_zipped = props_zipped.map(function(e, i) {return [pattern_props[order_prop][i]]});
        prop_keys = Object.keys(pattern_props);
        for (i in prop_keys) {
            if (prop_keys[i] != order_prop) {
                prop_vals = pattern_props[prop_keys[i]];
                props_zipped = props_zipped.map(function(e, ii) {return props_zipped[ii].concat([prop_vals[ii]])})
            }
        }

        props_zipped = props_zipped.sort(function(a,b) {return -(a[0] - b[0])});

        for (i in prop_keys) {
            pattern_props[prop_keys[i]] = props_zipped.map(function (row) {
                return row[i]
            })
        };

        bbox = sel.node().getBBox();
        for (i in pattern_props[order_prop]) {
            rect_id = "rect_" + i.toString();
            pattern_rect = pattern.select("#" + rect_id);

            if (pattern_rect.empty()) {
                pattern.append("rect").attr("id", rect_id);

                // Add transition rect
                pattern.append("rect").attr("id", rect_id + "_trans")
                    .attr("fill", "#FFFFFF")
                    .attr("x",0)
                    .attr("height","1px")
                    .attr("width","100%");

                // Check for pattern overlays
                if (pattern_props['overlay'][i] && pattern_props['overlay'][i] in _context.svg_overlays) {
                    pattern.append("rect").attr("id", rect_id + "_" + pattern_props['overlay'][i])
                        .attr("fill", "url(#" + pattern_props['overlay'][i] + ")")
                        .attr("x",0)
                        .attr("height","100%")
                        .attr("width","100%");
                }
            }

            // Update levels
            pattern_rect.transition()
                .attr("x","0")
                .attr("y", Math.max(0, 1 - pattern_props[order_prop][i]) * bbox.height)
                .attr("width","100%")
                .attr("height", "100%")
                .style("fill", pattern_props['color'][i])
                .style("opacity", pattern_props['opacity'][i]);

            // Update transitions
            if (pattern_props[order_prop][i] < 1.0) {
                pattern.select("#" + rect_id + "_trans").transition()
                    .attr("y",Math.max(0, 1 - pattern_props[order_prop][i]) * bbox.height);
            } else {
                pattern.select("#" + rect_id + "_trans").transition()
                    .attr("y", "-1%");
            }

            // Update pattern overlays
            if (pattern_props['overlay'][i] && pattern_props['overlay'][i] in _context.svg_overlays) {
                pattern_overlay = pattern.select("#" + rect_id + "_" + pattern_props['overlay'][i]);
                pattern_overlay.transition().attr("y", Math.max(0, 1 - pattern_props[order_prop][i]) * bbox.height);
            }
        }
    }
}

function Cell(cell_ids, cell_description, cell_conditions, cell_report_id) {
    cell = new Element(cell_ids, cell_description, cell_conditions, cell_report_id);

    cell.update = function(x) {
        for (selector in this.selectors) {
            sel = d3.select(this.selectors[selector]);
            pattern_id = "pattern_" + this.ids[selector];

            pattern_props = {'y':[], 'color':[], 'opacity':[], overlay:[]};

            for (i in this.conditions) {
                condition = this.conditions[i];

                if (condition.type == 'background') {
                    pattern_props['y'].push(1.01);
                    pattern_props['color'].push(condition.color_scale(condition.data[x]));
                    pattern_props['opacity'].push(condition.opacity);
                    "overlay" in condition ? pattern_props['overlay'].push(condition.overlay) :
                        pattern_props['overlay'].push(null)
                } else if (condition.type == 'level_static') {
                    pattern_props['y'].push(Math.min((condition.data[x] - condition.min_height) /
                        (condition.max_height - condition.min_height), 1));
                    pattern_props['color'].push(condition.color);
                    pattern_props['opacity'].push(condition.opacity);
                    "overlay" in condition ? pattern_props['overlay'].push(condition.overlay) :
                        pattern_props['overlay'].push(null)
                } else if (condition.type == 'level_dynamic') {
                    pattern_props['y'].push(Math.min((condition.data[x] - condition.min_height) /
                        (condition.max_height - condition.min_height), 1));
                    pattern_props['color'].push(condition.color_scale(condition.data_dynamic[x]));
                    pattern_props['opacity'].push(condition.opacity);
                    "overlay" in condition ? pattern_props['overlay'].push(condition.overlay) :
                        pattern_props['overlay'].push(null)
                } else if (condition.type == 'logical') {
                    pattern_props['y'].push(1.01);
                    pattern_props['color'].push((condition.data[x] == true ||  condition.data[x] > 0) ?
                            condition.true_color : condition.false_color);
                    pattern_props['opacity'].push(condition.opacity);
                    "overlay" in condition ? pattern_props['overlay'].push(condition.overlay) :
                        pattern_props['overlay'].push(null)
                } else if (condition.type == 'zonal_y') {
                    for (j in condition.data[x]) {
                        pattern_props['y'].push(Math.min((condition.data[x][j] - condition.min_height) /
                            (condition.max_height - condition.min_height), 1));
                        pattern_props['color'].push(condition.color_scale(condition.data_dynamic[x][j]));
                        pattern_props['opacity'].push(condition.opacity);
                        "overlay" in condition ? pattern_props['overlay'].push(condition.overlay) :
                            pattern_props['overlay'].push(null)
                    }
                }
            }

            this.update_pattern(sel, pattern_id, pattern_props, "fill");
        };

        if (this.report_id) {this.update_report(x)}
    };

    return cell
}

function Line(line_ids, line_description, line_conditions, line_report_id) {
    line = new Element(line_ids, line_description, line_conditions, line_report_id);

    for (condition in line.conditions) {
        condition = line.conditions[condition];
        condition.data[0].constructor == Array ? condition.num_sections = condition.data[0].length :
            condition.num_sections = 1;
    }

    line.update = function(x) {
        for (selector in this.selectors) {
            sel = d3.select(this.selectors[selector]);
            pattern_id = "pattern_" + this.ids[selector];

            pattern_props = {'y':[], 'color':[], 'opacity':[], 'overlay':[]};

            for (i in this.conditions) {
                condition = this.conditions[i];

                if (condition.type == 'sections_equal') {
                    for (j=1; j<=condition.num_sections; j++) {
                        condition.data[0].constructor == Array ? color_level = condition.data[x][j-1] :
                            color_level = condition.data[x];
                        patter_props['y'].push(j / condition.num_sections);
                        pattern_props['color'].push(condition.color_scale(color_level));
                        pattern_props['opacity'].push(condition.opacity);
                        "overlay" in condition ? pattern_props['overlay'].push(condition.overlay) :
                            pattern_props['overlay'].push(null)
                    }
                }
            }

            this.update_pattern(sel, pattern_id, pattern_props, "stroke");
        };

        if (this.report_id) {this.update_report(x)}
    };

    return line
}

function Heatmap(heatmap_ids, heatmap_description, heatmap_conditions, heatmap_report_id) {
    heatmap = new Element(heatmap_ids, heatmap_description, heatmap_conditions, heatmap_report_id);

    heatmap.conditions[0].data[0].constructor == Array ? heatmap.conditions.num_sections =
        heatmap.conditions[0].data[0].length : heatmap.conditions[0].num_sections = 1;

    heatmap.initialize = function() {
        initial_vals = this.conditions[0].data[0];
        for (selector in this.selectors) {
            sel = d3.select(this.selectors[selector]);
            parent = d3.select(sel.node().parentNode);

            height = sel.node().getBBox().height;
            width = sel.node().getBBox().width;
            pos_x = sel.node().getBBox().x;
            pos_y = sel.node().getBBox().y;

            x = d3.scale.linear().domain([0, initial_vals[0].length]).range([0, width]);
            y = d3.scale.linear().domain([0, initial_vals.length]).range([0, height]);
            g = parent.append("g")
                .attr("transform", "translate(" + pos_x + "," + pos_y + ")")
                .append("g");

            x_section = g.selectAll()
                .data(initial_vals)
                .enter()
                .append("g")
                .attr("class", "x_section");
            x_section.selectAll(".bin")
                .data(function (d) {
                    return d;
                })
                .enter().append("rect")
                .attr("class", "bin")
                .attr("x", function (d, i) {
                    return x(i);
                })
                .attr("width", function (d, i) {
                    return  x(i + 1) - x(i);
                })
                .style("fill", function (d) {
                    return heatmap.conditions[0].color_scale(d);
                })
                .style("fill-opacity", function (d) {
                    return heatmap.conditions[0].opacity;
                })
                .attr("height", height / (initial_vals.length));

            x_section.each(function (d, i) {
                d3.select(this).selectAll(".bin")
                    .attr("y", y(i));
            });
        }
    };

    heatmap.update = function(x) {
        for (selector in this.selectors) {
            sel = d3.select(this.selectors[selector]);
            parent = d3.select(sel.node().parentNode);

            x_section = parent.selectAll(".x_section").data(heatmap.conditions[0].data[x]);
            x_section.selectAll(".bin")
                .data(function (d) { return d; })
                .transition()
                .style("fill", function(d) { return heatmap.conditions[0].color_scale(d); });
        }

        if (this.report_id) {this.update_report(x)}
    };

    heatmap.initialize();

    return heatmap
}

function Toggle(toggle_ids, toggle_description, toggle_conditions, toggle_report_id) {
    toggle = new Element(toggle_ids, toggle_description, toggle_conditions, toggle_report_id);

    toggle.update = function(x) {
        for (selector in this.selectors) {
            sel = d3.selectAll(this.selectors[selector]);

            for (i in this.conditions) {
                condition = this.conditions[i];

                if (condition.type == 'show_hide') {
                    if (condition.data[x] == true || condition.data[x] > 0) {
                        sel.transition().attr("opacity",1)
                    } else {
                        sel.transition().attr("opacity",0)
                    }
                }
            }
        };

        if (this.report_id) {this.update_report(x)}
    };

    return toggle
}

function Report(report_ids, report_description, report_conditions, report_id) {
    report = new Element(report_ids, report_description, report_conditions, report_id);

    report.update = function(x) {
        if (this.report_id) {this.update_report(x)}
    };

    return report
}

$(document).ready(function() {element_context = new ElementContext()});
