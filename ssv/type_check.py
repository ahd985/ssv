import inspect
from functools import wraps

from .data_validators import validate_color_scale, validate_heights, \
    validate_color, validate_array_slices, validate_array, validate_color_levels

input_map = {
    "id": str,
    "x_len": int,
    "description": str,
    "unit": str,
    "min_height": (int, float),
    "max_height": (int, float),
    "opacity": (int, float),
    "report": bool,
    "overlay": str,
    "section_label": str,
    "element_description": str,
    "element_report_id": str,
    "color_data_unit": str,
    "color_data_description": str,
    "unit_description_prepend": str,
    "color": validate_color,
    "true_color": validate_color,
    "false_color": validate_color,
    "color_levels": validate_color_levels,
    "color_scale&color_levels": validate_color_scale,
    "min_height&max_height": validate_heights,
    "tabular_data.str&x_len": validate_array_slices,
    "headers.str.1.1": validate_array,
    "data.float.1.2&x_len": validate_array,
    "data.float.1.1&x_len": validate_array,
    "color_data.float.1.1&x_len": validate_array,
    "level_data.float.1.1&x_len": validate_array,
    "data.float.2.2&x_len": validate_array,
    "color_data.float.3.3&x_len": validate_array,
    "color_data.float.2.2&x_len": validate_array,
    "level_data.float.2.2&x_len": validate_array,
    "data.float.3.3&x_len": validate_array,
}

def type_check(*type_args):
    def type_check_decorator(f):
        # Bind any arg types to function
        f.type_args = type_args

        @wraps(f)
        def wrapper(*args, **kwargs):
            argspec = inspect.getargspec(f)

            # First, populate args with default values
            arg_kvs = ({a: v for a, v in zip(argspec.args[-len(argspec.defaults):], argspec.defaults)} if
                       argspec.defaults else {})

            # Update with user provided args
            arg_names = [a for a in argspec.args[1:]]
            arg_vals = [a for a in args[1:]]
            arg_kvs.update({name: val for name, val in zip(arg_names, arg_vals)})

            # Update with kwargs
            arg_kvs.update(kwargs)

            arg_keys = set(arg_kvs.keys())

            # Process normal inputs
            for arg in arg_keys:
                if arg in input_map:
                    if not inspect.isfunction(input_map[arg]):
                        if arg in arg_kvs and not isinstance(arg_kvs[arg], input_map[arg]):
                            raise TypeError("Input %s must be of type %s" % (arg, input_map[arg]))
                    else:
                        arg_kvs[arg] = input_map[arg](arg_kvs[arg])

            # Process input requiring additional validation
            for type_arg in type_args:
                args_unwrapped = [a.split(".") for a in type_arg.split("&")]
                args_unwrapped_names = [a[0] for a in args_unwrapped]
                args_unwrapped_sub = {a[0]: a[1:] for a in args_unwrapped if len(a) > 1}

                if set(args_unwrapped_names).issubset(arg_keys):
                    input_args = [[arg_kvs[i]] + args_unwrapped_sub[i] if i in args_unwrapped_sub else [arg_kvs[i]]
                                  for i in args_unwrapped_names]
                    input_args = [e for i in input_args for e in i]
                    arg_kvs[args_unwrapped_names[0]] = input_map[type_arg](*input_args)

            args = [args[0]] + [arg_kvs[arg] if arg in arg_kvs else None for arg in arg_names]
            kwargs = {k: v for k, v in arg_kvs.items() if (k in kwargs and not k in arg_names)}

            return f(*args, **kwargs)
        return wrapper
        wrapper.type_args = type_args
    return type_check_decorator
