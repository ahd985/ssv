var utilities = require("./ssv_utilities.js");
var d3 = require("d3");

class Controls {
    constructor(title, x_series, x_series_unit, update_callback, context) {
        this.uuid = uuid;
        this.title = title;
        this.x_series = x_series;
        this.x_series_unit = x_series_unit;
        this.update_callback = update_callback;
        this.context = context;
        this.sels = context.sels;

        // control state information
        this.play_enabled = false;
        this.pan_zoom_enabled = false;
        this.slider_moving = false;
        this.current_x = 0;
        this.target_x = 0;
        this.play_speed = 1;
        this.max_speed = 8;
        this.min_speed = 1;
        this.speed_mult = 2;
        this.bbox_zoom = null;

        // initialize controls
        this.initialize()
    }

    render_slider() {
        var bbox = this.sels.controls.modebar.node().getBoundingClientRect();
        var height = bbox.height;
        var margin = 2;
        var handle_r = 8;
        var width = bbox.width - this.sels.controls.modebar_group.node().getBoundingClientRect().width;

        var x = d3.scaleLinear()
            .domain([0, this.x_series.length - 1])
            .range([0, width - 2*(margin + handle_r)])
            .clamp(true);

        this.sels.controls.modebar_slider.selectAll("svg").remove();
        var slider = this.sels.controls.modebar_slider.append("svg")
            .attr("width", width)
            .append("g")
            .attr("transform",
                "translate(" + (handle_r + margin).toString() + "," + (height/2 + margin).toString() + ")");

        var self = this;
        slider.append("line")
            .attr("class", "slider-track")
            .attr("x1", x.range()[0])
            .attr("x2", x.range()[1])
            .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
                .attr("class", "slider-inset")
            .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
                .attr("class", "slider-overlay")
                .call(d3.drag()
                    .on("start.interrupt", function() {slider.interrupt()})
                    .on("start drag", function() {
                        self.target_x = Math.round(x.invert(d3.event.x));
                        self.move(250);
                    }));

        var handle = slider.append("circle")
            .attr("class", "slider-handle")
            .attr("r", handle_r);

        // Register a dispatch for updating the handle
        this.slider_dispatch = d3.dispatch("change");
        this.slider_dispatch.on("change", function() {
            handle.attr("cx", x(self.target_x));
        });
    };

    play() {
        if (this.play_enabled) {
                this.play_enabled = false;
                this.sels.controls.pause_icon.attr('style', 'display:none');
                this.sels.controls.play_icon.attr('style', '');
            } else {
                this.play_enabled = true;
                this.sels.controls.pause_icon.attr('style', '');
                this.sels.controls.play_icon.attr('style', 'display:none');
                if (this.current_x >= this.x_series.length - 1) {
                    this.current_x = 0;
                }
                this.x_series_forward()
        }
    }

    toggle_pan_zoom() {
        if (this.pan_zoom_enabled) {
            this.pan_zoom_enabled = false;
            this.sels.controls.pan_zoom_disabled_icon.attr('style', '');
            this.sels.controls.pan_zoom_enabled_icon.attr('style', 'display:none');
        } else {
            this.pan_zoom_enabled = true;
            this.sels.controls.pan_zoom_disabled_icon.attr('style', 'display:none');
            this.sels.controls.pan_zoom_enabled_icon.attr('style', '');
        }
    }

    move(trans_dur) {
        this.slider_dispatch.call("change");
        this.current_x = this.target_x;
        if (this.slider_moving) return;

        this.slider_moving = true;
        this.update_callback.call(this.context, this.current_x, trans_dur);
        this.set_x_series_display(this.current_x);

        var self = this;
        d3.timer(function() {
            self.slider_moving = false;
        }, 100);
    };

    // Function to auto update elements based on current x_series position and selected play speed
    x_series_forward() {
        var self = this;
        window.setTimeout(function() {
            if (self.play_enabled && self.current_x < self.x_series.length - 1) {
                self.target_x = self.current_x + 1;

                self.move(250);

                if (self.current_x < self.x_series.length - 1) {
                    self.x_series_forward()
                } else {
                    self.play();
                }
            }
        }, 1000 / this.play_speed);
    };

