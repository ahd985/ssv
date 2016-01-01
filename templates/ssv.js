function ElementContext() {
    _self = this;
    this.element_data = {{ element_data }};
    this.x_series = {{ x_series }};
    this.elements = [];
    this.play_enabled = false;
    this.current_x = 0;
    this.play_speed = 1.0;
    this.max_speed = 5.0;
    this.min_speed = 1.0;
    this.speed_step = 1.0;

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
            _self.current_x = Math.round($('.range-slider').attr('data-slider'));
            _self.update_elements(_self.current_x)
        });
        $("#play-button").click(function() {
            if (_self.play_enabled) {
                _self.play_enabled = false;
                $("#pause-icon").attr("style", "display:none");
                $("#play-icon").attr("style", "display:block");
            } else {
                _self.play_enabled = true;
                $("#pause-icon").attr("style", "display:block");
                $("#play-icon").attr("style", "display:none");
                if (_self.current_x == _self.x_series.length - 1) {
                    _self.current_x = 0;
                    $('.range-slider').foundation('slider', 'set_value', _self.current_x);
                }
                _self.x_series_forward()
            }
        });
        $("#speed-button").click(function() {
            if (_self.play_speed == _self.max_speed) {
                _self.play_speed = _self.min_speed
            } else {
                _self.play_speed += _self.speed_step
            }
            $("#speed-val").html(_self.play_speed.toString() + "x")
        })
    };

    this.x_series_forward = function () {
        window.setTimeout(function() {
            if (_self.play_enabled && _self.current_x < _self.x_series.length) {
                _self.current_x += 1;
                $('.range-slider').foundation('slider', 'set_value', _self.current_x);
                _self.update_elements(_self.current_x);


                if (_self.current_x < _self.x_series.length - 1) {
                    _self.x_series_forward()
                } else {
                    $("#play-button").trigger("click")
                }
            }
        }, 1000 / this. play_speed);
    };

    this.initialize_elements();
    this.initialize_slider()
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
        sizing_str = "sizing....";
        margin = 0.1;

        height = sel.node().getBBox().height;
        width = sel.node().getBBox().width;
        width = width - 2*margin*width;
        pos_x = sel.node().getBBox().x + margin*width;
        pos_y = sel.node().getBBox().y;

        // y_len represents element title(description) and each condition
        y_len = this.conditions.length + 1;
        y = d3.scale.linear().domain([0, y_len]).range([0, height]);

        g = parent.append("g")
                .attr("transform", "translate(" + pos_x + "," + pos_y + ")")
                .append("g");

        x_section = g.selectAll()
            .data(new Array(y_len))
            .enter()
            .append("text")
            .attr("class", "text_section")
            .attr("x", width / 2)
            .attr("y", function(d,i){
                return (y(i+1) + y(i)) / 2
            })
            .attr("text-anchor", "middle")
            .style("font-size", "1em")
            .text(function() {return sizing_str});

        // Format header
        g.select(".text_section").attr("font-weight", "bold");

        this.report_max_chars = Math.floor(sizing_str.length *
            width / g.select(".text_section").node().getComputedTextLength());

        // Determine max unit and value lengths
        for (condition in this.conditions) {
            condition = this.conditions[condition];
            this.unit_max_chars = Math.max(this.unit_max_chars, condition.unit.length);
            this.val_max_chars = Math.max(this.val_max_chars, this.num_format(d3.max(condition.data)))
        }

        this.report_initialized = true
    };

    this.update_report = function(x) {
        if (!this.report_initialized) {this.initialize_report()}
        body = [this.description.slice(0, this.report_max_chars)];
        desc_val_sep = ": ";

        for (condition in this.conditions) {
            condition = this.conditions[condition];
            line_str = this.str_format(condition.unit, this.unit_max_chars, 'left');
            line_str = this.num_format(condition.data[x]) + " " + line_str;
            line_str = this.str_format(condition.description,
                    Math.max(0,this.report_max_chars - line_str.length) +
                    desc_val_sep.length, 'right') + desc_val_sep + line_str;

            body.push(line_str.slice(Math.max(line_str.length - this.report_max_chars, 0)))
        }

        sel = d3.select("#" + this.report_id);
        parent = d3.select(sel.node().parentNode);

        parent.selectAll(".text_section").data(body).text(function(d) { return d; });
    };

    this.update_linear_gradient = function(sel, grad_id, grad_heights_colors_opacities, style_apply) {
        // heights_colors is an array of elements containing an array of the gradient height and gradient stop color
        grad = d3.select("#" + grad_id);

        if (grad.empty()) {
            sel.style("fill-opacity",1);
            if (d3.select("svg defs").empty()) {
                svg.append("defs")
            }

            defs = d3.select("svg defs");
            defs.append("linearGradient").attr("id", grad_id)
                .attr("x1", "0%").attr("x2", "0%").attr("y1", "100%").attr("y2", "0%");

            style_apply == 'fill' ? sel.style("fill", "url(#" + grad_id + ")") :
                sel.style("stroke", "url(#" + grad_id + ")");

            grad = d3.select("#" + grad_id);
        }

        // Sort ascending and add % input value
        grad_heights_colors_opacities = grad_heights_colors_opacities.sort(function(a, b){return a[0]-b[0]});
        grad_heights_colors_opacities = grad_heights_colors_opacities.map(function(row) {
            return [Math.round(row[0]).toString() + "%", row[1], row[2]]
        });

        for (ii in grad_heights_colors_opacities) {
            stop_id_1 = "stop_" + ii.toString() + "_1";
            grad_stop_1 = grad.select("#" + stop_id_1);
            if (grad_stop_1.empty()) {
                grad.append("stop").attr("id", stop_id_1);
            }

            grad_stop_1.transition().attr("offset", grad_heights_colors_opacities[ii][0])
                .style("stop-color", grad_heights_colors_opacities[ii][1])
                .style("stop-opacity", grad_heights_colors_opacities[ii][2]);

            stop_id_2 = "stop_" + ii.toString() + "_2";
            grad_stop_2 = grad.select("#" + stop_id_2);
            if (ii < grad_heights_colors_opacities.length - 1) {
                if (grad_stop_2.empty()) {
                    grad.append("stop").attr("id", stop_id_2);
                }
                grad_stop_2.transition().attr("offset", grad_heights_colors_opacities[ii][0])
                    .style("stop-color", grad_heights_colors_opacities[parseInt(ii)+1][1])
                    .style("stop-opacity", grad_heights_colors_opacities[parseInt(ii)+1][2]);
            }
        }
    }
}

