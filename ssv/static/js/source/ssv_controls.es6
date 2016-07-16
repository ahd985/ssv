class Controls {
    constructor(uuid, x_series_length, update_callback, context) {
        this.uuid = uuid;
        this.x_series_length = x_series_length;
        this.update_callback = update_callback;
        this.context = context;

        // control state information
        this.play_enabled = false;
        this.pan_zoom_enabled = true;
        this.slider_moving = false;
        this.current_x = 0;
        this.target_x = 0;
        this.play_speed = 1;
        this.max_speed = 8;
        this.min_speed = 1;
        this.speed_mult = 2;

        // control selectors
        this.zoom_layer_sel = d3.select(`#${this.uuid} #zoom-layer`);
        this.info_layer_sel = d3.select(`#${this.uuid} #info-layer`);
        this.speed_btn_sel = d3.select(`#${this.uuid} #speed-button`);
        this.play_btn_sel = d3.select(`#${this.uuid} #play-button`);
        this.pan_zoom_btn_sel = d3.select(`#${this.uuid} #pan-zoom-button`);
        this.modebar_sel = d3.select(`#${this.uuid} .modebar`);
        this.modebar_group_sel = d3.select(`#${this.uuid} .modebar-group`);
        this.modebar_slider_sel = d3.select(`#${this.uuid} .modebar-slider`);
        this.pause_icon_sel = d3.select(`#${this.uuid} #pause-icon`);
        this.play_icon_sel = d3.select(`#${this.uuid} #play-icon`);
        this.pan_zoom_enabled_icon_sel = d3.select(`#${this.uuid} #pan-zoom-enabled-icon`);
        this.pan_zoom_disabled_icon_sel = d3.select(`#${this.uuid} #pan-zoom-disabled-icon`);

        // initialize controls
        this.initialize()
    }

    render_slider() {
        var bbox = this.modebar_sel.node().getBoundingClientRect();
        var height = bbox.height;
        var margin = 2;
        var handle_r = 8;
        var width = bbox.width - this.modebar_group_sel.node().getBoundingClientRect().width;

        var x = d3.scaleLinear()
            .domain([0, this.x_series_length - 1])
            .range([0, width - 2*(margin + handle_r)])
            .clamp(true);

        this.modebar_slider_sel.selectAll("svg").remove();
        var slider = this.modebar_slider_sel.append("svg")
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
                        self.move();
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
                this.pause_icon_sel.attr('style', 'display:none');
                this.play_icon_sel.attr('style', '');
            } else {
                this.play_enabled = true;
                this.pause_icon_sel.attr('style', '');
                this.play_icon_sel.attr('style', 'display:none');
                if (this.current_x >= this.x_series_length - 1) {
                    this.current_x = 0;
                }
                this.x_series_forward()
        }
    }

    toggle_pan_zoom() {
        if (this.pan_zoom_enabled) {
            this.pan_zoom_enabled = false;
            this.pan_zoom_disabled_icon_sel.attr('style', '');
            this.pan_zoom_enabled_icon_sel.attr('style', 'display:none');
        } else {
            this.pan_zoom_enabled = true;
            this.pan_zoom_disabled_icon_sel.attr('style', 'display:none');
            this.pan_zoom_enabled_icon_sel.attr('style', '');
        }
    }

    move() {
        this.slider_dispatch.call("change");
        if (this.slider_moving) return;

        this.slider_moving = true;
        this.current_x = this.target_x;
        this.update_callback.call(this.context, this.current_x);

        var self = this;
        d3.timer(function() {
            self.slider_moving = false;
        }, 100);
    };

    // Function to auto update elements based on current x_series position and selected play speed
    x_series_forward() {
        var self = this;
        window.setTimeout(function() {
            if (self.play_enabled && self.current_x < self.x_series_length - 1) {
                self.target_x = self.current_x + 1;

                self.move();

                if (self.current_x < self.x_series_length - 1) {
                    self.x_series_forward()
                } else {
                    self.play();
                }
            }
        }, 1000 / this.play_speed);
    };

    // Initialize controls for ssv control bar
    initialize() {
        this.render_slider();
        var self = this;
        d3.select(window).on('resize', function() {self.render_slider()});

        // Clicking on play button automates the forward run of the x_series
        this.play_btn_sel
            .attr('ssv-id', this.uuid)
            .on("click", function() {self.play()});

        // Clicking on zoom button toggles pan/zoom ability
        this.pan_zoom_btn_sel
            .attr('ssv-id', this.uuid)
            .on("click", function() {self.toggle_pan_zoom()});

        // Clicking on the speed button changes the speed of play
        this.speed_btn_sel.attr('ssv-id', this.uuid)
            .on("click", function() {
                if (self.play_speed == self.max_speed) {
                    self.play_speed = self.min_speed
                } else {
                    self.play_speed *= self.speed_mult
                }

                var speed = self.play_speed.toString();
                self.speed_btn_sel.select('span')
                    .html("<b>" + speed + 'x</b>')
            });

        this.initialize_pan_zoom();
    };

    // Initializer of pan and zoom functionality
    initialize_pan_zoom() {
        this.info_layer_sel.attr('y', '0%')
            .attr('height', '100%')
            .attr('x', '0%')
            .attr('width', '100%');

        // Get dimensions
        var bbox = this.info_layer_sel.node().getBBox();
        var x1 = bbox.x;
        var x2 = x1 + bbox.width;
        var y1 = bbox.y;
        var y2 = y1 + bbox.height;

        var max_width = (x2 - x1);
        var max_height = (y2 - y1);

        var self = this;
        var zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on('zoom', function() {
                if (self.pan_zoom_enabled) {
                    var scale = d3.event.transform.k;
                    var tx = Math.max(d3.event.transform.x, -(x2 * scale - max_width));
                    var tx = Math.min(tx, x1);
                    var ty = Math.max(d3.event.transform.y, -(y2 * scale - max_height));
                    var ty = Math.min(ty, y1);
                    self.zoom_layer_sel.attr("transform",
                        'translate(' + [tx,ty] + ')scale(' + scale + ')');
                }
            });
        this.info_layer_sel.call(zoom)
    };
}

module.exports = function(...args) {
    return new Controls(...args)
};