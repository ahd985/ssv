import re

import numpy as np

try:
    import pandas as pd
except ImportError:
    pd = None


# Helper function to validate lists and array inputs, including color inputs
def validate_array(arr, arr_type, min_dim, max_dim=None, dim1_len=None):
    # Check for pandas dataframe or series and if so convert to values
    if pd is not None and isinstance(arr, (pd.DataFrame, pd.Series)):
        arr = arr.values

    try:
        arr = np.array(arr).astype(arr_type)
    except ValueError:
        raise ValueError("Each element in input array must be allowed to be cast as type %s" % arr_type)

    # Cast min_dim, max_dim, and dim1_len to int
    try:
        if min_dim:
            min_dim = int(min_dim)
        if max_dim:
            max_dim = int(max_dim)
        if dim1_len:
            dim1_len = int(dim1_len)
    except ValueError:
        raise ValueError("Dimensions must be castable as ints")

    if min_dim is not None and len([i for i in arr.shape if i > 0]) < min_dim or \
                            max_dim is not None and len([i for i in arr.shape if i > 0]) > max_dim:
        raise ValueError("Input array(s) should have between %d and %d dimensions" % (min_dim, max_dim))

    if dim1_len is not None and arr.shape[0] != dim1_len:
        raise ValueError("Input array(s) should have size %d in dimension 0" % dim1_len)

    return arr.tolist()


# Helper function to validate array slices where slice dimensions may not be equal length
# along first axis of array
def validate_array_slices(arr, arr_type, dim1_len=None):
    arr_out = []

    try:
        for i in range(len(arr)):
            arr_out.append(validate_array(arr[i], arr_type, None))
    except TypeError:
        raise TypeError("Input array must be iterable")

    if dim1_len is not None and len(arr) != dim1_len:
        raise ValueError("Input array should have size %d in dimension 0" % dim1_len)

    return arr_out


# Helper function to validate colors in a given array
def validate_colors(arr):
    # Check for pandas dataframe or series and if so convert to values
    if pd is not None and isinstance(arr, (pd.DataFrame, pd.Series)):
        arr = arr.values
    arr = np.array(arr).astype('str')

    f = np.vectorize(lambda x: True if re.search('^#(?:[0-9a-fA-F]{3}){1,2}$', x) is None else False)
    if np.any(f(arr)):
        raise ValueError("Input array should include only hex colors")

    return arr.tolist()


# Helper function to validate a color scale
def validate_color_scale(color_scale, color_levels):
    color_scale = validate_colors(validate_array(color_scale, 'str', 1, 1))
    if len(color_scale) != len(color_levels):
        raise ValueError("Length of color scale must match length of color levels")

    return color_scale


# Helper function to validate a color scale
def validate_color_levels(color_levels):
    color_levels = validate_array(color_levels, 'float', 1, 1)

    return color_levels


# Helper function to validate single color
def validate_color(color):
    color_arr = [color]
    validate_colors(color_arr)

    return color


# Helper function to validate "height" of element data
def validate_heights(min_height, max_height):
    if not isinstance(min_height, (int, float)) or not isinstance(max_height, (int, float)):
        raise TypeError('Input heights must be ints or floats')
    elif max_height <= min_height:
        raise ValueError('min_height must be less than max_height')

    return min_height