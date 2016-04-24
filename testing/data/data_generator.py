from collections import defaultdict
import itertools

import numpy as np


def get_element_input(valid, element_type):
    base_element_args = [
        # id
        {
            'valid': ['ID'],
            'invalid': {}
        },
        # description
        {
            'valid': ['Description', ''],
            'invalid': {'TypeError': [True, 1]}
        },
        # x_series_len
        {
            'valid': [10],
            'invalid': {}
        },
    ]

    report_id_args = [{'valid': ['REPORT_ID'], 'invalid': {'TypeError': [True, 1]}}]
    data_args = [{'valid': [np.random.rand(10, 3)], 'invalid': {}}]
    headers_args = [{'valid': [['H1', '', 'H3']], 'invalid': {}}]
    color_scale_args = [{'valid': [['#DDDDDD','#DDDDDD']], 'invalid': {'ValueError': ['#ZZZ', 'RGB(1,1,1)']}}]
    color_level_args = [{'valid': [[100, 200]], 'invalid': {}}]
    opacity_args = [{'valid': [1, 1.0], 'invalid': {'TypeError': ['X']}}]

    element_args = {
        'cell': base_element_args + report_id_args,
        'line': base_element_args + report_id_args,
        'heatmap': base_element_args + report_id_args,
        'toggle': base_element_args + report_id_args,
        'report': base_element_args,
        'table': base_element_args + data_args + headers_args,
        'colorscale': base_element_args + color_scale_args + color_level_args + opacity_args
    }

    valid_args = [i['valid'] for i in element_args[element_type.lower()]]
    if valid:
        return list(itertools.product(*valid_args))
    else:
        valid_args = [[arg[0]] for arg in valid_args]
        invalid_args = defaultdict(list)
        for i in range(len(valid_args)):
            arg_combo = valid_args.copy()
            for k, v in element_args[element_type.lower()][i]['invalid'].items():
                arg_combo[i] = v
                invalid_args[k] += list(itertools.product(*arg_combo))

        return invalid_args


def get_condition_input(valid, condition_inputs):
    condition_kwargs = {
        'report': {'valid': [True, False], 'invalid': {'TypeError': [1, 'True']}},
        'section_label': {'valid': ['Section', ''], 'invalid': {'TypeError': [1, True]}},
        'description': {'valid': ['Description', ''], 'invalid': {'TypeError': [1, True]}},
        'description_dynamic': {'valid': ['Description', ''], 'invalid': {'TypeError': [1, True]}},
        'max_height': {'valid': [10], 'invalid': {}},
        'min_height': {'valid': [10], 'invalid': {}},
        'true_color': {'valid': ['#FFFFFF', '#FFF'], 'invalid': {'ValueError': ['#ZZZ', 'RGB(1,1,1)']}},
        'false_color': {'valid': ['#FFFFFF', '#FFF'], 'invalid': {'ValueError': ['#ZZZ', 'RGB(1,1,1)']}},
        'overlay': {'valid': ['water'], 'invalid': {'TypeError': [1, True]}},
        'unit_dynamic': {'valid': ['unit', ''], 'invalid': {'TypeError': [1, True]}},
        'color_levels': {'valid': [[100, 200]], 'invalid': {}},
        'color_scale': {'valid': [['#DDDDDD', '#DDDDDD']], 'invalid': {}},
        'data': {'valid': [[100] * 10], 'invalid': {}},
        'data_2d': {'valid': [[[100] * 10] * 10], 'invalid': {}},
        'data_3d': {'valid': [[[[100] * 10] * 10] * 10], 'invalid': {}},
        'data_dynamic': {'valid': [[100] * 10], 'invalid': {}},
        'data_dynamic_2d': {'valid': [[[100] * 10] * 10], 'invalid': {}},
        'headers': {'valid': [['xxx','xxx']], 'invalid': {}}
    }

    kwargs = {k: condition_kwargs[k]['valid'] for k in condition_inputs}

    condition_kwarg_combos = []
    kwarg_names = list(kwargs.keys())
    for k in kwarg_names:
        condition_kwarg_combos += [[(k, v) for v in kwargs[k]]]
    condition_kwarg_combos = list(itertools.product(*condition_kwarg_combos))
    condition_kwarg_combos = [dict(d) for d in condition_kwarg_combos]

    if valid:
        return condition_kwarg_combos
    else:
        # Tuple of valid base arguments
        valid_kwargs = [[(k, v)] for k, v in condition_kwarg_combos[0].items()]
        invalid_kwargs = defaultdict(list)

        # Loop through each kwarg and create error by type input
        for i, k in enumerate(kwarg_names):
            kwarg_combo = valid_kwargs.copy()
            for k_error, v in condition_kwargs[k]['invalid'].items():
                kwarg_combo[i] = [(k, p) for p in v]
                invalid_kwargs[k_error] += [dict(d) for d in list(itertools.product(*kwarg_combo))]

        return invalid_kwargs
