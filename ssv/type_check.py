import inspect

input_map = {
    "description": str,
    "unit": str,
    "opacity": [int, float],
    "report": bool,
    "overlay": str,
    "section_label": str
}

def type_check(f):
    def wrapper(*args):
        arg_types = [a for a in inspect.getargspec(f).args if a != "self"]
        for arg, arg_type in zip(args, arg_types):
            if arg in input_map and not isinstance(arg_type, input_map[arg]):
                raise TypeError("Input %s must be of type %s" % (arg, arg_type))