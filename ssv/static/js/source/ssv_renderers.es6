var num_format = require("./ssv_utilities.es6");

function get_report_update_func(outline_sel, font_scale, data, description) {
    var parent = d3.select(outline_sel.node().parentNode);

    if (!outline_sel.empty()) {
        // Get bounding box of placement element
        // Placement element height is not used - height of legend is ultimately determined by user specified
        // font size
        var bbox = outline_sel.node().getBBox();
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
        outline_sel.style('visibility', 'hidden');

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
function get_pattern_update_func(node, pattern_id, prop_data, style_apply) {
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

module.exports = {
    get_report_update_func: get_report_update_func,
    get_pattern_update_func: get_pattern_update_func
};