    set_x_series_display(x) {
        this.sels.title.x_val.html(utilities.num_format(this.x_series[x]));
    }

    // Initialize controls for ssv control bar
    initialize() {
        this.render_slider();
        this.update_viewbox();
        
        // Set title and x-series display
        this.sels.title.title.html(this.title);
        this.set_x_series_display(0);
        this.sels.title.x_val_unit.html(this.x_series_unit);
        
        // Set window resize function for svg viewbox
        var self = this;
        d3.select(window).on('resize', function() {self.render_slider(); self.update_viewbox();});

        // Clicking on play button automates the forward run of the x_series
        this.sels.controls.play_btn
            .attr('ssv-id', this.uuid)
            .on("click", function() {self.play()});

        // Clicking on zoom button toggles pan/zoom ability
        this.sels.controls.pan_zoom_btn
            .attr('ssv-id', this.uuid)
            .on("click", function() {self.toggle_pan_zoom()});

        // Clicking on the speed button changes the speed of play
        this.sels.controls.speed_btn.attr('ssv-id', this.uuid)
            .on("click", function() {
                if (self.play_speed == self.max_speed) {
                    self.play_speed = self.min_speed
                } else {
                    self.play_speed *= self.speed_mult
                }

                var speed = self.play_speed.toString();
                self.sels.controls.speed_btn.select('span')
                    .html("<b>" + speed + 'x</b>')
            });

        this.initialize_pan_zoom();
        
        // Clicking on save button saves the current slice as a picture
        this.sels.controls.save_btn
            .attr('ssv-id', this.uuid)
            .on("click", function() {self.to_image()});

        // Clicking on video button saves the visualization as a video
        this.sels.controls.vid_btn
            .attr('ssv-id', this.uuid)
            .on("click", function() {self.to_video()});
    };

    // Initializer of pan and zoom functionality
    initialize_pan_zoom() {
        var bbox_info = this.sels.containers.info_layer.node().getBBox();
        var offset = [bbox_info.x, bbox_info.y];

        var self = this;
        var zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on('zoom', function() {
                var scale = d3.event.transform.k;
                var tx=0;
                var ty=0;
                if (bbox_info.width*scale <= self.bbox_zoom.width) {
                    tx = Math.max(d3.event.transform.x, self.bbox_zoom.x - bbox_info.x - offset[0]*(scale-1));
                    tx = Math.min(tx,
                        self.bbox_zoom.width - (bbox_info.x - self.bbox_zoom.x + offset[0]*(scale-1)) - bbox_info.width*scale);
                } else {
                    tx = Math.max(d3.event.transform.x, self.bbox_zoom.x - bbox_info.x - (bbox_info.width*scale - self.bbox_zoom.width) - offset[0]*(scale-1));
                    tx = Math.min(tx, bbox_info.x - offset[0]*(scale-1) - self.bbox_zoom.x );
                }

                if (bbox_info.height*scale <=  self.bbox_zoom.height) {
                    ty = Math.max(d3.event.transform.y, self.bbox_zoom.y - bbox_info.y - offset[1]*(scale-1));
                    ty = Math.min(ty,
                        self.bbox_zoom.height - (bbox_info.y - self.bbox_zoom.y + offset[1]*(scale-1))  - bbox_info.height*scale);
                } else {
                    ty = Math.max(d3.event.transform.y, self.bbox_zoom.y - bbox_info.y - (bbox_info.height*scale - self.bbox_zoom.height) - offset[1]*(scale-1));
                    ty = Math.min(ty, bbox_info.y - offset[1]*(scale-1) - self.bbox_zoom.y);
                }

                d3.event.transform.x = tx;
                d3.event.transform.y = ty;

                self.sels.containers.info_layer.attr("transform",
                    'translate(' + [tx, ty] + ')scale(' + scale + ')');
            });
        this.sels.containers.svg.call(zoom);

        // Clicking on center button re-centers svg
        this.sels.controls.center_btn
            .attr('ssv-id', this.uuid)
            .on("click", function() {
                self.sels.containers.info_layer.attr("transform",
                        'translate(' + [bbox_info.x,bbox_info.y] + ')scale(1)');
                zoom.transform(self.sels.containers.svg, d3.zoomIdentity);
            });
    };