function Cell(cell_ids, cell_description, cell_conditions, cell_report_id) {
    cell = new Element(cell_ids, cell_description, cell_conditions, cell_report_id);

    cell.update = function(x) {
        for (selector in this.selectors) {
            sel = d3.select(this.selectors[selector]);
            grad_id = "grad_" + this.ids[selector];

            heights_colors_opacities = [];
            for (i in this.conditions) {
                condition = this.conditions[i];

                if (condition.type == 'background') {
                    heights_colors_opacities.push([100, condition.color_scale(condition.data[x]), condition.opacity]);
                } else if (condition.type == 'level_static') {
                    heights_colors_opacities.push([condition.data[x] / condition.max_height * 100, condition.color,
                        condition.opacity]);
                } else if (condition.type == 'level_dynamic') {
                    heights_colors_opacities.push([condition.data[x] / condition.max_height * 100,
                        condition.color_scale(condition.data_dynamic[x]), condition.opacity]);
                }
            }

            this.update_linear_gradient(sel, grad_id, heights_colors_opacities, "fill");
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
            grad_id = "grad_" + this.ids[selector];

            heights_colors_opacities = [];
            for (i in this.conditions) {
                condition = this.conditions[i];

                if (condition.type == 'sections_equal') {
                    for (j=1; j<=condition.num_sections; j++) {
                        condition.data[0].constructor == Array ? color_level = condition.data[x][j-1] :
                            color_level = condition.data[x];
                        heights_colors_opacities.push([j / condition.num_sections * 100,
                            condition.color_scale(color_level), condition.opacity]);
                    }
                }
            }

            this.update_linear_gradient(sel, grad_id, heights_colors_opacities, "stroke");
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

$(document).ready(function() {element_context = new ElementContext()});
