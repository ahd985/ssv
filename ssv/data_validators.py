import re

import numpy as np


# Helper function to validate lists and array inputs, including color inputs
def validate_array(arr, arr_name, arr_type, min_dim, max_dim=None, dim1_len=None):
    try:
        arr = np.array(arr).astype(arr_type)
    except TypeError:
        raise TypeError("Each element in %s must be allowed to be cast as type %s" % (arr_name, arr_type))

    if not min_dim is None and len(arr.shape) < min_dim or not max_dim is None and len(arr.shape) > max_dim:
        raise ValueError("%s should have between %d and %d dimensions" % (arr_name, min_dim, max_dim))

    if not dim1_len is None and arr.shape[0] != dim1_len:
        raise ValueError("%s should have size %d in dimension 1" % arr_name)

    return arr.tolist()


# Helper function to validate array slices where slice dimensions may not be equal length
# along first axis of array
def validate_array_slices(arr, arr_name, arr_type):
    arr_out = []

    try:
        for i in range(len(arr)):
            arr_out.append(np.array(arr[i]).astype(arr_type).tolist())
    except ValueError:
        raise ValueError("Each element in %s must be allowed to be cast as type %s" % (arr_name, arr_type))
    except TypeError:
        raise TypeError("Array %s must be iterable" % arr_name)

    return arr_out


# Helper function to validate colors in a given array
def validate_colors(arr, arr_name):
    arr = np.array(arr).astype('str')

    f = np.vectorize(lambda x: True if re.search('^#(?:[0-9a-fA-F]{3}){1,2}$', x) is None else False)
    if np.any(f(arr)):
        raise ValueError("%s should include only hex colors" % arr_name)

    return arr.tolist()


# Helper function to validate single color
def validate_color(color, var_name):
    color_arr = [color]
    validate_colors(color_arr, var_name)

    return color