    update_viewbox() {
        var bbox = this.sels.containers.svg_container.node().getBoundingClientRect();
        var view_box = this.sels.containers.svg.attr('viewBox').split(' ').map(function(d) {return parseFloat(d)});
        var margin = 0.05 * view_box[3];
        var vb_h_ratio = view_box[3] / bbox.height;
        var vb_width_change = bbox.width * vb_h_ratio - view_box[2];
        view_box[2] = view_box[2] + vb_width_change;
        view_box[0] = view_box[0] - vb_width_change/2;
        this.sels.containers.svg.attr('viewBox', view_box.join(' '));
        this.sels.containers.zoom_layer.attr('x', view_box[0] + margin)
            .attr('width', view_box[2] - 2*margin)
            .attr('y', view_box[1] + margin)
            .attr('height', view_box[3] - 2*margin)
            .style('fill', 'none');
        this.bbox_zoom = this.sels.containers.zoom_layer.node().getBBox();
    }

    render_slice(mode, render_func) {
        var doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ' +
            '"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';

        // serialize svg xml
        var source = (new XMLSerializer()).serializeToString(this.sels.containers.svg.node());

        // create a file blob of the svg and get a url reference
        var blob = new Blob([ doctype + source], { type: 'image/svg+xml;charset=utf-8' });
        var url = window.URL.createObjectURL(blob);

        // Put the svg into an image tag so that the canvas element can read it in.
        var bbox = this.sels.containers.svg.node().getBoundingClientRect();
        var img = this.sels.containers.img
            .attr('width', bbox.width)
            .attr('height', bbox.height)
            .node();

        var scale = 4;
        // Generate canvas context
        var canvas = this.sels.containers.render.node();
        canvas.width = bbox.width * scale;
        canvas.height = bbox.height * scale;
        var ctx = canvas.getContext('2d');

        // Add in background - videos can't handle transparency
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, bbox.width * scale, bbox.height * scale);

        img.onload = function() {
            ctx.drawImage(img, 0, 0);

            if (mode == "image") {
                render_func(canvas.toDataURL());
            } else if (mode == "video") {
                render_func(canvas.toDataURL('image/webp'))
            }
        };
        img.src = url;
    }

    to_image() {
        var self = this;
        var render_func = function(canvas_url) {
            // Save the image
            var a = document.createElement("a");
            var x_series_current = utilities.num_format(self.x_series[self.current_x]) + "_" + self.x_series_unit;
            a.download = self.title.replace(" ", "_") + "_" + x_series_current + ".jpeg";
            a.href = canvas_url;
            a.click();
        };
        this.render_slice("image", render_func);
    }

    to_video() {
        // Track frames and slice index
        var self = this;
        self.frames = [];
        var i = 0;

        // Show progress bar
        self.sels.containers.progress.style("display", "table");
        self.sels.containers.progress.select(".progress-bar").html("Generating Video");

        // Set render function
        var render_func = function(canvas_url) {
            self.frames.push(canvas_url);
        };

        // Set loop function
        var rendering = false;
        function loop() {
            rendering = i > self.frames.length;
            if (rendering) {return}

            self.target_x = i;
            self.move(0);
            self.set_x_series_display(i);

            self.render_slice("video", render_func);
            rendering = true;
            i += 1;
        }

        var interval = setInterval(function(){
            if (i < self.x_series.length) {
                loop();

                // Update progress
                var progress = Math.ceil(i / self.x_series.length * 100).toString() + "%";
                self.sels.containers.progress.select(".progress-bar").style("width", progress)
            } else {
                var output = Whammy.fromImageArray(self.frames, 15);
                var url = window.URL.createObjectURL(output);

                var a = document.createElement("a");
                a.download = self.title.replace(" ", "_") + ".webm";
                a.href = url;
                a.click();
                clearInterval(interval);

                // Clear and hide progress bar
                self.sels.containers.progress.select(".progress-bar").style("width", 0);
                self.sels.containers.progress.style("display", "none");
            }
        }, 100);
    }
}

module.exports = function(...args) {
    return new Controls(...args)
};