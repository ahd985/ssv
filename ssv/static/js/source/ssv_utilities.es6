var d3 = require("d3");

// Number formatting function for report output
function num_format(val) {
    if (val >= 1000 || val < 0.01) {
        return d3.format('.2e')(val)
    } else {
        return d3.format('.2f')(val)
    }
};

module.exports = {
    num_format: num_format,
};