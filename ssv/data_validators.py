import re

import numpy as np

try:
    import pandas as pd
except ImportError:
    pd = None


# Helper function to validate lists and array inputs, including color inputs
def validate_array(arr, arr_name, arr_type, min_dim, max_dim=None, dim1_len=None):
    # Check for pandas dataframe or series and if so convert to values
    if pd is not None and isinstance(arr, (pd.DataFrame, pd.Series)):
        arr = arr.values

    try:
        arr = np.array(arr).astype(arr_type)
    except ValueError:
        raise ValueError("Each element in %s must be allowed to be cast as type %s" % (arr_name, arr_type))

    if min_dim is not None and len([i for i in arr.shape if i > 0]) < min_dim or \
                            max_dim is not None and len([i for i in arr.shape if i > 0]) > max_dim:
        raise ValueError("%s should have between %d and %d dimensions" % (arr_name, min_dim, max_dim))

    if dim1_len is not None and arr.shape[0] != dim1_len:
        raise ValueError("%s should have size %d in dimension 0" % (arr_name, dim1_len))

    return arr.tolist()


# Helper function to validate array slices where slice dimensions may not be equal length
# along first axis of array
def validate_array_slices(arr, arr_name, arr_type):
    arr_out = []

    try:
        for i in range(len(arr)):
            arr_out.append(validate_array(arr[i], 'test_data', arr_type, None))
    except ValueError:
        raise ValueError("Each element in %s must be allowed to be cast as type %s" % (arr_name, arr_type))
    except TypeError:
        raise TypeError("Array %s must be iterable" % arr_name)

    return arr_out


# Helper function to validate colors in a given array
def validate_colors(arr, arr_name):
    # Check for pandas dataframe or series and if so convert to values
    if pd is not None and isinstance(arr, (pd.DataFrame, pd.Series)):
        arr = arr.values
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
