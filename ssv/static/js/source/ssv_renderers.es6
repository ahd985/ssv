var num_format = require("./ssv_utilities.es6");

function render_report(node, font_scale, data, description) {
    if (node) {
        var parent = d3.select(node.parentNode);

        // Get bounding box of placement element
        // Placement element height is not used - height of legend is ultimately determined by user specified
        // font size
        var bbox = node.getBBox();
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
        d3.select(node).style('visibility', 'hidden');

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
        title_text.text(description);

        // Create value output box outlines (backgrounds) and add text boxes
        // This code adds the condition description, value, and unit (if applicable) in a row by row fashion
        for (var i = 0; i < data.length; i++) {
            var condition = data[i];

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
    
    var update_func = function(x) {
        parent.selectAll('.value-text')
            .text(function(d) {return d[x]});
    };

    // Report is initialized - return the update function
    return update_func
};

// Function to initialize patterns for element
function render_pattern(node, pattern_id, prop_data, style_apply) {
    // Add defs section if none exist
    var parent = d3.select(node.parentNode);
    if (parent.select('defs').empty()) {
        parent.append('defs')
    }

    // Sort prop data and denormalize order prop
    var norm_val = node.getBBox().height;
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
    var defs = parent.select('defs');
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

    var sel = d3.select(node);
    // Set to stroke or fill based on style_apply
    style_apply == 'fill' ? sel.style('fill', 'url(#' + pattern_id + ')') :
        sel.style('stroke', 'url(#' + pattern_id + ')');

    // Set initial opacities to 1
    sel.style('fill-opacity', 1);
    sel.style('opacity', 1);

    var update_func = function(x) {
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
    };

    return update_func
};

function render_rect_heatmap(node, data, color_scale, opacity) {
    if (node) {
        var parent = d3.select(node.parentNode);
        var bbox = node.getBBox();

        // Assume heatmap occupies entire placement element bounding box
        var x = d3.scaleLinear().domain([0, data[0][0].length]).range([0, bbox.width]);
        var y = d3.scaleLinear().domain([0, data[0].length]).range([0, bbox.height]);
        var g = parent.append('g')
            .attr('transform', 'translate(' + bbox.x + ',' + bbox.y + ')')
            .append('g');

        // go through data and apply color scale
        var color_scale_data = data.map(function(arr_2d) {
            return arr_2d.map(function(arr) {
                return arr.map(function(d) {
                    return color_scale(d)
                });
            });
        });
        g.data([color_scale_data]);

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
            .style('fill-opacity', function () {return opacity})
            .attr('height', bbox.height / (data[0].length));

        x_section.each(function (d, i) {d3.select(this).selectAll(".bin").attr("y", y(i))});

        var update_heatmap = function(x) {
            var g = parent.select('g').select('g');

            var x_section = g.selectAll('.x_section').data(function(d) {return d[x]});
            x_section.selectAll('.bin')
                .data(function (d) {return d})
                .transition()
                .style('fill', function(d) {return d});
        };

        return update_heatmap
    }
};

function render_table(node, table_id, data, headers, font_scale) {
    if (node) {
        var parent = d3.select(node.parentNode);

        // Get bounding box of placement element
        // Placement element height is not used - height of legend is ultimately determined by user specified
        // font size
        var bbox = node.getBBox();
        var width = bbox.width;
        var x = bbox.x;
        var y = bbox.y;

        // Hide placement element
        d3.select(node).style('visibility', 'hidden');

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
            .datum(data);

        // Add table header
        table.append('thead').append('tr')
            .selectAll()
            .data(headers)
            .enter()
            .append('th')
            .text(function (d) {
                return d
            })
            .style('font-size', font_scale.toString() + 'em');

        // Add tbody
        table.append('tbody');

        var update_func = function (x) {
            // Add content
            var row = table.selectAll('.content-row')
                .data(function (d) {
                    return d[x]
                });
            row.exit().remove();
            row.enter()
                .append('tr')
                .merge(row)
                .attr('class', 'content-row');

            var cell = table.selectAll('.content-row').selectAll('.content-cell')
                .data(function (d) {
                    return d
                });
            cell.exit().remove();
            cell.enter()
                .append('td')
                .merge(cell)
                .text(function (d) {
                    return d
                })
                .style('font-size', font_scale.toString() + 'em')
                .attr('class', 'content-cell');
        };
        
        return update_func
    }
};

function render_color_scale(node, color_scale, description, opacity, font_scale) {
    if (node) {
        var parent = d3.select(node.parentNode);

        // Hide original placement element
        d3.select(node).style('visibility', 'hidden');

        // Get bounding box of placement element
        // Placement element height is not used - height of legend is ultimately determined by user specified
        // font size
        var bbox = node.getBBox();
        var width = bbox.width;
        var pos_x = bbox.x;
        var pos_y = bbox.y;

        // Append legend outline to parent of placement element
        // Set legend font size to font scale property
        var self = this;
        var parent = d3.select(node.parentNode);
        var legend = parent.append('g').attr('transform', 'translate(' + pos_x + ',' + pos_y + ')')
            .append('g')
            .attr('font-size', font_scale + 'em')
            .attr('stroke', 'black')
            .attr('stroke-width','0.01em');

        // Calculate discrete color bin scale
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
            .text(description)
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
            .style('fill-opacity', opacity)
            .attr('font-size', header_em.toString() + 'em');

        // -- Append value text immediately below the left-most area of every color rect
        keys.enter().append('text')
            .text(function(d) {return color_scale.invertExtent(d)[0].toFixed(0)})
            .attr('x', function(d,i) {return x(i)})
            .attr('y', legend_text_height*(2 + margin + label_em / header_em * (1 + margin)))
            .attr('text-anchor', 'middle')
            .attr('font-size', label_em.toString() + 'em');
    }
}

module.exports = {
    render_report: render_report,
    render_pattern: render_pattern,
    render_color_scale: render_color_scale,
    render_table: render_table,
    render_rect_heatmap: render_rect_heatmap
};