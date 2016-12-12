import inspect

from .data_validators import validate_color_scale, validate_heights, \
    validate_color, validate_array_slices, validate_array, validate_color_levels

input_map = {
    "id": str,
    "x_len": int,
    "description": str,
    "unit": str,
    "opacity": (int, float),
    "report": bool,
    "overlay": str,
    "section_label": str,
    "element_description": str,
    "element_report_id": str,
    "unit_dynamic": str,
    "description_dynamic": str,
    "true_color": validate_color,
    "false_color": validate_color,
    "color_levels": validate_color_levels,
    "color_scale&color_levels": validate_color_scale,
    "min_height&max_height": validate_heights,
    "tabular_data.str&x_len": validate_array_slices,
    "headers.str.1.1": validate_array,
    "data.float.1.2&x_len": validate_array,
    "data.float.1.1&x_len": validate_array,
    "data.float.2.2&x_len": validate_array,
    "data_dynamic.float.2.2&x_len": validate_array,
    "data.float.3.3&x_len": validate_array,
}


def type_check(*type_args):
    def type_check_decorator(f):
        def wrapper(*args, **kwargs):
            arg_names = [a for a in inspect.getargspec(f).args[1:]]
            arg_vals = [a for a in args[1:]]
            arg_kvs = {name: val for name, val in zip(arg_names, arg_vals)}
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
    return type_check_decorator
