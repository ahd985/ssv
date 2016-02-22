function ElementContext() {
    _context = this;
    this.element_data = {{ element_data }};
    this.x_series = {{ x_series }};
    {% if color_scales_data %}
        this.color_scales = {{ color_scales_data }};
    {% else %}
        this.color_scales = [];
    {% endif %}
    this.elements = [];
    this.play_enabled = false;
    this.current_x = 0;
    this.play_speed = 1.0;
    this.max_speed = 5.0;
    this.min_speed = 1.0;
    this.speed_step = 1.0;
    this.svg_overlays = {% include 'svg-overlays.json' %}

    this.initialize_overlays = function() {
        if (d3.select("svg defs").empty()) {
            svg.append("defs")
        }

        for (i in _context.svg_overlays) {
            alert(i)
            d3.select("svg defs").html(d3.select("svg defs").html() + _context.svg_overlays[i])
        }
    }

    this.set_font_scale = function() {
        _context.font_scale = parseFloat(d3.select("#ssv-svg").attr("viewBox").split(" ")[3]) /
            d3.select(".sim-visual").node().getBoundingClientRect().height;

        d3.select("#ssv-svg").attr("font-scale", _context.font_scale)
    };

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

        this.update_elements(0);
    };

    this.update_elements = function(x) {
        $("#x-series-val").html(this.x_series[x]);
        for (element in this.elements) {
            this.elements[element].update(x);
        }
    };

    this.initialize_slider = function() {
        $(".range-slider").attr("data-options", "initial: 0; start: 0; end: " + (this.x_series.length - 1).toString());
        $(document).foundation();
        $('[data-slider]').on('change.fndtn.slider', function(){
            _context.current_x = Math.round($('.range-slider').attr('data-slider'));
            _context.update_elements(_context.current_x)
        });
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
        $("#speed-button").click(function() {
            if (_context.play_speed == _context.max_speed) {
                _context.play_speed = _context.min_speed
            } else {
                _context.play_speed += _context.speed_step
            }
            $("#speed-val").html(_context.play_speed.toString() + "x")
        })
    };

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

    this.initialize_zoom = function() {
        // Setup overlay for panning
        // AHD fix x and width attributes
        ssv_overlay = d3.select("#ssv-overlay")
            .attr("height", "100%")
            .attr("x","-10000%")
            .attr("width", "10000000%");
        bbox = ssv_overlay.node().getBBox();

        zoom_container = d3.select("#zoom-container");

        zoom = d3.behavior.zoom()
            .scale(1)
            .scaleExtent([1, 8])
            .on("zoom", function() {
                /* AHD implement span constraints here
                tx = Math.max(bbox.x, d3.event.translate[0]);
                tx = Math.min(tx + bbox.width, bbox.x + bbox.width);
                ty = Math.max(bbox.y, d3.event.translate[1]);
                ty = Math.min(ty, bbox.y + bbox.height);
                zoom.translate([tx,ty]);
                */

                zoom_container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            });

        d3.select("#ssv-overlay").call(zoom);
    };

    this.build_color_scales = function() {
        font_scale = d3.select("#ssv-svg").attr("font-scale");
        header_height = 1.5 * font_scale;
        label_height = 1.0 * font_scale;
        margin = 1.10;

        for (i in _context.color_scales) {
            scale = _context.color_scales[i];
            sel = d3.select("#" + scale.id);

            if (!sel.empty()) {
                // Hide sel element
                sel.style("visibility", "hidden");

                parent = d3.select(sel.node().parentNode);
                color_scale = d3.scale.quantile()
                            .domain([d3.min(scale.levels), d3.max(scale.levels)])
                            .range(scale.scale);

                bbox = sel.node().getBBox();
                width = bbox.width;
                pos_x = bbox.x;
                pos_y = bbox.y;

                var scale_len = color_scale.range().length;
                legend = parent.append('g').attr("transform", "translate(" + pos_x + "," + pos_y + ")")
                    .append("g");

                var x = d3.scale.linear()
                    .domain([0, scale_len])
                    .range([0, width]);

                legend.append("text")
                    .text(scale.desc)
                    .attr("x", (width/2))
                    .attr("y", (header_height).toString() + "em")
                    .attr("text-anchor", "middle")
                    .attr("font-size", header_height.toString() + "em");

                var keys = legend.selectAll('rect').data(color_scale.range());

                keys.enter().append('rect')
                    .attr("x", function(d,i) {return x(i)})
                    .attr("y", function() {return (header_height * margin).toString() + "em"})
                    .attr("width", function(d,i) {return x(i+1) - x(i)})
                    .attr("height", function() {return header_height.toString() + "em"})
                    .attr("font-size", header_height.toString() + "em")
                    .style("fill", function(d) {return d});

                keys.enter().append("text")
                    .text(function(d) {return color_scale.invertExtent(d)[0].toFixed(0)})
                    .attr("x", function(d,i) {return x(i)})
                    .attr("y", function() {return ((2 * header_height + label_height) *
                        header_height / label_height * margin).toString() + "em"})
                    .attr("text-anchor", "middle")
                    .attr("font-size", (label_height).toString() + "em");
            }
        }
    };

    this.initialize_overlays();
    this.set_font_scale();
    this.initialize_elements();
    this.initialize_slider();
    this.initialize_zoom();
    this.build_color_scales();
}

function Element(element_ids, element_description, element_conditions, report_id) {
    this.ids = element_ids;
    this.selectors = [];
    for (id in this.ids) {
        this.selectors.push("#" + this.ids[id])
    }
    this.description = element_description;
    this.conditions = element_conditions;
    this.report_id = report_id;
    this.report_initialized = false;
    this.report_max_chars = 0;
    this.unit_max_chars = 0;
    this.val_max_chars = 0;

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

    this.num_format = function(val) {
        if (val >= 1000 || val < 0.01) {
            return d3.format(".1e")(val)
        } else {
            return d3.format(".2f")(val)
        }
    };

    this.str_format = function(str, len, pad_dir) {
        if (str.length < len) {
            if (pad_dir == 'left') {
                return str.slice(0,len)
            } else {
                return str.slice(0,len)
            }
        } else {
            return str.slice(0,len)
        }
    };

    this.initialize_report = function() {
        sel = d3.select("#" + this.report_id);
        parent = d3.select(sel.node().parentNode);

        this.height = sel.node().getBBox().height;
        this.width = sel.node().getBBox().width;
        pos_x = sel.node().getBBox().x;
        pos_y = sel.node().getBBox().y;
        this.margin = this.width * 0.025;

        // Hide sel element
        sel.style("visibility", "hidden");

        // Start new parent element
        g = parent.append("g")
                .attr("transform", "translate(" + pos_x + "," + pos_y + ")")
                .append("g")
                .attr("id","ssv-report");

        font_scale = d3.select("#ssv-svg").attr("font-scale");

        // Create title outline
        title_outline = g.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", this.width)
            .attr("fill", "#616161")
            .attr("fill-opacity", 1)
            .attr("stroke", "white");

        // Create title text
        title_text = g.append("text")
            .attr("x", this.width / 2)
            .attr("y", this.margin)
            .attr("text-anchor", "middle")
            .attr("fill", "#FFC107")
            .style("font-size", (1.2 * font_scale).toString() + "em")
            .text(this.description);

        this.max_text_len = Math.floor(this.description.length * this.width /
            title_text.node().getComputedTextLength());
        title_text.text(this.description.slice(0, this.max_text_len));
        text_height = title_text.node().getBBox().height;
        title_text.attr("y", text_height);

        // Now that we have height of text update title box height
        title_outline.attr("height", text_height + 2*this.margin);

        // Create output box outlines and add text boxes
        for (i=0; i<this.conditions.length; i++) {
            condition = this.conditions[i];

            // Outline
            g.append("rect")
                .attr("x", 0)
                .attr("y", (i+1/2)*2*(text_height + 2*this.margin))
                .attr("stroke", "white")
                .attr("height", 2*(text_height + 2*this.margin))
                .attr("width", this.width)
                .attr("fill", "#616161")
                .attr("fill-opacity", 1)
                .attr("stroke", "white");

            // Description text
            g.append("text")
                .attr("x", this.width/2)
                .attr("y", (i+1/2)*2*(text_height + 2*this.margin) + this.margin + text_height)
                .attr("text-anchor", "middle")
                .attr("fill", "#00BFA5")
                .style("font-size", font_scale.toString() + "em")
                .attr("font-style","oblique")
                .text(condition.description);

            // Value text
            g.append("text")
                .attr("class", "value-text")
                .attr("x", this.width/4)
                .attr("y", (i+1/2)*2*(text_height + 2*this.margin) + 2*this.margin + 2*text_height)
                .attr("text-anchor", "middle")
                .attr("fill", "#FFEB3B")
                .style("font-size", font_scale.toString() + "em");

            // Unit text
            g.append("text")
                .attr("x", 3*this.width/4)
                .attr("y", (i+1/2)*2*(text_height + 2*this.margin) + 2*this.margin + 2*text_height)
                .attr("text-anchor", "middle")
                .attr("fill", "#FFFFFF")
                .style("font-size", font_scale.toString() + "em")
                .text(condition.unit);
        }

        this.report_initialized = true
    };

    this.update_report = function(x) {
        if (!this.report_initialized) {this.initialize_report()}

        parent = d3.select(d3.select("#" + this.report_id).node().parentNode);
        value_texts = parent.selectAll(".value-text");
        for (i=0; i<this.conditions.length; i++) {
            condition = this.conditions[i];
            value_texts[0][i].innerHTML = this.num_format(condition.data[x]);
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

                // Check for pattern overlays
                if (pattern_props['overlay'][i]) {
                    if (pattern_props['overlay'][i] in _context.svg_overlays) {
                        pattern.append("rect").attr("fill", "url(#" + pattern_props['overlay'][i] + ")")
                            .attr("x",0)
                            .attr("y",Math.max(0, 1 - pattern_props[order_prop][i]) * bbox.height)
                            .attr("height","100%")
                            .attr("width","100%");
                    }
                }
            }

            pattern_rect.transition()
                .attr("x","0")
                .attr("y", Math.max(0, 1 - pattern_props[order_prop][i]) * bbox.height)
                .attr("width","100%")
                .attr("height", "100%")
                .style("fill", pattern_props['color'][i])
                .style("opacity", pattern_props['opacity'][i]);
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
